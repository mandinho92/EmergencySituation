import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getFamilyContext, hasRole, type FamilyContext, type FamilyRole } from "@/lib/session";

/** Uniform result for server actions consumed by forms (useActionState) and buttons. */
export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export const initialActionState: ActionResult = { ok: true };

export class ActionError extends Error {}

/** Maps database/PostgREST errors to user-facing PT-PT messages without leaking internals. */
export function describeDbError(error: { code?: string; message?: string } | null | undefined): string {
  if (!error) return "Ocorreu um erro inesperado.";
  const m = error.message ?? "";
  if (m.includes("last_admin")) return "Promova outro membro a administrador antes de sair ou alterar a sua função.";
  if (m.includes("insufficient_role") || error.code === "42501") return "Não tem permissão para esta ação.";
  if (m.includes("rate_limited")) return "Demasiados pedidos. Tente novamente mais tarde.";
  if (m.includes("invitation_email_mismatch")) return "Este convite foi enviado para outro email. Entre com o email convidado.";
  if (m.includes("invitation_expired")) return "Este convite expirou. Peça um novo convite.";
  if (m.includes("invitation_revoked")) return "Este convite foi revogado.";
  if (m.includes("invitation_already_used")) return "Este convite já foi utilizado.";
  if (m.includes("invitation_not_found")) return "Convite inválido.";
  if (m.includes("family_limit_reached")) return "Atingiu o número máximo de famílias que pode administrar.";
  if (error.code === "23505") return "Já existe um registo igual.";
  if (error.code === "23514" || error.code === "22P02" || error.code === "23502") return "Alguns dados não são válidos.";
  if (error.code === "23503") return "O registo relacionado já não existe.";
  console.error("[db]", error.code, m);
  return "Não foi possível guardar. Tente novamente.";
}

export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/**
 * Wraps a server action: resolves the family context, checks the minimum role,
 * validates input with Zod and revalidates the private area afterwards.
 */
export function familyAction<S extends z.ZodType, T = undefined>(
  minRole: FamilyRole,
  schema: S,
  handler: (input: z.infer<S>, ctx: FamilyContext) => Promise<ActionResult<T> | void>,
) {
  return async (raw: unknown): Promise<ActionResult<T>> => {
    const ctx = await getFamilyContext();
    if (!ctx) return { ok: false, error: "Sessão expirada. Entre novamente." };
    if (!hasRole(ctx.role, minRole)) return { ok: false, error: "Não tem permissão para esta ação." };
    const parsed = schema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "Verifique os campos assinalados.", fieldErrors: zodFieldErrors(parsed.error) };
    try {
      const result = await handler(parsed.data, ctx);
      revalidatePath("/app", "layout");
      return result ?? { ok: true };
    } catch (e) {
      if (e instanceof ActionError) return { ok: false, error: e.message };
      // Let Next.js redirects/notFound propagate.
      if (e && typeof e === "object" && "digest" in e) throw e;
      console.error("[action]", e);
      return { ok: false, error: "Ocorreu um erro inesperado. Tente novamente." };
    }
  };
}

/** Throws an ActionError with a translated message when a Supabase call fails. */
export function check<T extends { error: { code?: string; message?: string } | null }>(res: T): T {
  if (res.error) throw new ActionError(describeDbError(res.error));
  return res;
}

/** FormData → plain object (checkbox "on" → true; repeated keys → arrays). */
export function formToObject(fd: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) {
    if (k.startsWith("$ACTION")) continue;
    const value = typeof v === "string" ? v : v.name;
    if (k.endsWith("[]")) {
      const key = k.slice(0, -2);
      out[key] = [...((out[key] as string[]) ?? []), value];
    } else {
      out[k] = value;
    }
  }
  return out;
}
