"use client";

import { ActionForm, FieldError, SubmitButton } from "@/components/ui/action-form";
import { CheckboxField, Field, Input, Select, Textarea } from "@/components/ui/form";
import { PET_SPECIES_LABEL } from "@/i18n/messages";
import type { PetRow } from "@/modules/preparedness/load";
import { savePet } from "./actions";

export function PetForm({ pet, onDone }: { pet?: PetRow; onDone?: () => void }) {
  return (
    <ActionForm action={savePet} extra={{ id: pet?.id ?? "" }} onSuccess={onDone} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome" htmlFor="pet-name"><Input id="pet-name" name="name" required maxLength={60} defaultValue={pet?.name} /><FieldError name="name" /></Field>
        <Field label="Espécie" htmlFor="species">
          <Select id="species" name="species" defaultValue={pet?.species ?? "dog"}>{Object.entries(PET_SPECIES_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
        </Field>
        <Field label="Quantidade" htmlFor="quantity"><Input id="quantity" name="quantity" type="number" min={1} max={50} defaultValue={pet?.quantity ?? 1} /></Field>
        <Field label="Peso aproximado (kg)" htmlFor="approx_weight_kg" optional hint="Usado para estimar água e ração.">
          <Input id="approx_weight_kg" name="approx_weight_kg" type="number" step="0.1" min={0} max={150} defaultValue={pet?.approx_weight_kg ?? ""} /><FieldError name="approx_weight_kg" />
        </Field>
      </div>
      <Field label="Alimentação" htmlFor="food_notes" optional><Input id="food_notes" name="food_notes" maxLength={300} defaultValue={pet?.food_notes ?? ""} placeholder="Marca, dieta especial…" /></Field>
      <Field label="Medicação" htmlFor="pet-medication" optional><Input id="pet-medication" name="medication" maxLength={300} defaultValue={pet?.medication ?? ""} /></Field>
      <Field label="Documentação e identificação" htmlFor="documents_notes" optional><Textarea id="documents_notes" name="documents_notes" maxLength={300} defaultValue={pet?.documents_notes ?? ""} placeholder="Boletim sanitário, n.º de microchip…" /></Field>
      <div className="grid gap-2 sm:grid-cols-2">
        <CheckboxField name="has_carrier" label="Tem transportadora" defaultChecked={pet?.has_carrier} />
        <CheckboxField name="has_microchip" label="Tem microchip registado" defaultChecked={pet?.has_microchip} />
      </div>
      <SubmitButton>{pet ? "Guardar" : "Adicionar animal"}</SubmitButton>
    </ActionForm>
  );
}
