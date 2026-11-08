import { BatteryCharging, Sun, Zap } from "lucide-react";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Notice, PageHeader, Stat } from "@/components/ui/misc";
import { computeEnergyNeeds, pickStations, planSolar, recommendTier, TIER_BANDS, type StationEvaluation } from "@/domain/energy/energy";
import { formatMoney, formatNumber } from "@/i18n/format";
import { ENERGY_TIER_LABEL } from "@/i18n/messages";
import { hasRole, requireFamily } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { DeviceDialog, DevicePresets, EnergySettingsForm, SelectionForm } from "@/modules/energy/forms";
import { TierPicker } from "@/modules/energy/tier-picker";
import { bestPrice, loadCatalogue } from "@/modules/products/pricing";

export const metadata: Metadata = { title: "Calculadora de energia" };

const TIER_TEXT = { none: "Sem necessidade de bateria", powerbanks: "Apenas powerbanks", economic: "Económico", balanced: "Equilibrado", advanced: "Avançado", beyond_portable: "Acima de soluções portáteis" } as const;

function StationCard({ title, e, highlight }: { title: string; e: StationEvaluation | null; highlight?: boolean }) {
  return (
    <div className={highlight ? "rounded-xl border-2 border-brand-500 bg-brand-50/40 p-4" : "rounded-xl border border-slate-200 p-4"}>
      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{title}</p>
      {e ? (
        <>
          <p className="mt-1 font-semibold">{e.station.name}</p>
          <dl className="mt-2 grid grid-cols-2 gap-1 text-xs text-slate-600">
            <dt>Capacidade</dt><dd className="text-right tabular-nums">{e.station.capacityWh} Wh</dd>
            <dt>Saída AC contínua</dt><dd className="text-right tabular-nums">{e.station.acOutputW} W</dd>
            <dt>Entrada solar máx.</dt><dd className="text-right tabular-nums">{e.station.solarInputMaxW ? `${e.station.solarInputMaxW} W` : "a confirmar"}</dd>
            <dt>Autonomia estimada</dt><dd className="text-right font-medium tabular-nums">{Number.isFinite(e.autonomyDays) ? `${formatNumber(e.autonomyDays)} dia(s)` : "—"}</dd>
            <dt>Preço</dt><dd className="text-right">{e.station.priceCents != null ? formatMoney(e.station.priceCents) : "a verificar"}</dd>
          </dl>
          {!e.meetsCapacity && <p className="mt-2 text-xs text-amber-700">Abaixo da capacidade recomendada: menos autonomia.</p>}
          {!e.meetsPower && <p className="mt-2 text-xs text-red-600">Potência insuficiente para os equipamentos AC indicados.</p>}
        </>
      ) : <p className="mt-1 text-sm text-slate-500">Sem opção no catálogo.</p>}
    </div>
  );
}

export default async function EnergyPage() {
  const ctx = await requireFamily();
  const supabase = await createClient();
  const [{ data: profile }, { data: devices }, catalogue] = await Promise.all([
    supabase.from("energy_profiles").select("*").eq("family_id", ctx.family.id).single(),
    supabase.from("energy_devices").select("*").eq("family_id", ctx.family.id).order("created_at"),
    loadCatalogue(),
  ]);
  const p = profile!;
  const canEdit = hasRole(ctx.role, "editor");
  const settings = { autonomyDays: Number(p.autonomy_days), inverterEfficiency: Number(p.inverter_efficiency), peakSunHours: Number(p.peak_sun_hours), solarDerate: Number(p.solar_derate) };
  const list = (devices ?? []).map((d) => ({ id: d.id, name: d.name, watts: Number(d.watts), surgeWatts: d.surge_watts == null ? null : Number(d.surge_watts), hoursPerDay: Number(d.hours_per_day), quantity: d.quantity, isAc: d.is_ac, isEssential: d.is_essential }));
  const needs = computeEnergyNeeds(list, settings);
  const tier = recommendTier(needs);

  const stations = catalogue.filter((c) => c.product_energy_specs?.kind === "power_station").map((c) => ({
    id: c.id, name: c.name, capacityWh: Number(c.product_energy_specs!.capacity_wh), acOutputW: c.product_energy_specs!.ac_output_w!, surgeW: c.product_energy_specs!.surge_w, solarInputMaxW: c.product_energy_specs!.solar_input_max_w, priceCents: bestPrice(c)?.unitCents ?? null,
  }));
  const panels = catalogue.filter((c) => c.product_energy_specs?.kind === "solar_panel").map((c) => ({ id: c.id, name: c.name, panelW: c.product_energy_specs!.panel_w!, priceCents: bestPrice(c)?.unitCents ?? null }));
  const picks = list.length > 0 ? pickStations(stations, needs) : { recommended: null, economic: null, larger: null };
  const chosenStation = stations.find((s) => s.id === p.selected_station_product_id) ?? picks.recommended?.station ?? null;
  const chosenPanel = panels.find((x) => x.id === p.selected_panel_product_id) ?? panels[0] ?? null;
  const solar = chosenPanel && list.length > 0 ? planSolar(chosenPanel, chosenStation, needs, settings, p.panel_count ?? undefined) : null;
  const wantsStation = ["economic", "balanced", "advanced", "manual"].includes(p.tier);

  return (
    <>
      <PageHeader icon={BatteryCharging} title="Energia de reserva" description="Módulo opcional. Baterias portáteis e painéis solares são um investimento adicional — escolha apenas o que a sua família precisa." />

      <Card className="mb-4">
        <CardHeader><div><CardTitle>O que pretende?</CardTitle><CardDescription>Atual: {ENERGY_TIER_LABEL[p.tier as keyof typeof ENERGY_TIER_LABEL]}</CardDescription></div></CardHeader>
        <CardContent><TierPicker current={p.tier} disabled={!canEdit} /></CardContent>
      </Card>

      {p.tier === "none" || p.tier === "undecided" || p.tier === "powerbanks" ? (
        <Notice>
          {p.tier === "powerbanks" ? "Powerbanks, lanternas e rádio já fazem parte do HOME KIT e das mochilas. Pode calcular abaixo se precisa de algo mais." : "Sem bateria configurada: o HOME KIT inclui lanternas, pilhas, rádio e powerbanks. Use a calculadora abaixo se quiser avaliar uma solução."}
        </Notice>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><div><CardTitle className="flex items-center gap-2"><Zap className="size-4 text-brand-600" aria-hidden />Equipamentos a alimentar</CardTitle><CardDescription>Potência em W × horas por dia = energia em Wh/dia.</CardDescription></div></CardHeader>
          <CardContent className="space-y-3">
            {list.length === 0 ? <p className="text-sm text-slate-500">Adicione os equipamentos que precisa de manter ligados num apagão.</p> : (
              <ul className="divide-y divide-slate-100">
                {(devices ?? []).map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <span><span className="font-medium">{d.name}</span>{d.quantity > 1 && ` × ${d.quantity}`}<span className="block text-xs text-slate-500">{Number(d.watts)} W · {Number(d.hours_per_day)} h/dia · {d.is_ac ? "AC" : "USB/DC"} · {formatNumber(Number(d.watts) * Number(d.hours_per_day) * d.quantity)} Wh/dia</span></span>
                    {canEdit && <DeviceDialog device={{ ...d, watts: Number(d.watts), surge_watts: d.surge_watts == null ? null : Number(d.surge_watts), hours_per_day: Number(d.hours_per_day) }} />}
                  </li>
                ))}
              </ul>
            )}
            {canEdit && (<><p className="text-xs font-medium text-slate-500">Adicionar (valores típicos — confirme na etiqueta):</p><DevicePresets /><DeviceDialog /></>)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Resultado</CardTitle><Badge tone="brand">{TIER_TEXT[tier]}</Badge></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Consumo dos equipamentos" value={`${needs.deviceWhPerDay} Wh/dia`} />
              <Stat label="Retirado da bateria (c/ perdas)" value={`${needs.batteryWhPerDay} Wh/dia`} />
              <Stat label="Capacidade recomendada" value={`${needs.recommendedCapacityWh} Wh`} hint={`${settings.autonomyDays} dia(s) de autonomia`} />
              <Stat label="Potência AC necessária" value={`${needs.requiredAcOutputW} W`} hint={needs.requiredSurgeW > needs.requiredAcOutputW ? `Arranque: ${needs.requiredSurgeW} W` : undefined} />
            </div>
            {tier === "beyond_portable" && <Notice tone="warning">A necessidade ultrapassa as soluções portáteis (2 000 Wh). Reduza equipamentos ou horas, ou consulte um instalador para uma bateria doméstica.</Notice>}
            <ul className="space-y-1 text-xs text-slate-500">{needs.assumptions.map((a) => <li key={a}>• {a}</li>)}</ul>
            {canEdit && <details><summary className="cursor-pointer text-sm font-medium text-brand-600">Alterar pressupostos</summary><div className="mt-3"><EnergySettingsForm s={{ autonomy_days: settings.autonomyDays, inverter_efficiency: settings.inverterEfficiency, peak_sun_hours: settings.peakSunHours, solar_derate: settings.solarDerate }} /></div></details>}
          </CardContent>
        </Card>
      </div>

      {list.length > 0 && (
        <Card className="mt-4">
          <CardHeader><div><CardTitle>Power stations</CardTitle><CardDescription>A recomendada é a opção que cobre a necessidade com menor custo conhecido — nunca uma maior do que o necessário. Sem preços verificados, a capacidade é usada como indicador de custo.</CardDescription></div></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <StationCard title="Alternativa económica" e={picks.economic} />
            <StationCard title="Recomendada" e={picks.recommended} highlight />
            <StationCard title="Maior capacidade" e={picks.larger} />
          </CardContent>
        </Card>
      )}

      {solar && (
        <Card className="mt-4">
          <CardHeader><div><CardTitle className="flex items-center gap-2"><Sun className="size-4 text-amber-500" aria-hidden />Recarga solar</CardTitle><CardDescription>Com {solar.panelCount} × {chosenPanel!.name}{chosenStation ? ` ligado(s) a ${chosenStation.name}` : ""}.</CardDescription></div></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Potência dos painéis" value={`${solar.arrayW} W`} hint={solar.limitedByStationInput ? `Limitado a ${solar.usableArrayW} W pela entrada da power station` : undefined} />
              <Stat label="Produção estimada" value={`${solar.dailyHarvestWh} Wh/dia`} />
              <Stat label="Painéis para 1 dia de consumo" value={`${needs.solarWattsForDailyNeed} W`} />
              <Stat label="Recarga completa" value={solar.fullRechargeDays != null ? `${formatNumber(solar.fullRechargeDays)} dia(s) de sol` : "—"} />
            </div>
            <Notice tone={solar.coversDailyNeed ? "success" : "warning"}>{solar.coversDailyNeed ? "Com sol suficiente, os painéis repõem o consumo diário estimado." : "Os painéis não repõem todo o consumo diário: a autonomia vai diminuindo. Em dias nublados ou no inverno a produção pode ser muito inferior."}</Notice>
            <p className="text-xs text-slate-500">Confirme sempre a tensão (Voc), o conector e a potência máxima de entrada com o fabricante da power station antes de comprar painéis.</p>
          </CardContent>
        </Card>
      )}

      {canEdit && (wantsStation || p.selected_station_product_id) && (
        <Card className="mt-4">
          <CardHeader><div><CardTitle>A sua solução</CardTitle><CardDescription>A seleção aparece na lista de compras como artigo opcional até ser adquirida.</CardDescription></div></CardHeader>
          <CardContent><SelectionForm stations={stations} panels={panels} current={{ station: p.selected_station_product_id, panel: p.selected_panel_product_id, panelCount: p.panel_count, stationAcquired: p.station_acquired, panelsAcquired: p.panels_acquired }} /></CardContent>
        </Card>
      )}

      <Card className="mt-4">
        <CardHeader><CardTitle>Bandas de planeamento</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {TIER_BANDS.filter((b) => b.tier !== "powerbanks").map((b) => (
            <div key={b.tier} className="rounded-lg bg-slate-50 p-3 text-sm">
              <p className="font-medium">{b.label}</p>
              <p className="text-slate-600">{b.goal}</p>
              <p className="mt-1 text-xs text-slate-500">{b.capacityWh[0]}–{b.capacityWh[1]} Wh · painéis até {b.panelW[1]} W · {b.budgetEur[0]}–{b.budgetEur[1].toLocaleString("pt-PT")} €</p>
            </div>
          ))}
          <p className="text-xs text-slate-500 sm:col-span-3">Valores indicativos de planeamento, não preços garantidos.</p>
        </CardContent>
      </Card>
    </>
  );
}
