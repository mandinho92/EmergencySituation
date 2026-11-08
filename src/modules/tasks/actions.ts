"use server";

import { z } from "zod";
import { check, familyAction } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";
import { optionalDate, optionalText, optionalUuid, requiredText, uuid } from "@/lib/zod-helpers";

export const saveTask = familyAction("member", z.object({ id: optionalUuid, title: requiredText(140), description: optionalText(1000), assignee_user_id: optionalUuid, due_on: optionalDate }), async ({ id, ...input }, ctx) => {
  const supabase = await createClient();
  if (id) check(await supabase.from("tasks").update(input).eq("id", id).eq("family_id", ctx.family.id));
  else check(await supabase.from("tasks").insert({ ...input, family_id: ctx.family.id, created_by: ctx.user.id }));
  return { ok: true, message: id ? "Tarefa atualizada." : "Tarefa criada." };
});

export const setTaskDone = familyAction("member", z.object({ id: uuid, done: z.boolean() }), async ({ id, done }, ctx) => {
  const supabase = await createClient();
  check(await supabase.from("tasks").update(done ? { status: "done", completed_at: new Date().toISOString(), completed_by: ctx.user.id } : { status: "open", completed_at: null, completed_by: null }).eq("id", id).eq("family_id", ctx.family.id));
  return { ok: true, message: done ? "Tarefa concluída." : "Tarefa reaberta." };
});

export const deleteTask = familyAction("member", z.object({ id: uuid }), async ({ id }, ctx) => {
  const supabase = await createClient();
  check(await supabase.from("tasks").delete().eq("id", id).eq("family_id", ctx.family.id));
  return { ok: true, message: "Tarefa removida." };
});
