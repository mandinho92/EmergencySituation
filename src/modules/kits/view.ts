import "server-only";
import type { KitLine } from "@/domain/preparedness/kit-lines";
import { createClient } from "@/lib/supabase/server";
import type { KitLineView } from "./kit-item-row";
import { loadPriceIndex, priceForLine } from "@/modules/products/pricing";

/** Names of family accounts (for "bought by"). */
export async function loadAccountNames(familyId: string): Promise<Map<string, string>> {
  const supabase = await createClient();
  const { data } = await supabase.from("family_members").select("user_id, profiles!family_members_user_id_fkey(full_name)").eq("family_id", familyId);
  return new Map((data ?? []).map((m) => [m.user_id, m.profiles?.full_name.split(/\s+/)[0] ?? "—"]));
}

export async function toViews(lines: KitLine[], familyId: string): Promise<KitLineView[]> {
  const [prices, names] = await Promise.all([loadPriceIndex(), loadAccountNames(familyId)]);
  return lines.map((l) => {
    const price = priceForLine(l, prices);
    return {
      id: l.id,
      key: l.key,
      rowId: l.rowId,
      name: l.name,
      unit: l.unit,
      required: l.required,
      have: l.have,
      missing: l.missing,
      priority: l.priority,
      excluded: l.excluded,
      isCustom: l.isCustom,
      purchasable: l.purchasable,
      rationale: l.rationale,
      acquiredVia: l.acquiredVia,
      purchasedByName: l.purchasedBy ? names.get(l.purchasedBy) ?? null : null,
      purchasedAt: l.purchasedAt,
      expiresOn: l.expiresOn,
      storageLocation: l.storageLocation,
      isPacked: l.isPacked,
      unitWeightGrams: l.unitWeightGrams,
      estimatedCostCents: price ? Math.round(price.unitCents * l.missing) : null,
    };
  });
}
