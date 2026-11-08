"use server";

import { z } from "zod";
import { check, familyAction } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";
import { checkbox, optionalText, optionalUuid, requiredText, stringArray, uuid } from "@/lib/zod-helpers";

const phone = z.preprocess((v) => (v === "" || v == null ? null : String(v).trim()), z.string().regex(/^\+?[0-9 ()-]{6,20}$/, "Número inválido").nullable());

const contactSchema = z.object({
  id: optionalUuid,
  name: requiredText(80),
  relationship: optionalText(60),
  phone,
  phone_alt: phone,
  email: z.preprocess((v) => (v === "" || v == null ? null : v), z.string().email("Email inválido").nullable()),
  region: optionalText(80),
  is_out_of_region: checkbox,
  notes: optionalText(300),
}).refine((c) => c.phone || c.phone_alt || c.email, { path: ["phone"], message: "Indique pelo menos um telefone ou email" });

export const saveContact = familyAction("editor", contactSchema, async ({ id, ...input }, ctx) => {
  const supabase = await createClient();
  if (id) check(await supabase.from("emergency_contacts").update(input).eq("id", id).eq("family_id", ctx.family.id));
  else check(await supabase.from("emergency_contacts").insert({ ...input, family_id: ctx.family.id }));
  return { ok: true, message: id ? "Contacto atualizado." : "Contacto adicionado." };
});

export const deleteContact = familyAction("editor", z.object({ id: uuid }), async ({ id }, ctx) => {
  const supabase = await createClient();
  check(await supabase.from("emergency_contacts").delete().eq("id", id).eq("family_id", ctx.family.id));
  return { ok: true, message: "Contacto removido." };
});

const CHANNELS = ["call", "sms", "whatsapp", "email", "pmr446", "radio", "meeting_point"] as const;

const planSchema = z.object({
  primary_contact_id: optionalUuid,
  secondary_contact_id: optionalUuid,
  out_of_region_contact_id: optionalUuid,
  channels: stringArray.pipe(z.array(z.enum(CHANNELS))),
  call_order: optionalText(1000),
  no_internet_plan: optionalText(1000),
  calls_fail_plan: optionalText(1000),
  phones_down_meeting_point_id: optionalUuid,
  pmr446_channel: optionalText(40),
});

export const saveCommunicationPlan = familyAction("editor", planSchema, async (input, ctx) => {
  const supabase = await createClient();
  check(await supabase.from("communication_plans").update(input).eq("family_id", ctx.family.id));
  return { ok: true, message: "Plano de comunicação guardado." };
});

/** Who is responsible for each child in an emergency (stored on the child's profile). */
export const saveChildResponsible = familyAction("editor", z.object({ childId: uuid, responsibleId: optionalUuid }), async ({ childId, responsibleId }, ctx) => {
  const supabase = await createClient();
  check(await supabase.from("member_profiles").update({ responsible_member_id: responsibleId }).eq("id", childId).eq("family_id", ctx.family.id));
  return { ok: true, message: "Responsável atualizado." };
});
