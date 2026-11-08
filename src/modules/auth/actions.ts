"use server";

import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionResult } from "@/lib/actions";
import { publicEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { NEXT_COOKIE } from "./constants";

const emailSchema = z.string().trim().toLowerCase().email("Email inválido").max(254);
const nextSchema = z.string().regex(/^\/(?!\/)[\w\-/?=&.%]*$/).max(300).optional().catch(undefined);

const requestSchema = z.object({
  mode: z.enum(["signup", "login"]),
  name: z.string().trim().max(120).optional(),
  email: emailSchema,
  next: nextSchema,
  consent: z.string().optional(),
});

const hash = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 32);

/**
 * Rate limit for magic-link requests (per email and per IP). Supabase Auth
 * also enforces its own project-wide email limits. If the service role key is
 * missing, the app logs a warning and relies on Supabase limits only.
 */
async function allowRequest(email: string): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) {
    console.warn("[auth] SUPABASE_SERVICE_ROLE_KEY not set: app-level rate limiting disabled");
    return true;
  }
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const [byEmail, byIp] = await Promise.all([
    admin.rpc("consume_rate_limit", { p_key: `otp:email:${hash(email)}`, p_max: 5, p_window_seconds: 3600 }),
    admin.rpc("consume_rate_limit", { p_key: `otp:ip:${hash(ip)}`, p_max: 20, p_window_seconds: 3600 }),
  ]);
  if (byEmail.error || byIp.error) {
    console.error("[auth] rate limit check failed", byEmail.error ?? byIp.error);
    return true; // fail open: Supabase's own limits still apply
  }
  return byEmail.data === true && byIp.data === true;
}

export async function requestMagicLink(input: Record<string, unknown>): Promise<ActionResult<{ email: string }>> {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { ok: false, error: "Verifique os campos assinalados.", fieldErrors };
  }
  const { mode, email, next } = parsed.data;
  const name = parsed.data.name?.trim();
  if (mode === "signup") {
    if (!name) return { ok: false, error: "Indique o seu nome.", fieldErrors: { name: "Campo obrigatório" } };
    if (parsed.data.consent !== "on") return { ok: false, error: "É necessário aceitar os termos e a política de privacidade.", fieldErrors: { consent: "Obrigatório" } };
  }

  if (!(await allowRequest(email))) {
    return { ok: false, error: "Foram pedidos demasiados links. Aguarde alguns minutos e tente novamente." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: mode === "signup",
      emailRedirectTo: `${publicEnv.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
      data: mode === "signup" ? { full_name: name } : undefined,
    },
  });

  // Do not reveal whether an account exists (login of an unknown email fails
  // with "signups not allowed"): the response is the same in both cases.
  if (error && !/signups not allowed|user not found/i.test(error.message)) {
    if (error.status === 429) return { ok: false, error: "Foram pedidos demasiados links. Aguarde alguns minutos." };
    console.error("[auth] signInWithOtp failed", error.status, error.message);
    return { ok: false, error: "Não foi possível enviar o email. Tente novamente dentro de momentos." };
  }

  const store = await cookies();
  if (next) store.set(NEXT_COOKIE, next, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 3600, path: "/" });
  return { ok: true, data: { email } };
}

const codeSchema = z.object({ email: emailSchema, code: z.string().trim().regex(/^\d{6}$/, "O código tem 6 dígitos") });

/** Alternative to clicking the link: type the 6-digit code from the email (useful in installed apps). */
export async function verifyEmailCode(input: Record<string, unknown>): Promise<ActionResult> {
  const parsed = codeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Código inválido.", fieldErrors: { code: parsed.error.issues[0]?.message ?? "Código inválido" } };
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email: parsed.data.email, token: parsed.data.code, type: "email" });
  if (error) return { ok: false, error: "Código inválido ou expirado. Peça um novo link." };
  const store = await cookies();
  const next = store.get(NEXT_COOKIE)?.value;
  store.delete(NEXT_COOKIE);
  redirect(next && next.startsWith("/") && !next.startsWith("//") ? next : "/app");
}

export async function signOut(input: Record<string, unknown>): Promise<ActionResult> {
  const scope = input.scope === "global" ? "global" : "local";
  const supabase = await createClient();
  await supabase.auth.signOut({ scope });
  redirect("/login?signed_out=1");
}
