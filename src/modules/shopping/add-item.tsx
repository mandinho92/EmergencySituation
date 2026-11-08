"use client";

import { Plus } from "lucide-react";
import { ActionForm, FieldError, SubmitButton } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/form";
import { ALL_CATEGORIES, CATEGORY_LABEL, PRIORITY_LABEL } from "@/i18n/messages";
import { addShoppingItem } from "./actions";

export function AddShoppingItem() {
  return (
    <FormDialog title="Adicionar à lista de compras" description="Para artigos que não fazem parte do HOME KIT nem das mochilas." trigger={<Button size="sm"><Plus aria-hidden /> Adicionar</Button>}>
      {(close) => (
        <ActionForm action={addShoppingItem} onSuccess={close} className="space-y-4">
          <Field label="Artigo" htmlFor="s-name"><Input id="s-name" name="name" required maxLength={120} /><FieldError name="name" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Categoria" htmlFor="s-cat"><Select id="s-cat" name="category" defaultValue="other">{ALL_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}</Select></Field>
            <Field label="Prioridade" htmlFor="s-prio"><Select id="s-prio" name="priority" defaultValue="2">{Object.entries(PRIORITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
            <Field label="Quantidade" htmlFor="s-qty"><Input id="s-qty" name="quantity" type="number" step="any" min={0.01} defaultValue={1} required /></Field>
            <Field label="Unidade" htmlFor="s-unit"><Input id="s-unit" name="unit" defaultValue="un" maxLength={16} /></Field>
            <Field label="Preço unitário (€)" htmlFor="s-price" optional><Input id="s-price" name="estimated_unit_price_eur" type="number" step="0.01" min={0} /><FieldError name="estimated_unit_price_eur" /></Field>
            <Field label="Loja" htmlFor="s-store" optional><Input id="s-store" name="store" maxLength={60} /></Field>
          </div>
          <Field label="Link de compra" htmlFor="s-url" optional><Input id="s-url" name="url" type="url" placeholder="https://" /><FieldError name="url" /></Field>
          <SubmitButton>Adicionar</SubmitButton>
        </ActionForm>
      )}
    </FormDialog>
  );
}
