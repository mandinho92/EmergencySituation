"use server";

import { z } from "zod";
import { ActionError, check, familyAction } from "@/lib/actions";
import { getScenario } from "@/content/scenarios";
import { createClient } from "@/lib/supabase/server";
import { optionalText, optionalUuid } from "@/lib/zod-helpers";

const key = z.string().regex(/^[a-z0-9-]{2,60}$/).refine((k) => !!getScenario(k), "Cenário desconhecido");

export const toggleScenarioStep = familyAction("member", z.object({ scenario: key, step: z.string().max(60), done: z.boolean() }), async ({ scenario, step, done }, ctx) => {
  const s = getScenario(scenario)!;
  if (!s.checklist.some((c) => c.id === step)) throw new ActionError("Passo desconhecido.");
  const supabase = await createClient();
  const { data: existing } = await supabase.from("emergency_plans").select("id, completed_steps").eq("family_id", ctx.family.id).eq("scenario_key", scenario).maybeSingle();
  const steps = new Set(existing?.completed_steps ?? []);
  if (done) steps.add(step); else steps.delete(step);
  if (existing) check(await supabase.from("emergency_plans").update({ completed_steps: [...steps], updated_by: ctx.user.id }).eq("id", existing.id));
  else check(await supabase.from("emergency_plans").insert({ family_id: ctx.family.id, scenario_key: scenario, completed_steps: [...steps], updated_by: ctx.user.id }));
});

export const resetScenarioChecklist = familyAction("member", z.object({ scenario: key }), async ({ scenario }, ctx) => {
  const supabase = await createClient();
  check(await supabase.from("emergency_plans").update({ completed_steps: [], updated_by: ctx.user.id }).eq("family_id", ctx.family.id).eq("scenario_key", scenario));
  return { ok: true, message: "Checklist reiniciada." };
});

export const saveScenarioPlan = familyAction("editor", z.object({ scenario: key, meeting_point_id: optionalUuid, notes: optionalText(2000) }), async ({ scenario, ...input }, ctx) => {
  const supabase = await createClient();
  const { data: existing } = await supabase.from("emergency_plans").select("id").eq("family_id", ctx.family.id).eq("scenario_key", scenario).maybeSingle();
  if (existing) check(await supabase.from("emergency_plans").update({ ...input, updated_by: ctx.user.id }).eq("id", existing.id));
  else check(await supabase.from("emergency_plans").insert({ ...input, family_id: ctx.family.id, scenario_key: scenario, updated_by: ctx.user.id }));
  return { ok: true, message: "Plano do cenário guardado." };
});
