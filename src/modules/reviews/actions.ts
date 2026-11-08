"use server";

import { z } from "zod";
import { check, describeDbError, familyAction } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";
import { stringArray, uuid } from "@/lib/zod-helpers";

import { REVIEW_CHECKLIST } from "./checklist";

export const completeReview = familyAction("member", z.object({ id: uuid, items: stringArray }), async ({ id, items }) => {
  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_reminder", { p_reminder_id: id, p_completed_items: items.filter((i) => REVIEW_CHECKLIST.some((c) => c.id === i)) });
  if (error) return { ok: false, error: describeDbError(error) };
  return { ok: true, message: "Revisão concluída. A próxima foi agendada." };
});

export const createReminder = familyAction("member", z.object({ title: z.string().trim().min(1).max(140), due_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }), async (input, ctx) => {
  const supabase = await createClient();
  check(await supabase.from("reminders").insert({ ...input, family_id: ctx.family.id, kind: "custom" }));
  return { ok: true, message: "Lembrete criado." };
});
