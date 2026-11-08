"use server";

import { z } from "zod";
import { check, familyAction } from "@/lib/actions";
import { DEVICE_PRESETS } from "@/domain/energy/energy";
import { createClient } from "@/lib/supabase/server";
import { checkbox, optionalNumber, optionalUuid, requiredNumber, requiredText, uuid } from "@/lib/zod-helpers";

const TIERS = ["undecided", "none", "powerbanks", "economic", "balanced", "advanced", "manual"] as const;

export const setEnergyTier = familyAction("editor", z.object({ tier: z.enum(TIERS) }), async ({ tier }, ctx) => {
  const supabase = await createClient();
  check(await supabase.from("energy_profiles").update({ tier }).eq("family_id", ctx.family.id));
  return { ok: true, message: "Preferência de energia guardada." };
});

const settingsSchema = z.object({
  autonomy_days: requiredNumber(0.5, 30),
  inverter_efficiency: requiredNumber(0.5, 1),
  peak_sun_hours: requiredNumber(0.5, 10),
  solar_derate: requiredNumber(0.3, 1),
});

export const saveEnergySettings = familyAction("editor", settingsSchema, async (input, ctx) => {
  const supabase = await createClient();
  check(await supabase.from("energy_profiles").update(input).eq("family_id", ctx.family.id));
  return { ok: true, message: "Pressupostos atualizados." };
});

const selectionSchema = z.object({
  selected_station_product_id: optionalUuid,
  selected_panel_product_id: optionalUuid,
  panel_count: optionalNumber(0, 20),
  station_acquired: checkbox,
  panels_acquired: checkbox,
});

export const saveEnergySelection = familyAction("editor", selectionSchema, async ({ panel_count, ...input }, ctx) => {
  const supabase = await createClient();
  check(await supabase.from("energy_profiles").update({ ...input, panel_count: panel_count == null ? null : Math.round(panel_count) }).eq("family_id", ctx.family.id));
  return { ok: true, message: "Seleção guardada." };
});

const deviceSchema = z.object({
  id: optionalUuid,
  name: requiredText(80),
  watts: requiredNumber(0.1, 5000),
  surge_watts: optionalNumber(0.1, 15000),
  hours_per_day: requiredNumber(0.1, 24),
  quantity: z.coerce.number().int().min(1).max(20),
  is_ac: checkbox,
  is_essential: checkbox,
}).refine((d) => d.surge_watts == null || d.surge_watts >= d.watts, { path: ["surge_watts"], message: "A potência de arranque deve ser ≥ à potência nominal" });

export const saveDevice = familyAction("editor", deviceSchema, async ({ id, ...input }, ctx) => {
  const supabase = await createClient();
  if (id) check(await supabase.from("energy_devices").update(input).eq("id", id).eq("family_id", ctx.family.id));
  else check(await supabase.from("energy_devices").insert({ ...input, family_id: ctx.family.id }));
  return { ok: true, message: id ? "Equipamento atualizado." : "Equipamento adicionado." };
});

export const addPresetDevice = familyAction("editor", z.object({ key: z.string() }), async ({ key }, ctx) => {
  const p = DEVICE_PRESETS.find((d) => d.key === key);
  if (!p) return { ok: false, error: "Equipamento desconhecido." };
  const supabase = await createClient();
  check(await supabase.from("energy_devices").insert({ family_id: ctx.family.id, preset_key: p.key, name: p.name, watts: p.watts, surge_watts: p.surgeWatts ?? null, hours_per_day: p.hoursPerDay, quantity: p.quantity, is_ac: p.isAc }));
  return { ok: true, message: `${p.name} adicionado.` };
});

export const deleteDevice = familyAction("editor", z.object({ id: uuid }), async ({ id }, ctx) => {
  const supabase = await createClient();
  check(await supabase.from("energy_devices").delete().eq("id", id).eq("family_id", ctx.family.id));
  return { ok: true, message: "Equipamento removido." };
});
