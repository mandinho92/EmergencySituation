"use server";

import { z } from "zod";
import { check, familyAction } from "@/lib/actions";
import { ALL_CATEGORIES } from "@/i18n/messages";
import { createClient } from "@/lib/supabase/server";
import { optionalNumber, optionalText, requiredNumber, requiredText, uuid } from "@/lib/zod-helpers";

const schema = z.object({
  name: requiredText(120),
  category: z.enum(ALL_CATEGORIES as [string, ...string[]]),
  quantity: requiredNumber(0.01, 100000),
  unit: z.preprocess((v) => (v === "" || v == null ? "un" : v), z.string().min(1).max(16)),
  estimated_unit_price_eur: optionalNumber(0, 100000),
  store: optionalText(60),
  url: z.preprocess((v) => (v === "" ? null : v), z.string().url("Link inválido").regex(/^https?:\/\//).nullable()),
  priority: z.coerce.number().int().min(0).max(3),
  notes: optionalText(500),
});

export const addShoppingItem = familyAction("member", schema, async ({ estimated_unit_price_eur, ...input }, ctx) => {
  const supabase = await createClient();
  check(await supabase.from("shopping_list_items").insert({
    ...input,
    estimated_unit_price_cents: estimated_unit_price_eur == null ? null : Math.round(estimated_unit_price_eur * 100),
    family_id: ctx.family.id,
    created_by: ctx.user.id,
  }));
  return { ok: true, message: "Artigo adicionado à lista." };
});

export const setShoppingItemStatus = familyAction("member", z.object({ id: uuid, purchased: z.boolean() }), async ({ id, purchased }, ctx) => {
  const supabase = await createClient();
  check(await supabase.from("shopping_list_items").update(purchased ? { status: "purchased", purchased_by: ctx.user.id, purchased_at: new Date().toISOString() } : { status: "pending", purchased_by: null, purchased_at: null }).eq("id", id).eq("family_id", ctx.family.id));
  return { ok: true, message: purchased ? "Marcado como comprado." : "Reaberto." };
});

export const deleteShoppingItem = familyAction("member", z.object({ id: uuid }), async ({ id }, ctx) => {
  const supabase = await createClient();
  check(await supabase.from("shopping_list_items").delete().eq("id", id).eq("family_id", ctx.family.id));
  return { ok: true, message: "Removido da lista." };
});
