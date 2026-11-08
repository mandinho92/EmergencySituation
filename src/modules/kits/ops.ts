import "server-only";
import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";
import { describeDbError } from "@/lib/actions";
import { hasRole, type FamilyContext } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { loadPreparedness } from "@/modules/preparedness/load";

/**
 * Operational item-state changes (bought / already owned / packed / quantity).
 * Applied through the user's session, so RLS and the member column guard apply.
 * The same operations are produced online and replayed from the offline outbox:
 * they are idempotent "set" operations (last write wins).
 */
export const kitOpSchema = z.object({
  opId: z.string().min(8).max(64),
  kind: z.enum(["home", "bag"]),
  familyId: z.string().uuid(),
  bagId: z.string().uuid().optional(),
  key: z.string().regex(/^[a-z0-9_.-]{2,60}$/).optional(),
  rowId: z.string().uuid().optional(),
  patch: z
    .object({
      quantityHave: z.number().min(0).max(100000).optional(),
      acquiredVia: z.enum(["purchased", "owned"]).nullable().optional(),
      isPacked: z.boolean().optional(),
      expiresOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      storageLocation: z.string().max(120).nullable().optional(),
    })
    .strict(),
}).refine((o) => o.key || o.rowId, "key or rowId required").refine((o) => o.kind === "home" || o.bagId, "bagId required for bag items");

export type KitOp = z.infer<typeof kitOpSchema>;
export type KitOpResult = { opId: string; ok: true } | { opId: string; ok: false; error: string };

type HomeUpdate = Database["public"]["Tables"]["home_kit_items"]["Update"];
type BagUpdate = Database["public"]["Tables"]["evacuation_bag_items"]["Update"];

function commonColumns(op: KitOp, userId: string) {
  const p = op.patch;
  const cols: HomeUpdate & BagUpdate = { updated_by: userId };
  if (p.quantityHave !== undefined) cols.quantity_have = p.quantityHave;
  if (p.acquiredVia !== undefined) {
    cols.acquired_via = p.acquiredVia;
    cols.purchased_by = p.acquiredVia ? userId : null;
    cols.purchased_at = p.acquiredVia ? new Date().toISOString() : null;
  }
  if (p.expiresOn !== undefined) cols.expires_on = p.expiresOn;
  return cols;
}

function homeColumns(op: KitOp, userId: string): HomeUpdate {
  const cols: HomeUpdate = commonColumns(op, userId);
  if (op.patch.storageLocation !== undefined) cols.storage_location = op.patch.storageLocation;
  return cols;
}

function bagColumns(op: KitOp, userId: string): BagUpdate {
  const cols: BagUpdate = commonColumns(op, userId);
  if (op.patch.isPacked !== undefined) {
    cols.is_packed = op.patch.isPacked;
    cols.packed_at = op.patch.isPacked ? new Date().toISOString() : null;
  }
  return cols;
}

const fail = (opId: string, error: string): KitOpResult => ({ opId, ok: false, error });
const done = (opId: string, error: { code?: string; message?: string } | null): KitOpResult =>
  error ? fail(opId, describeDbError(error)) : { opId, ok: true };

export async function applyKitOp(op: KitOp, ctx: FamilyContext): Promise<KitOpResult> {
  const membership = ctx.families.find((f) => f.id === op.familyId);
  if (!membership) return fail(op.opId, "Família inválida.");
  if (!hasRole(membership.role, "member")) return fail(op.opId, "Não tem permissão para esta ação.");

  const supabase = await createClient();
  const uid = ctx.user.id;

  if (op.rowId) {
    const res =
      op.kind === "home"
        ? await supabase.from("home_kit_items").update(homeColumns(op, uid), { count: "exact" }).eq("id", op.rowId).eq("family_id", op.familyId)
        : await supabase.from("evacuation_bag_items").update(bagColumns(op, uid), { count: "exact" }).eq("id", op.rowId).eq("family_id", op.familyId);
    if (res.error) return done(op.opId, res.error);
    return res.count === 1 ? { opId: op.opId, ok: true } : fail(op.opId, "Artigo não encontrado.");
  }

  // Generated item: materialise the row from the authoritative engine output.
  const data = await loadPreparedness(op.familyId);
  const lines = op.kind === "home" ? data.homeLines : data.bags.find((b) => b.bag.id === op.bagId)?.lines;
  const line = lines?.find((l) => l.key === op.key);
  if (!line || !line.key) return fail(op.opId, "Este artigo já não faz parte do plano.");

  if (op.kind === "home") {
    const cols = homeColumns(op, uid);
    if (line.rowId) return done(op.opId, (await supabase.from("home_kit_items").update(cols).eq("id", line.rowId)).error);
    const ins = await supabase.from("home_kit_items").insert({ family_id: op.familyId, item_key: line.key, name: line.name, category: line.category, unit: line.unit, priority: line.priority, ...cols });
    if (ins.error?.code === "23505") {
      // Concurrent materialisation by another family member: update instead.
      return done(op.opId, (await supabase.from("home_kit_items").update(cols).eq("family_id", op.familyId).eq("item_key", line.key)).error);
    }
    return done(op.opId, ins.error);
  }

  const cols = bagColumns(op, uid);
  if (line.rowId) return done(op.opId, (await supabase.from("evacuation_bag_items").update(cols).eq("id", line.rowId)).error);
  const ins = await supabase.from("evacuation_bag_items").insert({
    family_id: op.familyId, bag_id: op.bagId!, item_key: line.key, name: line.name, category: line.category, unit: line.unit,
    priority: line.priority, unit_weight_g: line.unitWeightGrams, ...cols,
  });
  if (ins.error?.code === "23505") {
    return done(op.opId, (await supabase.from("evacuation_bag_items").update(cols).eq("bag_id", op.bagId!).eq("item_key", line.key)).error);
  }
  return done(op.opId, ins.error);
}
