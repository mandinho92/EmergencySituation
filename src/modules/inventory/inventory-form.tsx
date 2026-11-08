"use client";

import { Pencil, Plus } from "lucide-react";
import { ActionButton, ActionForm, FieldError, SubmitButton } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { ALL_CATEGORIES, CATEGORY_LABEL } from "@/i18n/messages";
import type { Database } from "@/lib/supabase/database.types";
import { deleteInventoryItem, saveInventoryItem } from "./actions";

type Row = Database["public"]["Tables"]["inventory_items"]["Row"];

export const CONDITION_LABEL = { ok: "Em bom estado", needs_recharge: "Precisa de carga", needs_maintenance: "Precisa de manutenção", damaged: "Danificado" } as const;

export function InventoryDialog({ item }: { item?: Row }) {
  return (
    <FormDialog
      title={item ? item.name : "Adicionar ao inventário"}
      description={item ? undefined : "Equipamento ou stock que não está numa lista do HOME KIT ou das mochilas (ex.: gerador, extintor extra, ferramentas)."}
      trigger={item ? <Button size="icon" variant="ghost" aria-label={`Editar ${item.name}`}><Pencil aria-hidden /></Button> : <Button size="sm"><Plus aria-hidden /> Adicionar</Button>}
    >
      {(close) => (
        <ActionForm action={saveInventoryItem} extra={{ id: item?.id ?? "" }} onSuccess={close} className="space-y-4">
          <Field label="Nome" htmlFor="inv-name"><Input id="inv-name" name="name" required maxLength={120} defaultValue={item?.name} /><FieldError name="name" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Categoria" htmlFor="inv-cat"><Select id="inv-cat" name="category" defaultValue={item?.category ?? "other"}>{ALL_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}</Select></Field>
            <Field label="Estado" htmlFor="inv-cond"><Select id="inv-cond" name="condition" defaultValue={item?.condition ?? "ok"}>{Object.entries(CONDITION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
            <Field label="Quantidade" htmlFor="inv-qty"><Input id="inv-qty" name="quantity" type="number" step="any" min={0} defaultValue={item?.quantity ?? 1} required /></Field>
            <Field label="Unidade" htmlFor="inv-unit"><Input id="inv-unit" name="unit" maxLength={16} defaultValue={item?.unit ?? "un"} /></Field>
            <Field label="Local de armazenamento" htmlFor="inv-loc" optional><Input id="inv-loc" name="storage_location" maxLength={120} defaultValue={item?.storage_location ?? ""} /></Field>
            <Field label="Data de aquisição" htmlFor="inv-acq" optional><Input id="inv-acq" name="acquired_on" type="date" defaultValue={item?.acquired_on ?? ""} /></Field>
            <Field label="Validade" htmlFor="inv-exp" optional><Input id="inv-exp" name="expires_on" type="date" defaultValue={item?.expires_on ?? ""} /></Field>
            <Field label="Verificar/recarregar a cada (dias)" htmlFor="inv-int" optional hint="Ex.: powerbanks 90 dias."><Input id="inv-int" name="maintenance_interval_days" type="number" min={7} max={1825} defaultValue={item?.maintenance_interval_days ?? ""} /></Field>
            <Field label="Última verificação" htmlFor="inv-last" optional><Input id="inv-last" name="last_maintained_on" type="date" defaultValue={item?.last_maintained_on ?? ""} /></Field>
          </div>
          <Field label="Notas" htmlFor="inv-notes" optional><Textarea id="inv-notes" name="notes" maxLength={500} defaultValue={item?.notes ?? ""} /></Field>
          <div className="flex gap-2">
            <SubmitButton>Guardar</SubmitButton>
            {item && <ActionButton variant="ghost" action={deleteInventoryItem} input={{ id: item.id }} confirm="Remover este artigo do inventário?" successMessage="Removido." onDone={close}>Remover</ActionButton>}
          </div>
        </ActionForm>
      )}
    </FormDialog>
  );
}
