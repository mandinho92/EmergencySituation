"use server";

import { z } from "zod";
import { ActionError, check, familyAction } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";
import { checkbox, optionalNumber, optionalText, optionalUuid, requiredText, uuid } from "@/lib/zod-helpers";

const memberSchema = z.object({
  id: optionalUuid,
  display_name: requiredText(60, "Indique um nome ou identificação"),
  category: z.enum(["adult", "child", "baby", "senior"], { error: "Escolha a categoria" }),
  age_years: optionalNumber(0, 120),
  reduced_mobility: checkbox,
  dietary_needs: optionalText(300),
  special_equipment: optionalText(300),
  uses_diapers: checkbox,
  infant_feeding: z.preprocess((v) => (v === "" ? null : v), z.enum(["formula", "breastfeeding", "baby_food", "mixed"]).nullable().optional()).transform((v) => v ?? null),
  clothing_notes: optionalText(300),
  transport_equipment: optionalText(200),
  comfort_items: optionalText(200),
  responsible_member_id: optionalUuid,
}).superRefine((m, ctx) => {
  if ((m.category === "child" || m.category === "baby") && m.age_years != null && m.age_years >= 18) {
    ctx.addIssue({ code: "custom", path: ["age_years"], message: "Uma criança tem menos de 18 anos" });
  }
  if (m.id && m.responsible_member_id === m.id) ctx.addIssue({ code: "custom", path: ["responsible_member_id"], message: "Escolha outra pessoa" });
});

export const saveMember = familyAction("editor", memberSchema, async (input, ctx) => {
  const supabase = await createClient();
  const { id, ...fields } = input;
  // Child-only fields are cleared for adults so stale data does not influence calculations.
  const isChild = fields.category === "child" || fields.category === "baby";
  const row = {
    ...fields,
    uses_diapers: isChild ? fields.uses_diapers : false,
    infant_feeding: fields.category === "baby" ? fields.infant_feeding : null,
    responsible_member_id: isChild ? fields.responsible_member_id : null,
  };
  if (id) {
    check(await supabase.from("member_profiles").update(row).eq("id", id).eq("family_id", ctx.family.id));
    return { ok: true, message: "Membro atualizado." };
  }
  const { count } = await supabase.from("member_profiles").select("id", { count: "exact", head: true }).eq("family_id", ctx.family.id);
  if ((count ?? 0) >= 30) throw new ActionError("Limite de 30 membros por família.");
  check(await supabase.from("member_profiles").insert({ ...row, family_id: ctx.family.id, sort_order: count ?? 0 }));
  return { ok: true, message: "Membro adicionado." };
});

export const deleteMember = familyAction("editor", z.object({ id: uuid }), async ({ id }, ctx) => {
  const supabase = await createClient();
  check(await supabase.from("member_profiles").delete().eq("id", id).eq("family_id", ctx.family.id));
  return { ok: true, message: "Membro removido." };
});

const PRESETS: Record<string, Array<{ name: string; category: "adult" | "child" | "baby" | "senior"; age?: number }>> = {
  single: [{ name: "Adulto 1", category: "adult" }],
  couple: [{ name: "Adulto 1", category: "adult" }, { name: "Adulto 2", category: "adult" }],
  couple_1: [{ name: "Adulto 1", category: "adult" }, { name: "Adulto 2", category: "adult" }, { name: "Criança 1", category: "child", age: 6 }],
  couple_2: [{ name: "Adulto 1", category: "adult" }, { name: "Adulto 2", category: "adult" }, { name: "Criança 1", category: "child", age: 8 }, { name: "Criança 2", category: "child", age: 5 }],
  couple_3: [{ name: "Adulto 1", category: "adult" }, { name: "Adulto 2", category: "adult" }, { name: "Criança 1", category: "child", age: 10 }, { name: "Criança 2", category: "child", age: 7 }, { name: "Criança 3", category: "child", age: 4 }],
  single_parent: [{ name: "Adulto 1", category: "adult" }, { name: "Criança 1", category: "child", age: 7 }],
  senior_couple: [{ name: "Sénior 1", category: "senior" }, { name: "Sénior 2", category: "senior" }],
  extended: [{ name: "Adulto 1", category: "adult" }, { name: "Adulto 2", category: "adult" }, { name: "Criança 1", category: "child", age: 7 }, { name: "Sénior 1", category: "senior" }],
};

export const applyPreset = familyAction("editor", z.object({ preset: z.enum(Object.keys(PRESETS) as [string, ...string[]]) }), async ({ preset }, ctx) => {
  const supabase = await createClient();
  const { count } = await supabase.from("member_profiles").select("id", { count: "exact", head: true }).eq("family_id", ctx.family.id);
  if ((count ?? 0) > 0) throw new ActionError("A família já tem membros. Edite-os individualmente.");
  const rows = PRESETS[preset].map((p, i) => ({ family_id: ctx.family.id, display_name: i === 0 ? ctx.profile.full_name.slice(0, 60) : p.name, category: p.category, age_years: p.age ?? null, sort_order: i, linked_user_id: i === 0 ? ctx.user.id : null }));
  check(await supabase.from("member_profiles").insert(rows));
  return { ok: true, message: "Agregado criado. Pode renomear e ajustar cada membro." };
});

const healthSchema = z.object({
  member_profile_id: uuid,
  allergies: optionalText(500),
  medication: optionalText(500),
  health_needs: optionalText(500),
  include_on_card: checkbox,
  consent: z.literal("on", { error: "É necessário o consentimento explícito para guardar dados de saúde." }),
});

export const saveHealth = familyAction("editor", healthSchema, async ({ member_profile_id, allergies, medication, health_needs, include_on_card }, ctx) => {
  const input = { member_profile_id, allergies, medication, health_needs, include_on_card };
  const supabase = await createClient();
  const { data: existing } = await supabase.from("member_health").select("member_profile_id").eq("member_profile_id", input.member_profile_id).maybeSingle();
  if (!input.allergies && !input.medication && !input.health_needs) {
    if (existing) check(await supabase.from("member_health").delete().eq("member_profile_id", input.member_profile_id));
    return { ok: true, message: "Dados de saúde removidos." };
  }
  if (existing) {
    check(await supabase.from("member_health").update({ allergies: input.allergies, medication: input.medication, health_needs: input.health_needs, include_on_card: input.include_on_card }).eq("member_profile_id", input.member_profile_id));
  } else {
    check(await supabase.from("member_health").insert({ ...input, family_id: ctx.family.id, consent_at: new Date().toISOString(), consent_by: ctx.user.id }));
  }
  return { ok: true, message: "Dados de saúde guardados de forma privada." };
});

export const deleteHealth = familyAction("editor", z.object({ member_profile_id: uuid }), async ({ member_profile_id }, ctx) => {
  const supabase = await createClient();
  check(await supabase.from("member_health").delete().eq("member_profile_id", member_profile_id).eq("family_id", ctx.family.id));
  return { ok: true, message: "Dados de saúde apagados." };
});

const petSchema = z.object({
  id: optionalUuid,
  name: requiredText(60, "Indique o nome"),
  species: z.enum(["dog", "cat", "bird", "rabbit", "rodent", "reptile", "fish", "other"]),
  quantity: z.preprocess((v) => (v === "" || v == null ? 1 : Number(v)), z.number().int().min(1).max(50)),
  approx_weight_kg: optionalNumber(0, 150),
  food_notes: optionalText(300),
  medication: optionalText(300),
  has_carrier: checkbox,
  has_microchip: checkbox,
  documents_notes: optionalText(300),
});

export const savePet = familyAction("editor", petSchema, async ({ id, ...fields }, ctx) => {
  const supabase = await createClient();
  if (id) check(await supabase.from("pets").update(fields).eq("id", id).eq("family_id", ctx.family.id));
  else check(await supabase.from("pets").insert({ ...fields, family_id: ctx.family.id }));
  return { ok: true, message: id ? "Animal atualizado." : "Animal adicionado." };
});

export const deletePet = familyAction("editor", z.object({ id: uuid }), async ({ id }, ctx) => {
  const supabase = await createClient();
  check(await supabase.from("pets").delete().eq("id", id).eq("family_id", ctx.family.id));
  return { ok: true, message: "Animal removido." };
});
