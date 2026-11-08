"use server";

import { z } from "zod";
import { ActionError, check, familyAction } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";
import { checkbox, optionalDate, optionalNumber, optionalText, optionalUuid, requiredNumber, requiredText, uuid } from "@/lib/zod-helpers";
import { HOME_KIT_CATEGORIES } from "@/i18n/messages";
import { loadPreparedness } from "@/modules/preparedness/load";

const settingsSchema = z.object({
  target_days: requiredNumber(1, 60).pipe(z.number().int("Número inteiro de dias")),
  water_adult_l_per_day: optionalNumber(1, 30),
  include_hygiene_water: checkbox,
  hot_climate: checkbox,
});

export const saveKitSettings = familyAction("editor", settingsSchema, async (input, ctx) => {
  const supabase = await createClient();
  check(await supabase.from("home_kits").update(input).eq("family_id", ctx.family.id));
  return { ok: true, message: "Objetivo do HOME KIT atualizado." };
});

const budgetSchema = z.object({
  budget: z.string(),
  custom_eur: optionalNumber(0, 1_000_000),
});

export const saveBudget = familyAction("editor", budgetSchema, async ({ budget, custom_eur }, ctx) => {
  let cents: number | null;
  if (budget === "custom") {
    if (custom_eur == null) throw new ActionError("Indique o valor do orçamento.");
    cents = Math.round(custom_eur * 100);
  } else if (budget === "unlimited" || budget === "") cents = null;
  else cents = Number(budget) * 100;
  if (cents != null && !Number.isFinite(cents)) throw new ActionError("Orçamento inválido.");
  const supabase = await createClient();
  check(await supabase.from("families").update({ budget_cents: cents }).eq("id", ctx.family.id));
  return { ok: true, message: "Orçamento guardado." };
});

/** Editor overrides on a generated or custom item (definition fields). */
const itemEditSchema = z.object({
  key: z.preprocess((v) => (v === "" ? undefined : v), z.string().regex(/^[a-z0-9_.-]{2,60}$/).optional()),
  rowId: optionalUuid,
  quantity_required: optionalNumber(0, 100000),
  quantity_have: optionalNumber(0, 100000),
  expires_on: optionalDate,
  storage_location: optionalText(120),
  notes: optionalText(500),
  product_id: optionalUuid,
  is_excluded: checkbox,
  reset_quantity: checkbox,
});

export const editHomeItem = familyAction("editor", itemEditSchema, async (input, ctx) => {
  const supabase = await createClient();
  const patch = {
    quantity_required: input.reset_quantity ? null : input.quantity_required,
    expires_on: input.expires_on,
    storage_location: input.storage_location,
    notes: input.notes,
    product_id: input.product_id,
    is_excluded: input.is_excluded,
    updated_by: ctx.user.id,
    ...(input.quantity_have != null ? { quantity_have: input.quantity_have } : {}),
  };
  if (input.rowId) {
    check(await supabase.from("home_kit_items").update(patch).eq("id", input.rowId).eq("family_id", ctx.family.id));
    return { ok: true, message: "Artigo atualizado." };
  }
  if (!input.key) throw new ActionError("Artigo inválido.");
  const data = await loadPreparedness(ctx.family.id);
  const line = data.homeLines.find((l) => l.key === input.key);
  if (!line) throw new ActionError("Este artigo já não faz parte do plano.");
  check(await supabase.from("home_kit_items").insert({ family_id: ctx.family.id, item_key: line.key!, name: line.name, category: line.category, unit: line.unit, priority: line.priority, ...patch, quantity_have: input.quantity_have ?? 0 }));
  return { ok: true, message: "Artigo atualizado." };
});

const customSchema = z.object({
  name: requiredText(120),
  category: z.enum(HOME_KIT_CATEGORIES),
  unit: z.preprocess((v) => (v === "" || v == null ? "un" : v), z.string().min(1).max(16)),
  quantity_required: requiredNumber(0.01, 100000),
  priority: z.coerce.number().int().min(0).max(3),
  storage_location: optionalText(120),
});

export const addCustomHomeItem = familyAction("editor", customSchema, async (input, ctx) => {
  const supabase = await createClient();
  check(await supabase.from("home_kit_items").insert({ ...input, family_id: ctx.family.id, updated_by: ctx.user.id }));
  return { ok: true, message: "Artigo adicionado ao HOME KIT." };
});

export const deleteHomeItem = familyAction("editor", z.object({ rowId: uuid }), async ({ rowId }, ctx) => {
  const supabase = await createClient();
  check(await supabase.from("home_kit_items").delete().eq("id", rowId).eq("family_id", ctx.family.id));
  return { ok: true, message: "Artigo removido." };
});
