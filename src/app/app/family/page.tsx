import { Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ActionButton, ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/misc";
import { hasRole, requireFamily } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { deleteFamily, leaveFamily, renameFamily } from "@/modules/family/actions";
import { FamilySharing } from "@/modules/family/family-sharing";

export const metadata: Metadata = { title: "A minha família" };

export default async function FamilyPage() {
  const ctx = await requireFamily();
  const supabase = await createClient();
  const isAdmin = ctx.role === "admin";
  const [{ data: members }, { data: invitations }, { count: people }] = await Promise.all([
    supabase.from("family_members").select("user_id, role, joined_at, profiles!family_members_user_id_fkey(full_name)").eq("family_id", ctx.family.id).order("joined_at"),
    isAdmin
      ? supabase.from("family_invitations").select("id, email, role, expires_at, created_at").eq("family_id", ctx.family.id).is("accepted_at", null).is("revoked_at", null).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as Array<{ id: string; email: string; role: "admin" | "editor" | "member" | "viewer"; expires_at: string; created_at: string }> }),
    supabase.from("member_profiles").select("id", { count: "exact", head: true }).eq("family_id", ctx.family.id),
  ]);

  return (
    <>
      <PageHeader icon={Users} title="A minha família" description="Partilhe o plano com quem vive consigo ou o ajuda numa emergência." />
      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <FamilySharing
          accounts={(members ?? []).map((m) => ({ userId: m.user_id, name: m.profiles?.full_name ?? "—", role: m.role, joinedAt: m.joined_at }))}
          invitations={(invitations ?? []).map((i) => ({ id: i.id, email: i.email, role: i.role, expiresAt: i.expires_at, createdAt: i.created_at }))}
          currentUserId={ctx.user.id}
          isAdmin={isAdmin}
        />
        <div className="space-y-4">
          <Card>
            <CardHeader><div><CardTitle>{ctx.family.name}</CardTitle><CardDescription>{people ?? 0} pessoa(s) no agregado · <Link href="/app/members" className="text-brand-600 hover:underline">gerir membros</Link></CardDescription></div></CardHeader>
            {hasRole(ctx.role, "editor") && (
              <CardContent>
                <ActionForm action={renameFamily} className="space-y-3">
                  <Field label="Nome da família" htmlFor="family-name"><Input id="family-name" name="name" defaultValue={ctx.family.name} maxLength={80} required /></Field>
                  <SubmitButton size="sm" variant="secondary">Guardar nome</SubmitButton>
                </ActionForm>
              </CardContent>
            )}
          </Card>
          <Card>
            <CardHeader><CardTitle>Zona de risco</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <p>Ao sair, deixa de ter acesso ao plano desta família. Se for o único administrador, promova outra pessoa primeiro.</p>
              <ActionButton variant="secondary" size="sm" action={leaveFamily} input={{}} confirm="Sair desta família?">Sair da família</ActionButton>
              {isAdmin && (
                <ActionForm action={deleteFamily} successMessage={null} className="space-y-2 border-t border-slate-100 pt-3">
                  <p>Eliminar a família apaga permanentemente todos os dados (membros, kits, plano) para todas as contas.</p>
                  <Field label={`Escreva “${ctx.family.name}” para confirmar`} htmlFor="confirmName"><Input id="confirmName" name="confirmName" required autoComplete="off" /></Field>
                  <SubmitButton size="sm" variant="danger">Eliminar família</SubmitButton>
                </ActionForm>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
