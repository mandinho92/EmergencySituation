"use client";

import { Plus } from "lucide-react";
import { ActionButton, ActionForm, FieldError, SubmitButton } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/dialog";
import { CheckboxField, Field, Input, Select, Textarea } from "@/components/ui/form";
import { BAG_CATEGORIES, CATEGORY_LABEL, PRIORITY_LABEL } from "@/i18n/messages";
import { EditTrigger, type KitLineView } from "@/modules/kits/kit-item-row";
import { addCustomBagItem, deleteBagItem, editBagItem, saveBag } from "./actions";

export function BagItemEditDialog({ bagId, line, computedRequired }: { bagId: string; line: KitLineView; computedRequired: number | null }) {
  return (
    <FormDialog title={line.name} description={line.rationale ?? undefined} trigger={<EditTrigger />}>
      {(close) => (
        <ActionForm action={editBagItem} extra={{ bagId, key: line.key ?? "", rowId: line.rowId ?? "" }} onSuccess={close} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={`Quantidade (${line.unit})`} htmlFor="b-qty" hint={computedRequired != null ? `Sugerido: ${computedRequired}` : undefined}><Input id="b-qty" name="quantity_required" type="number" step="any" min={0} defaultValue={line.required} /></Field>
            <Field label="Peso por unidade (g)" htmlFor="b-weight" optional><Input id="b-weight" name="unit_weight_g" type="number" min={0} defaultValue={line.unitWeightGrams ?? ""} /></Field>
            <Field label="Validade" htmlFor="b-exp" optional hint="Gera um alerta 30 dias antes."><Input id="b-exp" name="expires_on" type="date" defaultValue={line.expiresOn ?? ""} /></Field>
          </div>
          <Field label="Notas" htmlFor="b-notes" optional><Textarea id="b-notes" name="notes" maxLength={500} /></Field>
          {!line.isCustom && <CheckboxField name="reset_quantity" label="Repor a quantidade sugerida" />}
          <CheckboxField name="is_excluded" label="Não incluir nesta mochila" defaultChecked={line.excluded} />
          <div className="flex gap-2">
            <SubmitButton>Guardar</SubmitButton>
            {line.isCustom && line.rowId && <ActionButton variant="ghost" action={deleteBagItem} input={{ rowId: line.rowId }} confirm="Remover este artigo?" successMessage="Artigo removido." onDone={close}>Remover</ActionButton>}
          </div>
        </ActionForm>
      )}
    </FormDialog>
  );
}

export function AddBagItem({ bagId }: { bagId: string }) {
  return (
    <FormDialog title="Adicionar artigo à mochila" trigger={<Button size="sm" variant="secondary"><Plus aria-hidden /> Artigo personalizado</Button>}>
      {(close) => (
        <ActionForm action={addCustomBagItem} extra={{ bagId }} onSuccess={close} className="space-y-4">
          <Field label="Nome" htmlFor="bi-name"><Input id="bi-name" name="name" required maxLength={120} /><FieldError name="name" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Categoria" htmlFor="bi-cat"><Select id="bi-cat" name="category" defaultValue="protection">{BAG_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}</Select></Field>
            <Field label="Prioridade" htmlFor="bi-prio"><Select id="bi-prio" name="priority" defaultValue="2">{Object.entries(PRIORITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
            <Field label="Quantidade" htmlFor="bi-qty"><Input id="bi-qty" name="quantity_required" type="number" step="any" min={0.01} defaultValue={1} required /></Field>
            <Field label="Unidade" htmlFor="bi-unit"><Input id="bi-unit" name="unit" defaultValue="un" maxLength={16} /></Field>
            <Field label="Peso por unidade (g)" htmlFor="bi-w" optional><Input id="bi-w" name="unit_weight_g" type="number" min={0} /></Field>
            <Field label="Validade" htmlFor="bi-exp" optional><Input id="bi-exp" name="expires_on" type="date" /></Field>
          </div>
          <SubmitButton>Adicionar</SubmitButton>
        </ActionForm>
      )}
    </FormDialog>
  );
}

export function BagSettingsDialog({ bag, members }: { bag: { id: string; name: string; owner_member_id: string | null; capacity_liters: number | null; notes: string | null; kind: string }; members: Array<{ id: string; display_name: string }> }) {
  return (
    <FormDialog title="Configurar mochila" trigger={<Button size="sm" variant="secondary">Configurar</Button>}>
      {(close) => (
        <ActionForm action={saveBag} extra={{ id: bag.id }} onSuccess={close} className="space-y-4">
          <Field label="Nome" htmlFor="bag-name"><Input id="bag-name" name="name" defaultValue={bag.name} maxLength={60} required /></Field>
          {bag.kind !== "pet" && (
            <Field label="Responsável" htmlFor="bag-owner"><Select id="bag-owner" name="owner_member_id" defaultValue={bag.owner_member_id ?? ""}><option value="">— Sem responsável —</option>{members.map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)}</Select></Field>
          )}
          <Field label="Capacidade (litros)" htmlFor="bag-cap" optional hint="Adulto: 30–40 L é habitual. Criança: 10–15 L."><Input id="bag-cap" name="capacity_liters" type="number" min={5} max={120} defaultValue={bag.capacity_liters ?? ""} /></Field>
          <Field label="Notas" htmlFor="bag-notes" optional><Textarea id="bag-notes" name="notes" defaultValue={bag.notes ?? ""} maxLength={500} placeholder="Onde está guardada…" /></Field>
          <SubmitButton>Guardar</SubmitButton>
        </ActionForm>
      )}
    </FormDialog>
  );
}
