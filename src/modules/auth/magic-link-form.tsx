"use client";

import { Mail } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ActionForm, FieldError, SubmitButton } from "@/components/ui/action-form";
import { Field, Input } from "@/components/ui/form";
import { clearPrivateCache } from "@/modules/offline/sw-registration";
import { requestMagicLink, verifyEmailCode } from "./actions";

/**
 * The 6-digit code is only in the email when the project uses the custom templates in
 * supabase/templates (requires custom SMTP on Supabase's free tier). Enable it with
 * NEXT_PUBLIC_AUTH_EMAIL_CODE=true once those templates are active.
 */
const EMAIL_HAS_CODE = process.env.NEXT_PUBLIC_AUTH_EMAIL_CODE === "true";

export function MagicLinkForm({ mode, next, defaultEmail }: { mode: "signup" | "login"; next?: string; defaultEmail?: string }) {
  const [sentTo, setSentTo] = useState<string | null>(null);

  // Arriving at login/signup means no valid session: drop any cached private pages.
  useEffect(() => {
    void clearPrivateCache();
  }, []);

  if (sentTo) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col items-center text-center">
          <div className="rounded-full bg-ready-50 p-3 text-ready-700"><Mail className="size-6" aria-hidden /></div>
          <h1 className="mt-3 text-lg font-semibold">Verifique o seu email</h1>
          <p className="mt-1 text-sm text-slate-600">
            {mode === "signup" ? "Enviámos um email para" : "Se existir uma conta para"} <strong>{sentTo}</strong>{mode === "signup" ? "." : ", enviámos um email."} Abra o email e <strong>toque no botão/link</strong> para entrar — funciona em qualquer dispositivo.
          </p>
          <ul className="mt-3 space-y-1 text-left text-xs text-slate-500">
            <li>• O link é válido durante 1 hora e só funciona uma vez — use o email mais recente.</li>
            <li>• Não chegou? Veja a pasta de spam ou promoções e aguarde 1–2 minutos.</li>
          </ul>
        </div>
        {EMAIL_HAS_CODE && <ActionForm action={verifyEmailCode} extra={{ email: sentTo }} successMessage={null} className="space-y-3">
          <Field label="Código de 6 dígitos" htmlFor="code">
            <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required placeholder="000000" className="text-center text-lg tracking-[0.4em]" />
          </Field>
          <FieldError name="code" />
          <SubmitButton className="w-full" pendingLabel="A verificar…">Entrar com o código</SubmitButton>
        </ActionForm>}
        <button type="button" onClick={() => setSentTo(null)} className="w-full text-center text-sm text-brand-600 hover:underline">Usar outro email ou reenviar</button>
      </div>
    );
  }

  return (
    <ActionForm
      action={requestMagicLink}
      extra={{ mode, next }}
      successMessage={null}
      onSuccess={(r) => setSentTo(r.ok ? ((r.data as { email: string } | undefined)?.email ?? null) : null)}
      className="space-y-4"
    >
      {mode === "signup" && (
        <Field label="Nome" htmlFor="name">
          <Input id="name" name="name" autoComplete="name" required maxLength={120} placeholder="O seu nome" />
          <FieldError name="name" />
        </Field>
      )}
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={defaultEmail} placeholder="nome@exemplo.pt" />
        <FieldError name="email" />
      </Field>
      {mode === "signup" && (
        <label className="flex items-start gap-2 text-sm text-slate-600">
          <input type="checkbox" name="consent" required className="mt-0.5 size-4 accent-brand-700" />
          <span>Aceito os <Link href="/terms" className="text-brand-600 underline" target="_blank">termos</Link> e a <Link href="/privacy" className="text-brand-600 underline" target="_blank">política de privacidade</Link>.</span>
        </label>
      )}
      <FieldError name="consent" />
      <SubmitButton className="w-full" pendingLabel="A enviar…">{mode === "signup" ? "Criar conta" : "Enviar link de acesso"}</SubmitButton>
    </ActionForm>
  );
}
