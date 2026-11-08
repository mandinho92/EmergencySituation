"use client";

import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { ActionButton, ActionForm, FieldError, SubmitButton } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/dialog";
import { CheckboxField, Field, Input, Select, Textarea } from "@/components/ui/form";
import { CHANNEL_LABEL } from "@/i18n/messages";
import { deleteContact, saveChildResponsible, saveCommunicationPlan, saveContact } from "./actions";

export interface ContactRow { id: string; name: string; relationship: string | null; phone: string | null; phone_alt: string | null; email: string | null; region: string | null; is_out_of_region: boolean; notes: string | null }

export function ContactDialog({ contact }: { contact?: ContactRow }) {
  return (
    <FormDialog title={contact ? contact.name : "Novo contacto de emergência"} trigger={contact ? <Button size="icon" variant="ghost" aria-label={`Editar ${contact.name}`}><Pencil aria-hidden /></Button> : <Button size="sm"><Plus aria-hidden /> Contacto</Button>}>
      {(close) => (
        <ActionForm action={saveContact} extra={{ id: contact?.id ?? "" }} onSuccess={close} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome" htmlFor="c-name"><Input id="c-name" name="name" required maxLength={80} defaultValue={contact?.name} /><FieldError name="name" /></Field>
            <Field label="Relação" htmlFor="c-rel" optional><Input id="c-rel" name="relationship" maxLength={60} defaultValue={contact?.relationship ?? ""} placeholder="Irmã, vizinho, escola…" /></Field>
            <Field label="Telefone" htmlFor="c-phone"><Input id="c-phone" name="phone" type="tel" defaultValue={contact?.phone ?? ""} autoComplete="tel" /><FieldError name="phone" /></Field>
            <Field label="Telefone alternativo" htmlFor="c-phone2" optional><Input id="c-phone2" name="phone_alt" type="tel" defaultValue={contact?.phone_alt ?? ""} /><FieldError name="phone_alt" /></Field>
            <Field label="Email" htmlFor="c-email" optional><Input id="c-email" name="email" type="email" defaultValue={contact?.email ?? ""} /><FieldError name="email" /></Field>
            <Field label="Região onde vive" htmlFor="c-region" optional><Input id="c-region" name="region" maxLength={80} defaultValue={contact?.region ?? ""} /></Field>
          </div>
          <CheckboxField name="is_out_of_region" label="Vive noutra região" description="Pessoa de confiança fora da zona de risco, que centraliza notícias de todos." defaultChecked={contact?.is_out_of_region} />
          <Field label="Notas" htmlFor="c-notes" optional><Textarea id="c-notes" name="notes" maxLength={300} defaultValue={contact?.notes ?? ""} /></Field>
          <div className="flex gap-2"><SubmitButton>Guardar</SubmitButton>{contact && <ActionButton variant="ghost" action={deleteContact} input={{ id: contact.id }} confirm="Remover este contacto?" successMessage="Removido." onDone={close}>Remover</ActionButton>}</div>
        </ActionForm>
      )}
    </FormDialog>
  );
}

export function CommunicationPlanForm({ plan, contacts, meetingPoints }: {
  plan: { primary_contact_id: string | null; secondary_contact_id: string | null; out_of_region_contact_id: string | null; channels: string[]; call_order: string | null; no_internet_plan: string | null; calls_fail_plan: string | null; phones_down_meeting_point_id: string | null; pmr446_channel: string | null };
  contacts: Array<{ id: string; name: string; is_out_of_region: boolean }>;
  meetingPoints: Array<{ id: string; name: string }>;
}) {
  const options = (<><option value="">— Escolher —</option>{contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</>);
  return (
    <ActionForm action={saveCommunicationPlan} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Contacto principal" htmlFor="cp-primary"><Select id="cp-primary" name="primary_contact_id" defaultValue={plan.primary_contact_id ?? ""}>{options}</Select></Field>
        <Field label="Contacto alternativo" htmlFor="cp-secondary"><Select id="cp-secondary" name="secondary_contact_id" defaultValue={plan.secondary_contact_id ?? ""}>{options}</Select></Field>
        <Field label="Contacto fora da região" htmlFor="cp-out" hint="Todos informam esta pessoa de onde estão."><Select id="cp-out" name="out_of_region_contact_id" defaultValue={plan.out_of_region_contact_id ?? ""}>{options}</Select></Field>
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Canais a usar, por ordem de preferência</legend>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{Object.entries(CHANNEL_LABEL).map(([k, v]) => <CheckboxField key={k} name="channels[]" value={k} label={v} defaultChecked={plan.channels.includes(k)} />)}</div>
      </fieldset>
      <Field label="Quem contacta quem" htmlFor="cp-order" optional hint="Ex.: cada pessoa envia SMS ao contacto fora da região; a mãe liga à escola."><Textarea id="cp-order" name="call_order" maxLength={1000} defaultValue={plan.call_order ?? ""} /></Field>
      <Field label="Como comunicar sem Internet" htmlFor="cp-noint" optional><Textarea id="cp-noint" name="no_internet_plan" maxLength={1000} defaultValue={plan.no_internet_plan ?? ""} placeholder="Usar SMS e chamadas curtas; ouvir a rádio às horas certas…" /></Field>
      <Field label="O que fazer quando as chamadas não funcionam" htmlFor="cp-fail" optional><Textarea id="cp-fail" name="calls_fail_plan" maxLength={1000} defaultValue={plan.calls_fail_plan ?? ""} placeholder="Ir para o ponto de encontro à hora certa; esperar 30 minutos; deixar nota…" /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Onde se encontram se os telemóveis falharem" htmlFor="cp-mp"><Select id="cp-mp" name="phones_down_meeting_point_id" defaultValue={plan.phones_down_meeting_point_id ?? ""}><option value="">— Escolher —</option>{meetingPoints.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select></Field>
        <Field label="Canal PMR446 combinado" htmlFor="cp-pmr" optional><Input id="cp-pmr" name="pmr446_channel" maxLength={40} defaultValue={plan.pmr446_channel ?? ""} placeholder="Canal 3, subcanal 7" /></Field>
      </div>
      <SubmitButton>Guardar plano</SubmitButton>
    </ActionForm>
  );
}

export function ChildResponsibleSelect({ childId, current, adults }: { childId: string; current: string | null; adults: Array<{ id: string; display_name: string }> }) {
  return (
    <Select aria-label="Responsável" defaultValue={current ?? ""} className="h-9 w-48" onChange={async (e) => {
      const r = await saveChildResponsible({ childId, responsibleId: e.target.value });
      if (r.ok) toast.success("Responsável atualizado."); else toast.error(r.error);
    }}>
      <option value="">— Escolher —</option>
      {adults.map((a) => <option key={a.id} value={a.id}>{a.display_name}</option>)}
    </Select>
  );
}
