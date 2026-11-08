"use client";

import { useState } from "react";
import { ActionForm, FieldError, SubmitButton } from "@/components/ui/action-form";
import { CheckboxField, Field, Input, Select, Textarea } from "@/components/ui/form";
import { MEMBER_CATEGORY_LABEL } from "@/i18n/messages";
import type { MemberRow } from "@/modules/preparedness/load";
import { saveMember } from "./actions";

export function MemberForm({ member, adults, onDone }: { member?: MemberRow; adults: Array<{ id: string; display_name: string }>; onDone?: () => void }) {
  const [category, setCategory] = useState<MemberRow["category"]>(member?.category ?? "adult");
  const isChild = category === "child" || category === "baby";
  return (
    <ActionForm action={saveMember} extra={{ id: member?.id ?? "" }} onSuccess={onDone} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome ou identificação" htmlFor="display_name" hint="Pode usar apenas uma identificação (ex.: “Avó”).">
          <Input id="display_name" name="display_name" required maxLength={60} defaultValue={member?.display_name} />
          <FieldError name="display_name" />
        </Field>
        <Field label="Categoria" htmlFor="category">
          <Select id="category" name="category" value={category} onChange={(e) => setCategory(e.target.value as MemberRow["category"])}>
            {Object.entries(MEMBER_CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
        <Field label={isChild ? "Idade (anos)" : "Idade"} htmlFor="age_years" optional hint={isChild ? "Ajusta alimentação, fraldas e a mochila infantil." : undefined}>
          <Input id="age_years" name="age_years" type="number" inputMode="numeric" min={0} max={isChild ? 17 : 120} defaultValue={member?.age_years ?? ""} />
          <FieldError name="age_years" />
        </Field>
        {isChild && (
          <Field label="Adulto responsável em emergência" htmlFor="responsible_member_id" optional hint="Os artigos de bebés e crianças pequenas vão na mochila deste adulto.">
            <Select id="responsible_member_id" name="responsible_member_id" defaultValue={member?.responsible_member_id ?? ""}>
              <option value="">— Escolher —</option>
              {adults.filter((a) => a.id !== member?.id).map((a) => <option key={a.id} value={a.id}>{a.display_name}</option>)}
            </Select>
          </Field>
        )}
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-medium text-slate-800">Necessidades</legend>
        <CheckboxField name="reduced_mobility" label="Mobilidade reduzida" description="Adiciona um plano de apoio à saída e reduz o peso da mochila." defaultChecked={member?.reduced_mobility} />
        {isChild && <CheckboxField name="uses_diapers" label="Usa fraldas" defaultChecked={member?.uses_diapers ?? category === "baby"} />}
      </fieldset>

      {category === "baby" && (
        <Field label="Alimentação infantil" htmlFor="infant_feeding" optional>
          <Select id="infant_feeding" name="infant_feeding" defaultValue={member?.infant_feeding ?? ""}>
            <option value="">— Não indicado —</option>
            <option value="formula">Leite infantil (fórmula)</option>
            <option value="breastfeeding">Amamentação exclusiva</option>
            <option value="baby_food">Papas e boiões</option>
            <option value="mixed">Misto</option>
          </Select>
        </Field>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Necessidades alimentares" htmlFor="dietary_needs" optional hint="Ex.: vegetariano, sem glúten. Adiciona uma reserva adaptada.">
          <Input id="dietary_needs" name="dietary_needs" maxLength={300} defaultValue={member?.dietary_needs ?? ""} />
        </Field>
        <Field label="Equipamento especial" htmlFor="special_equipment" optional hint="Ex.: cadeira de rodas, concentrador de oxigénio.">
          <Input id="special_equipment" name="special_equipment" maxLength={300} defaultValue={member?.special_equipment ?? ""} />
        </Field>
      </div>

      {isChild && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Roupa específica" htmlFor="clothing_notes" optional>
            <Input id="clothing_notes" name="clothing_notes" maxLength={300} defaultValue={member?.clothing_notes ?? ""} placeholder="Tamanhos, roupa de inverno…" />
          </Field>
          <Field label="Equipamento de transporte" htmlFor="transport_equipment" optional>
            <Input id="transport_equipment" name="transport_equipment" maxLength={200} defaultValue={member?.transport_equipment ?? ""} placeholder="Marsúpio, carrinho, cadeira auto…" />
          </Field>
          <Field label="Objetos de conforto" htmlFor="comfort_items" optional className="sm:col-span-2">
            <Textarea id="comfort_items" name="comfort_items" maxLength={200} defaultValue={member?.comfort_items ?? ""} placeholder="Peluche, livro, chupeta…" />
          </Field>
        </div>
      )}

      <p className="text-xs text-slate-500">Alergias, medicação e necessidades de saúde são guardadas à parte, só com o seu consentimento — use “Dados de saúde” depois de guardar.</p>
      <SubmitButton className="w-full sm:w-auto">{member ? "Guardar alterações" : "Adicionar membro"}</SubmitButton>
    </ActionForm>
  );
}
