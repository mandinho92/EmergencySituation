"use client";

import { Plus } from "lucide-react";
import { ActionButton, ActionForm, FieldError, SubmitButton } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/dialog";
import { CheckboxField, Field, Input, Select, Textarea } from "@/components/ui/form";
import { CATEGORY_LABEL, HOME_KIT_CATEGORIES, PRIORITY_LABEL } from "@/i18n/messages";
import { EditTrigger, type KitLineView } from "@/modules/kits/kit-item-row";
import { addCustomHomeItem, deleteHomeItem, editHomeItem } from "./actions";

export function HomeItemEditDialog({ line, computedRequired, products }: { line: KitLineView; computedRequired: number | null; products: Array<{ id: string; name: string }> }) {
  return (
    <FormDialog title={line.name} description={line.rationale ?? undefined} trigger={<EditTrigger />}>
      {(close) => (
        <ActionForm action={editHomeItem} extra={{ key: line.key ?? "", rowId: line.rowId ?? "" }} onSuccess={close} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={`Quantidade necessária (${line.unit})`} htmlFor="quantity_required" hint={computedRequired != null ? `Calculado: ${computedRequired} ${line.unit}` : undefined}>
              <Input id="quantity_required" name="quantity_required" type="number" step="any" min={0} defaultValue={line.required} />
              <FieldError name="quantity_required" />
            </Field>
            <Field label={`Quantidade existente (${line.unit})`} htmlFor="quantity_have"><Input id="quantity_have" name="quantity_have" type="number" step="any" min={0} defaultValue={line.have} /></Field>
            <Field label="Validade" htmlFor="expires_on" optional><Input id="expires_on" name="expires_on" type="date" defaultValue={line.expiresOn ?? ""} /></Field>
            <Field label="Local de armazenamento" htmlFor="storage_location" optional><Input id="storage_location" name="storage_location" maxLength={120} defaultValue={line.storageLocation ?? ""} placeholder="Despensa, garagem…" /></Field>
          </div>
          {products.length > 0 && (
            <Field label="Produto associado" htmlFor="product_id" optional>
              <Select id="product_id" name="product_id" defaultValue=""><option value="">— Nenhum —</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
            </Field>
          )}
          <Field label="Notas" htmlFor="notes" optional><Textarea id="notes" name="notes" maxLength={500} /></Field>
          {!line.isCustom && <CheckboxField name="reset_quantity" label="Repor a quantidade calculada" description="Volta a seguir o cálculo automático quando a família mudar." />}
          <CheckboxField name="is_excluded" label="Não preciso deste artigo" description="Fica fora das contas e da lista de compras." defaultChecked={line.excluded} />
          <div className="flex flex-wrap gap-2">
            <SubmitButton>Guardar</SubmitButton>
            {line.isCustom && line.rowId && <ActionButton variant="ghost" action={deleteHomeItem} input={{ rowId: line.rowId }} confirm="Remover este artigo?" successMessage="Artigo removido." onDone={close}>Remover</ActionButton>}
          </div>
        </ActionForm>
      )}
    </FormDialog>
  );
}

export function AddCustomHomeItem() {
  return (
    <FormDialog title="Adicionar artigo ao HOME KIT" trigger={<Button size="sm" variant="secondary"><Plus aria-hidden /> Artigo personalizado</Button>}>
      {(close) => (
        <ActionForm action={addCustomHomeItem} onSuccess={close} className="space-y-4">
          <Field label="Nome" htmlFor="custom-name"><Input id="custom-name" name="name" required maxLength={120} /><FieldError name="name" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Categoria" htmlFor="custom-category"><Select id="custom-category" name="category" defaultValue="tools">{HOME_KIT_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}</Select></Field>
            <Field label="Prioridade" htmlFor="custom-priority"><Select id="custom-priority" name="priority" defaultValue="2">{Object.entries(PRIORITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
            <Field label="Quantidade necessária" htmlFor="custom-qty"><Input id="custom-qty" name="quantity_required" type="number" step="any" min={0.01} required defaultValue={1} /><FieldError name="quantity_required" /></Field>
            <Field label="Unidade" htmlFor="custom-unit"><Input id="custom-unit" name="unit" maxLength={16} defaultValue="un" /></Field>
          </div>
          <Field label="Local de armazenamento" htmlFor="custom-location" optional><Input id="custom-location" name="storage_location" maxLength={120} /></Field>
          <SubmitButton>Adicionar</SubmitButton>
        </ActionForm>
      )}
    </FormDialog>
  );
}
