"use server";

import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ActionError, check, describeDbError, familyAction, type ActionResult } from "@/lib/actions";
import { escapeHtml, sendEmail } from "@/lib/email";
import { publicEnv } from "@/lib/env";
import { ROLE_LABEL } from "@/i18n/messages";
import { getUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { uuid } from "@/lib/zod-helpers";

const INVITE_DAYS = 7;
const roleSchema = z.enum(["admin", "editor", "member", "viewer"]);

export const inviteMember = familyAction(
  "admin",
  z.object({ email: z.string().trim().toLowerCase().email("Email inválido"), role: roleSchema }),
  async ({ email, role }, ctx): Promise<ActionResult<{ url: string; emailed: boolean }>> => {
    if (email === ctx.user.email?.toLowerCase()) throw new ActionError("Não se pode convidar a si próprio.");
    const supabase = await createClient();

    // A pending invitation for the same email is replaced (new token, new expiry).
    await supabase.from("family_invitations").update({ revoked_at: new Date().toISOString() }).eq("family_id", ctx.family.id).eq("email", email).is("accepted_at", null).is("revoked_at", null);

    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token, "utf8").digest("hex");
    check(
      await supabase.from("family_invitations").insert({
        family_id: ctx.family.id,
        email,
        role,
        token_hash: tokenHash,
        invited_by: ctx.user.id,
        expires_at: new Date(Date.now() + INVITE_DAYS * 86_400_000).toISOString(),
      }),
    );

    const url = `${publicEnv.NEXT_PUBLIC_SITE_URL}/invite/${token}`;
    const inviter = ctx.profile.full_name.split(/\s+/)[0];
    // No health or plan data in the email: only who invites, the family name and the link.
    const emailed = await sendEmail({
      to: email,
      subject: `${inviter} convidou-o para a família ${ctx.family.name} no FamilyReady`,
      text: `${inviter} convidou-o para preparar a família "${ctx.family.name}" no FamilyReady, com a permissão "${ROLE_LABEL[role]}".\n\nAceitar o convite: ${url}\n\nO convite expira em ${INVITE_DAYS} dias e só pode ser aceite com este endereço de email.`,
      html: `<p>${escapeHtml(inviter)} convidou-o para preparar a família <strong>${escapeHtml(ctx.family.name)}</strong> no FamilyReady, com a permissão <strong>${ROLE_LABEL[role]}</strong>.</p><p><a href="${url}" style="background:#1e3a5f;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Aceitar o convite</a></p><p style="color:#64748b;font-size:13px">O convite expira em ${INVITE_DAYS} dias e só pode ser aceite com este endereço de email.</p>`,
    });
    return { ok: true, message: emailed ? `Convite enviado para ${email}.` : "Convite criado. Partilhe o link com o familiar.", data: { url, emailed } };
  },
);

export const revokeInvitation = familyAction("admin", z.object({ id: uuid }), async ({ id }, ctx) => {
  const supabase = await createClient();
  check(await supabase.from("family_invitations").update({ revoked_at: new Date().toISOString() }).eq("id", id).eq("family_id", ctx.family.id));
  return { ok: true, message: "Convite revogado." };
});

export const changeRole = familyAction("admin", z.object({ userId: uuid, role: roleSchema }), async ({ userId, role }, ctx) => {
  const supabase = await createClient();
  check(await supabase.from("family_members").update({ role }).eq("family_id", ctx.family.id).eq("user_id", userId));
  return { ok: true, message: "Permissão alterada." };
});

export const removeAccount = familyAction("admin", z.object({ userId: uuid }), async ({ userId }, ctx) => {
  if (userId === ctx.user.id) throw new ActionError("Para sair da família use “Sair da família”.");
  const supabase = await createClient();
  check(await supabase.from("family_members").delete().eq("family_id", ctx.family.id).eq("user_id", userId));
  return { ok: true, message: "Acesso revogado." };
});

export async function acceptInvitation(input: Record<string, unknown>): Promise<ActionResult> {
  const token = z.string().min(32).max(128).safeParse(input.token);
  if (!token.success) return { ok: false, error: "Convite inválido." };
  if (!(await getUser())) return { ok: false, error: "Entre na sua conta para aceitar o convite." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_invitation", { p_token: token.data });
  if (error) return { ok: false, error: describeDbError(error) };
  const { cookies } = await import("next/headers");
  (await cookies()).set("fr_family", data as string, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
  redirect("/app?joined=1");
}
