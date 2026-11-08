import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type FamilyRole = Database["public"]["Enums"]["family_role"];
export const ACTIVE_FAMILY_COOKIE = "fr_family";

const ROLE_ORDER: FamilyRole[] = ["viewer", "member", "editor", "admin"];
export const hasRole = (role: FamilyRole, min: FamilyRole) => ROLE_ORDER.indexOf(role) >= ROLE_ORDER.indexOf(min);

/** Authenticated user for this request (validated with the Auth server), or null. */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
});

export async function requireUser(next?: string) {
  const user = await getUser();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return user;
}

export interface FamilyContext {
  user: NonNullable<Awaited<ReturnType<typeof getUser>>>;
  profile: { id: string; full_name: string; locale: string };
  family: Database["public"]["Tables"]["families"]["Row"];
  role: FamilyRole;
  families: Array<{ id: string; name: string; role: FamilyRole }>;
}

/**
 * Resolves the active family for the current user. The active family is a
 * UI preference stored in a cookie; membership is re-checked on every request
 * (and RLS enforces it again at the database).
 */
export const getFamilyContext = cache(async (): Promise<FamilyContext | null> => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, locale").eq("id", user.id).single(),
    supabase.from("family_members").select("role, families(*)").eq("user_id", user.id).order("joined_at"),
  ]);
  if (!profile || !memberships || memberships.length === 0) return null;

  const preferred = (await cookies()).get(ACTIVE_FAMILY_COOKIE)?.value;
  const rows = memberships.filter((m) => m.families);
  const active = rows.find((m) => m.families!.id === preferred) ?? rows[0];
  if (!active?.families) return null;
  return {
    user,
    profile,
    family: active.families,
    role: active.role,
    families: rows.map((m) => ({ id: m.families!.id, name: m.families!.name, role: m.role })),
  };
});

/** For private pages: guarantees a user with a family, otherwise redirects. */
export async function requireFamily(minRole: FamilyRole = "viewer"): Promise<FamilyContext> {
  await requireUser();
  const ctx = await getFamilyContext();
  if (!ctx) redirect("/onboarding");
  if (!hasRole(ctx.role, minRole)) redirect("/app?error=permission");
  return ctx;
}
