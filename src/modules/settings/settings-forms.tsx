"use client";

import { ActionButton, ActionForm, FieldError, SubmitButton } from "@/components/ui/action-form";
import { Field, Input } from "@/components/ui/form";
import { signOut } from "@/modules/auth/actions";
import { clearPrivateCache } from "@/modules/offline/sw-registration";
import { deleteAccount, updateProfile } from "./actions";

export function ProfileForm({ name }: { name: string }) {
  return (
    <ActionForm action={updateProfile} className="space-y-3">
      <Field label="Nome" htmlFor="full_name"><Input id="full_name" name="full_name" defaultValue={name} required maxLength={120} /><FieldError name="full_name" /></Field>
      <SubmitButton size="sm">Guardar</SubmitButton>
    </ActionForm>
  );
}

export function SignOutEverywhere() {
  return (
    <ActionButton variant="secondary" size="sm" action={async (i) => { await clearPrivateCache(); return signOut(i); }} input={{ scope: "global" }} confirm="Terminar a sessão em todos os dispositivos?">
      Terminar sessão em todos os dispositivos
    </ActionButton>
  );
}

export function DeleteAccountForm() {
  return (
    <ActionForm action={async (i) => { const r = await deleteAccount(i); if (r.ok) await clearPrivateCache(); return r; }} successMessage={null} className="space-y-3">
      <Field label="Escreva ELIMINAR para confirmar" htmlFor="confirm"><Input id="confirm" name="confirm" autoComplete="off" required /><FieldError name="confirm" /></Field>
      <SubmitButton variant="danger" size="sm">Eliminar a minha conta</SubmitButton>
    </ActionForm>
  );
}
