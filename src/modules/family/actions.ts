"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ActionError, check, familyAction, type ActionResult } from "@/lib/actions";
import { ACTIVE_FAMILY_COOKIE, getFamilyContext, getUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export async function switchFamily(input: Record<string, unknown>): Promise<ActionResult> {
  const id = z.string().uuid().safeParse(input.familyId);
  const ctx = await getFamilyContext();
  if (!id.success || !ctx?.families.some((f) => f.id === id.data)) return { ok: false, error: "Família inválida." };
  (await cookies()).set(ACTIVE_FAMILY_COOKIE, id.data, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
  redirect("/app");
}

export async function createFamily(input: Record<string, unknown>): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };
  const name = z.string().trim().min(1, "Indique um nome").max(80).safeParse(input.name);
  if (!name.success) return { ok: false, error: "Indique o nome da família.", fieldErrors: { name: name.error.issues[0].message } };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_family", { p_name: name.data });
  if (error) return { ok: false, error: error.message.includes("family_limit") ? "Atingiu o limite de famílias." : "Não foi possível criar a família." };
  (await cookies()).set(ACTIVE_FAMILY_COOKIE, data as string, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
  redirect("/onboarding?step=members");
}

export const renameFamily = familyAction("editor", z.object({ name: z.string().trim().min(1).max(80) }), async ({ name }, ctx) => {
  const supabase = await createClient();
  check(await supabase.from("families").update({ name }).eq("id", ctx.family.id));
  return { ok: true, message: "Nome atualizado." };
});

export const setOnboardingStep = familyAction("viewer", z.object({ step: z.enum(["members", "household", "preferences", "done"]) }), async ({ step }, ctx) => {
  const supabase = await createClient();
  const patch = step === "done" ? { onboarding_step: "done", onboarding_completed_at: new Date().toISOString() } : { onboarding_step: step };
  // Viewers cannot update the family row; their onboarding is the family's onboarding.
  if (ctx.role === "viewer" || ctx.role === "member") return { ok: true };
  check(await supabase.from("families").update(patch).eq("id", ctx.family.id));
});

export const deleteFamily = familyAction("admin", z.object({ confirmName: z.string() }), async ({ confirmName }, ctx) => {
  if (confirmName.trim() !== ctx.family.name) throw new ActionError("O nome não coincide.");
  const supabase = await createClient();
  check(await supabase.from("families").delete().eq("id", ctx.family.id));
  (await cookies()).delete(ACTIVE_FAMILY_COOKIE);
  redirect("/onboarding");
});

export const leaveFamily = familyAction("viewer", z.object({}), async (_, ctx) => {
  const supabase = await createClient();
  check(await supabase.from("family_members").delete().eq("family_id", ctx.family.id).eq("user_id", ctx.user.id));
  (await cookies()).delete(ACTIVE_FAMILY_COOKIE);
  redirect("/app");
});
