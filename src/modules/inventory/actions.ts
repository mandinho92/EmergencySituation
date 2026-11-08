"use server";

import { z } from "zod";
import { check, familyAction } from "@/lib/actions";
import { ALL_CATEGORIES } from "@/i18n/messages";
import { createClient } from "@/lib/supabase/server";
import { optionalDate, optionalNumber, optionalText, optionalUuid, requiredNumber, requiredText, uuid } from "@/lib/zod-helpers";

const itemSchema = z.object({
  id: optionalUuid,
  name: requiredText(120),
  category: z.enum(ALL_CATEGORIES as [string, ...string[]]),
  quantity: requiredNumber(0, 100000),
  unit: z.preprocess((v) => (v === "" || v == null ? "un" : v), z.string().min(1).max(16)),
  storage_location: optionalText(120),
  acquired_on: optionalDate,
  expires_on: optionalDate,
  condition: z.enum(["ok", "needs_recharge", "needs_maintenance", "damaged"]),
  maintenance_interval_days: optionalNumber(7, 1825),
  last_maintained_on: optionalDate,
  notes: optionalText(500),
});

export const saveInventoryItem = familyAction("member", itemSchema, async ({ id, maintenance_interval_days, ...input }, ctx) => {
  const supabase = await createClient();
  const row = { ...input, maintenance_interval_days: maintenance_interval_days == null ? null : Math.round(maintenance_interval_days), updated_by: ctx.user.id };
  if (id) check(await supabase.from("inventory_items").update(row).eq("id", id).eq("family_id", ctx.family.id));
  else check(await supabase.from("inventory_items").insert({ ...row, family_id: ctx.family.id }));
  return { ok: true, message: id ? "Artigo atualizado." : "Artigo adicionado ao inventário." };
});

export const markMaintained = familyAction("member", z.object({ id: uuid }), async ({ id }, ctx) => {
  const supabase = await createClient();
  check(await supabase.from("inventory_items").update({ condition: "ok", last_maintained_on: new Date().toISOString().slice(0, 10), updated_by: ctx.user.id }).eq("id", id).eq("family_id", ctx.family.id));
  return { ok: true, message: "Manutenção registada." };
});

export const deleteInventoryItem = familyAction("member", z.object({ id: uuid }), async ({ id }, ctx) => {
  const supabase = await createClient();
  check(await supabase.from("inventory_items").delete().eq("id", id).eq("family_id", ctx.family.id));
  return { ok: true, message: "Artigo removido." };
});
