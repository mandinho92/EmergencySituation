"use client";

import { ActionForm, FieldError, SubmitButton } from "@/components/ui/action-form";
import { Field, Input } from "@/components/ui/form";
import { createFamily } from "./actions";

export function CreateFamilyForm({ defaultName }: { defaultName: string }) {
  return (
    <ActionForm action={createFamily} successMessage={null} className="space-y-4">
      <Field label="Nome da família" htmlFor="family-name" hint="Visível apenas para os membros que convidar.">
        <Input id="family-name" name="name" required maxLength={80} defaultValue={defaultName} />
        <FieldError name="name" />
      </Field>
      <SubmitButton className="w-full" pendingLabel="A criar…">Criar a família</SubmitButton>
    </ActionForm>
  );
}
