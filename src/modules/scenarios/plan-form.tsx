"use client";

import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field, Select, Textarea } from "@/components/ui/form";
import { saveScenarioPlan } from "./actions";

export function ScenarioPlanForm({ scenario, meetingPointId, notes, meetingPoints }: { scenario: string; meetingPointId: string | null; notes: string | null; meetingPoints: Array<{ id: string; name: string }> }) {
  return (
    <ActionForm action={saveScenarioPlan} extra={{ scenario }} className="space-y-3">
      <Field label="Ponto de encontro para este cenário" htmlFor="sp-mp"><Select id="sp-mp" name="meeting_point_id" defaultValue={meetingPointId ?? ""}><option value="">— Usar o sugerido —</option>{meetingPoints.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select></Field>
      <Field label="Notas da família" htmlFor="sp-notes" optional><Textarea id="sp-notes" name="notes" maxLength={2000} defaultValue={notes ?? ""} placeholder="Ex.: a avó fica com a vizinha do 2.º; chave suplente no vaso." /></Field>
      <SubmitButton size="sm" variant="secondary">Guardar</SubmitButton>
    </ActionForm>
  );
}
