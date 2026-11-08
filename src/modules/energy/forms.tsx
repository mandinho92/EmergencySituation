"use client";

import { Plus, Trash2 } from "lucide-react";
import { ActionButton, ActionForm, FieldError, SubmitButton } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/dialog";
import { CheckboxField, Field, Input, Select } from "@/components/ui/form";
import { DEVICE_PRESETS } from "@/domain/energy/energy";
import { addPresetDevice, deleteDevice, saveDevice, saveEnergySelection, saveEnergySettings } from "./actions";

export function DevicePresets() {
  return (
    <div className="flex flex-wrap gap-1.5">
      {DEVICE_PRESETS.map((p) => (
        <ActionButton key={p.key} size="sm" variant="secondary" action={addPresetDevice} input={{ key: p.key }} title={p.note}><Plus aria-hidden /> {p.name}</ActionButton>
      ))}
    </div>
  );
}

export function DeviceDialog({ device }: { device?: { id: string; name: string; watts: number; surge_watts: number | null; hours_per_day: number; quantity: number; is_ac: boolean; is_essential: boolean } }) {
  return (
    <FormDialog title={device ? device.name : "Equipamento personalizado"} description="Use a potência da etiqueta (W) e as horas reais de utilização por dia." trigger={device ? <Button size="sm" variant="ghost">Editar</Button> : <Button size="sm" variant="secondary"><Plus aria-hidden /> Personalizado</Button>}>
      {(close) => (
        <ActionForm action={saveDevice} extra={{ id: device?.id ?? "" }} onSuccess={close} className="space-y-4">
          <Field label="Nome" htmlFor="d-name"><Input id="d-name" name="name" required maxLength={80} defaultValue={device?.name} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Potência (W)" htmlFor="d-w" hint="Potência instantânea, em watts."><Input id="d-w" name="watts" type="number" step="0.1" min={0.1} required defaultValue={device?.watts} /><FieldError name="watts" /></Field>
            <Field label="Potência de arranque (W)" htmlFor="d-s" optional hint="Motores e compressores (ex.: frigorífico)."><Input id="d-s" name="surge_watts" type="number" step="1" min={0} defaultValue={device?.surge_watts ?? ""} /><FieldError name="surge_watts" /></Field>
            <Field label="Horas por dia" htmlFor="d-h"><Input id="d-h" name="hours_per_day" type="number" step="0.1" min={0.1} max={24} required defaultValue={device?.hours_per_day ?? 1} /></Field>
            <Field label="Quantidade" htmlFor="d-q"><Input id="d-q" name="quantity" type="number" min={1} max={20} defaultValue={device?.quantity ?? 1} /></Field>
          </div>
          <CheckboxField name="is_ac" label="Liga a uma tomada (230 V AC)" description="Desmarque para equipamentos USB/12 V (mais eficientes)." defaultChecked={device?.is_ac ?? true} />
          <CheckboxField name="is_essential" label="Essencial" defaultChecked={device?.is_essential ?? true} />
          <div className="flex gap-2">
            <SubmitButton>Guardar</SubmitButton>
            {device && <ActionButton variant="ghost" action={deleteDevice} input={{ id: device.id }} onDone={close} successMessage="Removido."><Trash2 aria-hidden /> Remover</ActionButton>}
          </div>
        </ActionForm>
      )}
    </FormDialog>
  );
}

export function EnergySettingsForm({ s }: { s: { autonomy_days: number; inverter_efficiency: number; peak_sun_hours: number; solar_derate: number } }) {
  return (
    <ActionForm action={saveEnergySettings} className="grid gap-3 sm:grid-cols-2">
      <Field label="Autonomia pretendida (dias)" htmlFor="e-days"><Input id="e-days" name="autonomy_days" type="number" step="0.5" min={0.5} max={30} defaultValue={s.autonomy_days} /></Field>
      <Field label="Eficiência do inversor" htmlFor="e-inv" hint="0,85 = 85%"><Input id="e-inv" name="inverter_efficiency" type="number" step="0.01" min={0.5} max={1} defaultValue={s.inverter_efficiency} /></Field>
      <Field label="Horas de sol pleno por dia" htmlFor="e-psh" hint="Inverno ≈ 2–3 h; verão ≈ 5–7 h em Portugal"><Input id="e-psh" name="peak_sun_hours" type="number" step="0.1" min={0.5} max={10} defaultValue={s.peak_sun_hours} /></Field>
      <Field label="Rendimento real dos painéis" htmlFor="e-der" hint="Perdas por temperatura, orientação, sujidade"><Input id="e-der" name="solar_derate" type="number" step="0.05" min={0.3} max={1} defaultValue={s.solar_derate} /></Field>
      <div className="sm:col-span-2"><SubmitButton size="sm" variant="secondary">Atualizar pressupostos</SubmitButton></div>
    </ActionForm>
  );
}

export function SelectionForm({ stations, panels, current }: { stations: Array<{ id: string; name: string }>; panels: Array<{ id: string; name: string }>; current: { station: string | null; panel: string | null; panelCount: number | null; stationAcquired: boolean; panelsAcquired: boolean } }) {
  return (
    <ActionForm action={saveEnergySelection} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Power station escolhida" htmlFor="sel-st"><Select id="sel-st" name="selected_station_product_id" defaultValue={current.station ?? ""}><option value="">— Nenhuma —</option>{stations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
        <Field label="Painel" htmlFor="sel-pn"><Select id="sel-pn" name="selected_panel_product_id" defaultValue={current.panel ?? ""}><option value="">— Nenhum —</option>{panels.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
        <Field label="N.º de painéis" htmlFor="sel-n"><Input id="sel-n" name="panel_count" type="number" min={0} max={20} defaultValue={current.panelCount ?? ""} /></Field>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <CheckboxField name="station_acquired" label="Power station adquirida" defaultChecked={current.stationAcquired} />
        <CheckboxField name="panels_acquired" label="Painéis adquiridos" defaultChecked={current.panelsAcquired} />
      </div>
      <SubmitButton size="sm">Guardar seleção</SubmitButton>
    </ActionForm>
  );
}
