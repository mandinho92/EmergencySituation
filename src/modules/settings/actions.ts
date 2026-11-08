"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionResult } from "@/lib/actions";
import { getUser } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(input: Record<string, unknown>): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };
  const name = z.string().trim().min(1, "Indique o nome").max(120).safeParse(input.full_name);
  if (!name.success) return { ok: false, error: "Nome inválido.", fieldErrors: { full_name: name.error.issues[0].message } };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ full_name: name.data }).eq("id", user.id);
  return error ? { ok: false, error: "Não foi possível guardar." } : { ok: true, message: "Perfil atualizado." };
}

/**
 * Deletes the account (RGPD erasure). Families where the user is the only
 * account are deleted with it (orphan cleanup trigger). If the user is the
 * only admin of a family that still has other accounts, deletion is refused
 * until another admin is appointed — otherwise the family would be stranded.
 */
export async function deleteAccount(input: Record<string, unknown>): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };
  if (String(input.confirm ?? "").trim().toUpperCase() !== "ELIMINAR") return { ok: false, error: "Escreva ELIMINAR para confirmar.", fieldErrors: { confirm: "Escreva ELIMINAR" } };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "A eliminação de contas não está configurada neste servidor (SUPABASE_SERVICE_ROLE_KEY). Contacte o suporte." };

  const supabase = await createClient();
  const { data: memberships } = await supabase.from("family_members").select("family_id, role, families(name)").eq("user_id", user.id);
  for (const m of memberships ?? []) {
    if (m.role !== "admin") continue;
    const { data: others } = await supabase.from("family_members").select("user_id, role").eq("family_id", m.family_id).neq("user_id", user.id);
    if ((others ?? []).length > 0 && !(others ?? []).some((o) => o.role === "admin")) {
      return { ok: false, error: `É o único administrador da família “${m.families?.name}”. Promova outro membro a administrador antes de eliminar a conta.` };
    }
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("[account] delete failed", error.status, error.message);
    return { ok: false, error: "Não foi possível eliminar a conta. Tente novamente." };
  }
  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  (await cookies()).delete("fr_family");
  redirect("/?account_deleted=1");
}
