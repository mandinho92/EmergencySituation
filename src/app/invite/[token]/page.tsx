import { ShieldCheck, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ActionButton } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/misc";
import { formatDate } from "@/i18n/format";
import { ROLE_LABEL } from "@/i18n/messages";
import { getUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { acceptInvitation } from "@/modules/family/invite-actions";

export const metadata: Metadata = { title: "Convite", robots: { index: false } };

export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const supabase = await createClient();
  const [{ data }, user] = await Promise.all([supabase.rpc("invitation_preview", { p_token: token }), getUser()]);
  const invite = data?.[0];
  const next = `/invite/${token}`;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-50 px-4">
      <Link href="/" className="mb-8 flex items-center gap-2 text-lg font-semibold text-brand-800"><ShieldCheck className="size-6 text-ready-600" aria-hidden /> FamilyReady</Link>
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-[var(--shadow-card)]">
        {!invite ? (
          <Notice tone="danger">Este convite não é válido. Peça ao administrador da família um novo convite.</Notice>
        ) : invite.status !== "pending" ? (
          <Notice tone="warning">{invite.status === "expired" ? "Este convite expirou." : invite.status === "revoked" ? "Este convite foi revogado." : "Este convite já foi utilizado."} Peça um novo convite se precisar.</Notice>
        ) : (
          <>
            <div className="mx-auto w-fit rounded-full bg-brand-50 p-3 text-brand-600"><Users className="size-6" aria-hidden /></div>
            <h1 className="mt-3 text-lg font-semibold">{invite.inviter_name || "Um familiar"} convidou-o para a família {invite.family_name}</h1>
            <p className="mt-2 text-sm text-slate-600">Permissão: <strong>{ROLE_LABEL[invite.role]}</strong>. Convite para {invite.email}, válido até {formatDate(invite.expires_at)}.</p>
            {user ? (
              <div className="mt-5 space-y-2">
                <ActionButton className="w-full" action={acceptInvitation} input={{ token }}>Aceitar e entrar na família</ActionButton>
                <p className="text-xs text-slate-500">Sessão iniciada como {user.email}. O convite só funciona com o email convidado.</p>
              </div>
            ) : (
              <div className="mt-5 space-y-2">
                <Button asChild className="w-full"><Link href={`/signup?next=${encodeURIComponent(next)}`}>Criar conta e aceitar</Link></Button>
                <Button asChild variant="secondary" className="w-full"><Link href={`/login?next=${encodeURIComponent(next)}`}>Já tenho conta</Link></Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
