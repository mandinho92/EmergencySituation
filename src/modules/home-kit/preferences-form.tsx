"use client";

import { Settings2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/dialog";
import { ActionForm, FieldError, SubmitButton } from "@/components/ui/action-form";
import { CheckboxField, Field, Input } from "@/components/ui/form";
import { BUDGET_PRESETS } from "@/domain/budget/budget";
import { cn } from "@/lib/utils";
import { saveBudget, saveKitSettings } from "./actions";

const DURATIONS = [
  { days: 1, label: "24 horas" }, { days: 3, label: "72 horas" }, { days: 5, label: "5 dias" },
  { days: 7, label: "7 dias" }, { days: 10, label: "10 dias" }, { days: 14, label: "14 dias" },
];

export function KitSettingsForm({ targetDays, waterOverride, includeHygiene, hotClimate, onDone }: { targetDays: number; waterOverride: number | null; includeHygiene: boolean; hotClimate: boolean; onDone?: () => void }) {
  const preset = DURATIONS.some((d) => d.days === targetDays);
  const [days, setDays] = useState<number | "custom">(preset ? targetDays : "custom");
  return (
    <ActionForm action={saveKitSettings} onSuccess={onDone} className="space-y-4">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Durante quanto tempo quer conseguir ficar em casa sem abastecimento?</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-7">
          {DURATIONS.map((d) => (
            <button key={d.days} type="button" onClick={() => setDays(d.days)} aria-pressed={days === d.days} className={cn("rounded-lg border px-2 py-2 text-sm font-medium", days === d.days ? "border-brand-600 bg-brand-50 text-brand-800" : "border-slate-200 bg-white hover:bg-slate-50")}>{d.label}</button>
          ))}
          <button type="button" onClick={() => setDays("custom")} aria-pressed={days === "custom"} className={cn("rounded-lg border px-2 py-2 text-sm font-medium", days === "custom" ? "border-brand-600 bg-brand-50 text-brand-800" : "border-slate-200 bg-white hover:bg-slate-50")}>Outro</button>
        </div>
        {days === "custom" ? (
          <Field label="Número de dias" htmlFor="target_days" className="mt-3 max-w-40"><Input id="target_days" name="target_days" type="number" min={1} max={60} defaultValue={targetDays} required /></Field>
        ) : (
          <input type="hidden" name="target_days" value={days} />
        )}
        <FieldError name="target_days" />
      </fieldset>
      <div className="grid gap-2 sm:grid-cols-2">
        <CheckboxField name="include_hygiene_water" label="Incluir água para higiene" description="Recomendado. Sem ela, a reserva cobre só beber e cozinhar." defaultChecked={includeHygiene} />
        <CheckboxField name="hot_climate" label="Clima quente / ondas de calor" description="Aumenta em 50% a água para beber." defaultChecked={hotClimate} />
      </div>
      <Field label="Referência de água por adulto (L/dia)" htmlFor="water_adult_l_per_day" optional hint="Por defeito 5 L/dia (2,5 beber + 1 cozinhar + 1,5 higiene). Crianças e bebés são ajustados na mesma proporção." className="max-w-sm">
        <Input id="water_adult_l_per_day" name="water_adult_l_per_day" type="number" step="0.5" min={1} max={30} defaultValue={waterOverride ?? ""} placeholder="5" />
        <FieldError name="water_adult_l_per_day" />
      </Field>
      <SubmitButton>Guardar objetivo</SubmitButton>
    </ActionForm>
  );
}

export function BudgetForm({ budgetCents, onDone }: { budgetCents: number | null; onDone?: () => void }) {
  const presetKey = budgetCents == null ? "unlimited" : BUDGET_PRESETS.find((p) => p.cents === budgetCents)?.key ?? "custom";
  const [value, setValue] = useState(presetKey);
  return (
    <ActionForm action={saveBudget} onSuccess={onDone} className="space-y-3">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Orçamento disponível para a preparação</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[...BUDGET_PRESETS.map((p) => ({ key: p.key, label: p.key === "unlimited" ? "Mais de 2.000 € / sem limite" : p.label })), { key: "custom", label: "Personalizado" }].map((p) => (
            <label key={p.key} className={cn("flex cursor-pointer items-center justify-center rounded-lg border px-2 py-2 text-center text-sm font-medium", value === p.key ? "border-brand-600 bg-brand-50 text-brand-800" : "border-slate-200 bg-white hover:bg-slate-50")}>
              <input type="radio" name="budget" value={p.key} checked={value === p.key} onChange={() => setValue(p.key)} className="sr-only" />
              {p.label}
            </label>
          ))}
        </div>
      </fieldset>
      {value === "custom" && (
        <Field label="Valor (€)" htmlFor="custom_eur" className="max-w-40"><Input id="custom_eur" name="custom_eur" type="number" min={0} step="10" defaultValue={budgetCents ? budgetCents / 100 : ""} required /></Field>
      )}
      <p className="text-xs text-slate-500">Os essenciais nunca são retirados da lista por falta de orçamento: ficam assinalados como “por adquirir”.</p>
      <SubmitButton>Guardar orçamento</SubmitButton>
    </ActionForm>
  );
}

/** Client wrapper so server pages can open the settings form in a dialog. */
export function KitSettingsDialog(props: { targetDays: number; waterOverride: number | null; includeHygiene: boolean; hotClimate: boolean }) {
  return (
    <FormDialog title="Objetivo do HOME KIT" trigger={<Button size="sm" variant="secondary"><Settings2 aria-hidden /> {props.targetDays === 1 ? "24 h" : `${props.targetDays} dias`}</Button>}>
      {(close) => <KitSettingsForm {...props} onDone={close} />}
    </FormDialog>
  );
}
