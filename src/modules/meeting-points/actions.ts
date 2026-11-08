"use server";

import { z } from "zod";
import { ActionError, check, familyAction } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";
import { optionalNumber, optionalText, optionalUuid, requiredText, stringArray, uuid } from "@/lib/zod-helpers";
import { listScenarios } from "@/content/scenarios";

const SCENARIO_KEYS = listScenarios().map((s) => s.key);

const schema = z.object({
  id: optionalUuid,
  kind: z.enum(["near_home", "out_of_area", "alternative"]),
  name: requiredText(80),
  address: optionalText(200),
  latitude: optionalNumber(-90, 90),
  longitude: optionalNumber(-180, 180),
  description: optionalText(500),
  access_instructions: optionalText(500),
  scenario_keys: stringArray.pipe(z.array(z.string()).transform((a) => a.filter((k) => SCENARIO_KEYS.includes(k)))),
  responsibles: stringArray.pipe(z.array(z.string().uuid())),
}).refine((v) => (v.latitude == null) === (v.longitude == null), { path: ["latitude"], message: "Indique latitude e longitude, ou nenhuma" });

export const saveMeetingPoint = familyAction("editor", schema, async ({ id, responsibles, ...input }, ctx) => {
  const supabase = await createClient();
  let pointId = id;
  if (id) {
    check(await supabase.from("meeting_points").update(input).eq("id", id).eq("family_id", ctx.family.id));
  } else {
    const { count } = await supabase.from("meeting_points").select("id", { count: "exact", head: true }).eq("family_id", ctx.family.id);
    if ((count ?? 0) >= 10) throw new ActionError("Limite de 10 pontos de encontro.");
    const res = check(await supabase.from("meeting_points").insert({ ...input, family_id: ctx.family.id, sort_order: count ?? 0 }).select("id").single());
    pointId = res.data!.id;
  }
  // Replace responsible persons.
  check(await supabase.from("meeting_point_responsibles").delete().eq("meeting_point_id", pointId!));
  if (responsibles.length > 0) {
    check(await supabase.from("meeting_point_responsibles").insert(responsibles.map((m) => ({ meeting_point_id: pointId!, member_profile_id: m, family_id: ctx.family.id }))));
  }
  return { ok: true, message: id ? "Ponto de encontro atualizado." : "Ponto de encontro criado." };
});

export const deleteMeetingPoint = familyAction("editor", z.object({ id: uuid }), async ({ id }, ctx) => {
  const supabase = await createClient();
  check(await supabase.from("meeting_points").delete().eq("id", id).eq("family_id", ctx.family.id));
  return { ok: true, message: "Ponto de encontro removido." };
});
