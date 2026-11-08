"use client";

import { useMemo, useState } from "react";
import { ActionForm, FieldError, SubmitButton } from "@/components/ui/action-form";
import { CheckboxField, Field, Input, Select } from "@/components/ui/form";
import { Notice } from "@/components/ui/misc";
import { DISTRICTS, RISKS, defaultRisksFor, highlightedRisksFor } from "@/domain/locations/portugal";
import { DWELLING_LABEL } from "@/i18n/messages";
import type { Database } from "@/lib/supabase/database.types";
import { saveHousehold } from "./actions";

type Household = Database["public"]["Tables"]["household_profiles"]["Row"];

const FEATURES: Array<[keyof Household, string, string?]> = [
  ["has_gas", "Gás (canalizado ou garrafa)", "Permite cozinhar sem eletricidade"],
  ["has_electric_stove", "Fogão/placa elétrica"],
  ["has_fireplace", "Lareira ou recuperador"],
  ["has_garage", "Garagem"],
  ["has_garden", "Jardim ou terreno"],
  ["has_storage_room", "Arrecadação"],
  ["has_solar_panels", "Painéis solares"],
  ["has_home_battery", "Bateria doméstica"],
  ["has_generator", "Gerador"],
  ["has_well", "Poço ou fonte própria de água"],
];

export function HouseholdForm({ household, onDone, submitLabel = "Guardar" }: { household: Household; onDone?: () => void; submitLabel?: string }) {
  const [district, setDistrict] = useState(household.district ?? "");
  const [mode, setMode] = useState<"default" | "custom">(household.selected_risks ? "custom" : "default");
  const defaults = useMemo(() => defaultRisksFor(district || null), [district]);
  const highlighted = useMemo(() => new Set(highlightedRisksFor(district || null)), [district]);
  const selected = new Set(mode === "custom" ? household.selected_risks ?? defaults : defaults);

  return (
    <ActionForm action={saveHousehold} onSuccess={onDone} className="space-y-6">
      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Habitação</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Tipo de habitação" htmlFor="dwelling_type">
            <Select id="dwelling_type" name="dwelling_type" defaultValue={household.dwelling_type ?? ""}>
              <option value="">— Escolher —</option>
              {Object.entries(DWELLING_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <Field label="Número de pisos" htmlFor="floors" optional>
            <Input id="floors" name="floors" type="number" min={0} max={200} defaultValue={household.floors ?? ""} />
            <FieldError name="floors" />
          </Field>
          <Field label="Espaço de armazenamento" htmlFor="storage_space" optional>
            <Select id="storage_space" name="storage_space" defaultValue={household.storage_space ?? ""}>
              <option value="">— Não indicado —</option>
              <option value="small">Pouco (armário)</option>
              <option value="medium">Médio (despensa)</option>
              <option value="large">Amplo (arrecadação/garagem)</option>
            </Select>
          </Field>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {FEATURES.map(([key, label, desc]) => <CheckboxField key={key} name={key} label={label} description={desc} defaultChecked={!!household[key]} />)}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Localização</h2>
        <p className="text-sm text-slate-500">Usada apenas para adaptar os riscos. Privada à sua família. A morada exata é opcional.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="País" htmlFor="country"><Input id="country" value="Portugal" disabled readOnly /></Field>
          <Field label="Distrito / Região autónoma" htmlFor="district">
            <Select id="district" name="district" value={district} onChange={(e) => setDistrict(e.target.value)}>
              <option value="">— Escolher —</option>
              {DISTRICTS.map((d) => <option key={d.slug} value={d.slug}>{d.name}</option>)}
            </Select>
          </Field>
          <Field label="Município" htmlFor="municipality" optional><Input id="municipality" name="municipality" maxLength={80} defaultValue={household.municipality ?? ""} /></Field>
          <Field label="Freguesia" htmlFor="parish" optional><Input id="parish" name="parish" maxLength={120} defaultValue={household.parish ?? ""} /></Field>
          <Field label="Morada" htmlFor="address_line" optional hint="Não é necessária para nenhum cálculo." className="sm:col-span-2">
            <Input id="address_line" name="address_line" maxLength={200} defaultValue={household.address_line ?? ""} autoComplete="street-address" />
          </Field>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Riscos a considerar</h2>
        <Notice>
          Sugestão indicativa com base no distrito — não é uma avaliação oficial. Confirme os riscos da sua zona junto do Serviço Municipal de Proteção Civil e da ANEPC.
        </Notice>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="radio" name="risks_mode" value="default" checked={mode === "default"} onChange={() => setMode("default")} className="accent-brand-700" /> Usar a sugestão</label>
          <label className="flex items-center gap-2"><input type="radio" name="risks_mode" value="custom" checked={mode === "custom"} onChange={() => setMode("custom")} className="accent-brand-700" /> Escolher manualmente</label>
        </div>
        <div className="grid gap-2 sm:grid-cols-2" key={`${mode}-${district}`}>
          {RISKS.map((r) => (
            <CheckboxField key={r.key} name="risks[]" value={r.key} label={`${r.label}${highlighted.has(r.key) ? " · relevante na região" : ""}`} description={r.description} defaultChecked={selected.has(r.key)} disabled={mode === "default"} />
          ))}
        </div>
      </section>

      <SubmitButton>{submitLabel}</SubmitButton>
    </ActionForm>
  );
}
