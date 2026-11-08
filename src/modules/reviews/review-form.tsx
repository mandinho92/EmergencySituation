"use client";

import { ActionForm, FieldError, SubmitButton } from "@/components/ui/action-form";
import { CheckboxField, Field, Input } from "@/components/ui/form";
import { completeReview, createReminder } from "./actions";

export function ReviewForm({ id, checklist }: { id: string; checklist: ReadonlyArray<{ id: string; text: string }> }) {
  return (
    <ActionForm action={completeReview} extra={{ id }} className="space-y-3">
      <div className="grid gap-2">{checklist.map((c) => <CheckboxField key={c.id} name="items[]" value={c.id} label={c.text} />)}</div>
      <SubmitButton>Marcar revisão como concluída</SubmitButton>
    </ActionForm>
  );
}

export function ReminderForm() {
  return (
    <ActionForm action={createReminder} resetOnSuccess className="grid gap-3 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
      <Field label="Lembrete" htmlFor="r-title"><Input id="r-title" name="title" required maxLength={140} placeholder="Substituir a água de 2025" /><FieldError name="title" /></Field>
      <Field label="Data" htmlFor="r-due"><Input id="r-due" name="due_on" type="date" required /></Field>
      <SubmitButton variant="secondary">Adicionar</SubmitButton>
    </ActionForm>
  );
}
