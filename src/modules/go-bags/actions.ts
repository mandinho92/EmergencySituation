"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { ActionError, check, familyAction } from "@/lib/actions";
import { childBagCandidates, suggestBags } from "@/domain/preparedness/go-bag";
import { BAG_CATEGORIES } from "@/i18n/messages";
import { createClient } from "@/lib/supabase/server";
import { checkbox, optionalDate, optionalNumber, optionalText, optionalUuid, requiredNumber, requiredText, uuid } from "@/lib/zod-helpers";
import { loadPreparedness } from "@/modules/preparedness/load";

export const createSuggestedBags = familyAction("editor", z.object({}), async (_, ctx) => {
  const data = await loadPreparedness(ctx.family.id);
  const existingOwners = new Set(data.bags.map((b) => b.bag.owner_member_id).filter(Boolean));
  const existingPets = new Set(data.bags.map((b) => b.bag.pet_id).filter(Boolean));
  const toCreate = suggestBags(data.members, data.pets).filter((s) => (s.ownerMemberId ? !existingOwners.has(s.ownerMemberId) : !existingPets.has(s.petId)));
  if (toCreate.length === 0) throw new ActionError("Já existe uma mochila para cada adulto e um kit para cada animal.");
  const supabase = await createClient();
  check(await supabase.from("evacuation_bags").insert(toCreate.map((b, i) => ({
    family_id: ctx.family.id, name: b.name.slice(0, 60), kind: b.kind, owner_member_id: b.ownerMemberId, pet_id: b.petId,
    capacity_liters: b.kind === "adult" ? 35 : null, sort_order: data.bags.length + i,
  }))));
  return { ok: true, message: `${toCreate.length} mochila(s) criada(s).` };
});

export const createChildBag = familyAction("editor", z.object({ memberId: uuid }), async ({ memberId }, ctx) => {
  const data = await loadPreparedness(ctx.family.id);
  const child = childBagCandidates(data.members, data.bags.map((b) => ({ id: b.bag.id, kind: b.bag.kind as "adult" | "child" | "pet", ownerMemberId: b.bag.owner_member_id, petId: b.bag.pet_id }))).find((m) => m.id === memberId);
  if (!child) throw new ActionError("Esta criança já tem mochila ou ainda é pequena para transportar uma.");
  const supabase = await createClient();
  check(await supabase.from("evacuation_bags").insert({ family_id: ctx.family.id, name: `Mochila de ${child.displayName}`.slice(0, 60), kind: "child", owner_member_id: child.id, capacity_liters: 12, sort_order: data.bags.length }));
  return { ok: true, message: "Mochila infantil criada." };
});

const bagSchema = z.object({
  id: optionalUuid,
  name: requiredText(60),
  kind: z.enum(["adult", "child", "pet"]).optional(),
  owner_member_id: optionalUuid,
  capacity_liters: optionalNumber(5, 120),
  notes: optionalText(500),
});

export const saveBag = familyAction("editor", bagSchema, async ({ id, kind, capacity_liters, ...input }, ctx) => {
  const supabase = await createClient();
  const capacity = capacity_liters == null ? null : Math.round(capacity_liters);
  if (id) check(await supabase.from("evacuation_bags").update({ ...input, capacity_liters: capacity }).eq("id", id).eq("family_id", ctx.family.id));
  else check(await supabase.from("evacuation_bags").insert({ ...input, capacity_liters: capacity, kind: kind ?? "adult", family_id: ctx.family.id }));
  return { ok: true, message: id ? "Mochila atualizada." : "Mochila criada." };
});

export const deleteBag = familyAction("editor", z.object({ id: uuid }), async ({ id }, ctx) => {
  const supabase = await createClient();
  check(await supabase.from("evacuation_bags").delete().eq("id", id).eq("family_id", ctx.family.id));
  redirect("/app/go-bags");
});

/** Members can record a check (verification date) — see guard_member_bag_update. */
export const markBagChecked = familyAction("member", z.object({ id: uuid }), async ({ id }, ctx) => {
  const supabase = await createClient();
  check(await supabase.from("evacuation_bags").update({ last_checked_at: new Date().toISOString() }).eq("id", id).eq("family_id", ctx.family.id));
  return { ok: true, message: "Verificação registada." };
});

const customItemSchema = z.object({
  bagId: uuid,
  name: requiredText(120),
  category: z.enum(BAG_CATEGORIES),
  quantity_required: requiredNumber(0.01, 1000),
  unit: z.preprocess((v) => (v === "" || v == null ? "un" : v), z.string().min(1).max(16)),
  unit_weight_g: optionalNumber(0, 50000),
  priority: z.coerce.number().int().min(0).max(3),
  expires_on: optionalDate,
});

export const addCustomBagItem = familyAction("editor", customItemSchema, async ({ bagId, unit_weight_g, ...input }, ctx) => {
  const supabase = await createClient();
  check(await supabase.from("evacuation_bag_items").insert({ ...input, unit_weight_g: unit_weight_g == null ? null : Math.round(unit_weight_g), bag_id: bagId, family_id: ctx.family.id, updated_by: ctx.user.id }));
  return { ok: true, message: "Artigo adicionado." };
});

const editSchema = z.object({
  bagId: uuid,
  key: z.preprocess((v) => (v === "" ? undefined : v), z.string().regex(/^[a-z0-9_.-]{2,60}$/).optional()),
  rowId: optionalUuid,
  quantity_required: optionalNumber(0, 1000),
  unit_weight_g: optionalNumber(0, 50000),
  expires_on: optionalDate,
  notes: optionalText(500),
  is_excluded: checkbox,
  reset_quantity: checkbox,
});

export const editBagItem = familyAction("editor", editSchema, async (input, ctx) => {
  const supabase = await createClient();
  const patch = {
    quantity_required: input.reset_quantity ? null : input.quantity_required,
    unit_weight_g: input.unit_weight_g == null ? null : Math.round(input.unit_weight_g),
    expires_on: input.expires_on,
    notes: input.notes,
    is_excluded: input.is_excluded,
    updated_by: ctx.user.id,
  };
  if (input.rowId) {
    check(await supabase.from("evacuation_bag_items").update(patch).eq("id", input.rowId).eq("family_id", ctx.family.id));
    return { ok: true, message: "Artigo atualizado." };
  }
  const data = await loadPreparedness(ctx.family.id);
  const line = data.bags.find((b) => b.bag.id === input.bagId)?.lines.find((l) => l.key === input.key);
  if (!line?.key) throw new ActionError("Este artigo já não faz parte da mochila.");
  check(await supabase.from("evacuation_bag_items").insert({ family_id: ctx.family.id, bag_id: input.bagId, item_key: line.key, name: line.name, category: line.category, unit: line.unit, priority: line.priority, ...patch, unit_weight_g: patch.unit_weight_g ?? line.unitWeightGrams }));
  return { ok: true, message: "Artigo atualizado." };
});

export const deleteBagItem = familyAction("editor", z.object({ rowId: uuid }), async ({ rowId }, ctx) => {
  const supabase = await createClient();
  check(await supabase.from("evacuation_bag_items").delete().eq("id", rowId).eq("family_id", ctx.family.id));
  return { ok: true, message: "Artigo removido." };
});
