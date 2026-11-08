"use client";

import { Lock } from "lucide-react";
import { ActionButton, ActionForm, FieldError, SubmitButton } from "@/components/ui/action-form";
import { CheckboxField, Field, Textarea } from "@/components/ui/form";
import { deleteHealth, saveHealth } from "./actions";

export interface HealthRow {
  member_profile_id: string;
  allergies: string | null;
  medication: string | null;
  health_needs: string | null;
  include_on_card: boolean;
  consent_at: string;
}

export function HealthForm({ memberId, health, onDone }: { memberId: string; health: HealthRow | null; onDone?: () => void }) {
  return (
    <ActionForm action={saveHealth} extra={{ member_profile_id: memberId }} onSuccess={onDone} className="space-y-4">
      <div className="flex gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
        <Lock className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden />
        <p>Dados opcionais e privados. Não são visíveis para quem tem permissão de “Visualização”, nunca aparecem em convites ou notificações e não são usados nos cálculos. Indique apenas o essencial para uma emergência.</p>
      </div>
      <Field label="Alergias relevantes" htmlFor="allergies" optional>
        <Textarea id="allergies" name="allergies" maxLength={500} defaultValue={health?.allergies ?? ""} />
      </Field>
      <Field label="Medicação habitual" htmlFor="medication" optional>
        <Textarea id="medication" name="medication" maxLength={500} defaultValue={health?.medication ?? ""} />
      </Field>
      <Field label="Necessidades de saúde" htmlFor="health_needs" optional>
        <Textarea id="health_needs" name="health_needs" maxLength={500} defaultValue={health?.health_needs ?? ""} />
      </Field>
      <CheckboxField name="include_on_card" label="Incluir no cartão de emergência impresso" description="Útil para socorristas. Desative se o cartão puder ser visto por terceiros." defaultChecked={health?.include_on_card} />
      <CheckboxField name="consent" label="Consinto no tratamento destes dados de saúde" description="Consentimento explícito (RGPD, art. 9.º). Pode retirá-lo apagando estes dados." defaultChecked={!!health} />
      <FieldError name="consent" />
      <div className="flex flex-wrap gap-2">
        <SubmitButton>Guardar</SubmitButton>
        {health && <ActionButton variant="ghost" action={deleteHealth} input={{ member_profile_id: memberId }} confirm="Apagar os dados de saúde deste membro?" successMessage="Dados apagados." onDone={onDone}>Apagar dados de saúde</ActionButton>}
      </div>
    </ActionForm>
  );
}
