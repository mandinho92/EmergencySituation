"use client";

import { Copy, Mail, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ActionButton, ActionForm, FieldError, SubmitButton } from "@/components/ui/action-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { Notice } from "@/components/ui/misc";
import { formatDate } from "@/i18n/format";
import { ROLE_DESCRIPTION, ROLE_LABEL } from "@/i18n/messages";
import { changeRole, inviteMember, removeAccount, revokeInvitation } from "./invite-actions";

type Role = keyof typeof ROLE_LABEL;

export function FamilySharing({
  accounts,
  invitations,
  currentUserId,
  isAdmin,
}: {
  accounts: Array<{ userId: string; name: string; role: Role; joinedAt: string }>;
  invitations: Array<{ id: string; email: string; role: Role; expiresAt: string; createdAt: string }>;
  currentUserId: string;
  isAdmin: boolean;
}) {
  const [link, setLink] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><div><CardTitle>Contas com acesso ({accounts.length})</CardTitle><CardDescription>A família é uma entidade partilhada: todos veem e atualizam o mesmo plano.</CardDescription></div></CardHeader>
        <CardContent>
          <ul className="divide-y divide-slate-100">
            {accounts.map((a) => (
              <li key={a.userId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium">{a.name}{a.userId === currentUserId && <span className="ml-1 text-sm font-normal text-slate-500">(você)</span>}</p>
                  <p className="text-xs text-slate-500">Desde {formatDate(a.joinedAt)}</p>
                </div>
                {isAdmin && a.userId !== currentUserId ? (
                  <div className="flex items-center gap-2">
                    <Select aria-label={`Permissão de ${a.name}`} defaultValue={a.role} className="h-9 w-40" onChange={async (e) => {
                      const r = await changeRole({ userId: a.userId, role: e.target.value });
                      if (r.ok) toast.success(r.message ?? "Permissão alterada."); else { toast.error(r.error); e.target.value = a.role; }
                    }}>
                      {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </Select>
                    <ActionButton size="icon" variant="ghost" aria-label={`Revogar acesso de ${a.name}`} action={removeAccount} input={{ userId: a.userId }} confirm={`Revogar o acesso de ${a.name} à família?`}><Trash2 aria-hidden /></ActionButton>
                  </div>
                ) : (
                  <Badge tone={a.role === "admin" ? "brand" : "neutral"}><ShieldCheck aria-hidden />{ROLE_LABEL[a.role]}</Badge>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader><div><CardTitle className="flex items-center gap-2"><UserPlus className="size-4 text-brand-600" aria-hidden />Convidar familiar</CardTitle><CardDescription>O convite só pode ser aceite com o email indicado e expira em 7 dias.</CardDescription></div></CardHeader>
          <CardContent>
            <ActionForm action={inviteMember} resetOnSuccess successMessage={null} onSuccess={(r) => {
              const d = r.ok ? (r.data as { url: string; emailed: boolean }) : null;
              if (d) { setLink(d.url); toast.success(d.emailed ? "Convite enviado por email." : "Convite criado."); }
            }} className="grid gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
              <Field label="Email" htmlFor="invite-email"><Input id="invite-email" name="email" type="email" required placeholder="familiar@exemplo.pt" /><FieldError name="email" /></Field>
              <Field label="Permissão" htmlFor="invite-role">
                <Select id="invite-role" name="role" defaultValue="editor">{Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
              </Field>
              <SubmitButton pendingLabel="A enviar…"><Mail aria-hidden /> Convidar</SubmitButton>
            </ActionForm>
            {link && (
              <Notice tone="success" className="mt-4" title="Link do convite">
                <p className="mb-2">Se o email não chegar, partilhe este link apenas com a pessoa convidada (por exemplo, por mensagem). Por segurança, só é mostrado agora.</p>
                <div className="flex gap-2">
                  <Input readOnly value={link} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} aria-label="Link do convite" />
                  <button type="button" className="rounded-lg border border-ready-100 bg-white px-3" onClick={() => navigator.clipboard.writeText(link).then(() => toast.success("Link copiado."))} aria-label="Copiar link"><Copy className="size-4" /></button>
                </div>
              </Notice>
            )}
            <dl className="mt-5 grid gap-2 text-sm sm:grid-cols-2">
              {Object.entries(ROLE_LABEL).map(([k, v]) => <div key={k}><dt className="font-medium">{v}</dt><dd className="text-slate-500">{ROLE_DESCRIPTION[k as Role]}</dd></div>)}
            </dl>
          </CardContent>
        </Card>
      )}

      {isAdmin && invitations.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Convites pendentes</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y divide-slate-100">
              {invitations.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div><p className="font-medium">{i.email}</p><p className="text-xs text-slate-500">{ROLE_LABEL[i.role]} · expira {formatDate(i.expiresAt)}</p></div>
                  <ActionButton size="sm" variant="ghost" action={revokeInvitation} input={{ id: i.id }} confirm="Revogar este convite?">Revogar</ActionButton>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
