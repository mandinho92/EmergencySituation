/**
 * Energy calculator (optional module).
 *
 * Units: W = power (instantaneous), Wh = energy (power × time). All results
 * keep that distinction explicit. Results are estimates: real autonomy depends
 * on temperature, battery age, conversion losses, simultaneous loads and, for
 * solar, on weather and panel orientation.
 */
import { ENERGY_DEFAULTS } from "../preparedness/reference";

export interface EnergyDevice {
  id?: string;
  name: string;
  watts: number;
  surgeWatts?: number | null;
  hoursPerDay: number;
  quantity: number;
  /** AC devices go through the inverter (lower efficiency than DC/USB). */
  isAc: boolean;
  isEssential?: boolean;
}

export interface EnergySettings {
  autonomyDays: number;
  inverterEfficiency: number;
  peakSunHours: number;
  solarDerate: number;
}

export interface EnergyNeeds {
  /** Energy consumed by devices per day (Wh/day), before conversion losses. */
  deviceWhPerDay: number;
  /** Energy drawn from the battery per day including conversion losses (Wh/day). */
  batteryWhPerDay: number;
  /** Rated battery capacity recommended for the autonomy target (Wh). */
  recommendedCapacityWh: number;
  /** Continuous AC output power required (W), with margin. */
  requiredAcOutputW: number;
  /** Peak/surge power to start motors such as fridges (W). */
  requiredSurgeW: number;
  /** Solar array power to replace one day of consumption (W, rated). */
  solarWattsForDailyNeed: number;
  hasAcLoads: boolean;
  assumptions: string[];
}

export function computeEnergyNeeds(devices: EnergyDevice[], settings: EnergySettings): EnergyNeeds {
  const dcEff = ENERGY_DEFAULTS.dcEfficiency;
  let deviceWh = 0;
  let batteryWh = 0;
  let acW = 0;
  let maxExtraSurge = 0;
  for (const d of devices) {
    const wh = d.watts * d.hoursPerDay * d.quantity;
    deviceWh += wh;
    batteryWh += wh / (d.isAc ? settings.inverterEfficiency : dcEff);
    if (d.isAc) {
      acW += d.watts * d.quantity;
      if (d.surgeWatts && d.surgeWatts > d.watts) maxExtraSurge = Math.max(maxExtraSurge, d.surgeWatts - d.watts);
    }
  }
  const recommendedCapacityWh = Math.ceil((batteryWh * settings.autonomyDays) / ENERGY_DEFAULTS.usableCapacityFraction);
  const requiredAcOutputW = Math.ceil(acW * ENERGY_DEFAULTS.peakPowerMargin);
  const requiredSurgeW = Math.ceil(acW + maxExtraSurge);
  const solarWattsForDailyNeed = batteryWh > 0 ? Math.ceil(batteryWh / (settings.peakSunHours * settings.solarDerate)) : 0;

  return {
    deviceWhPerDay: Math.round(deviceWh),
    batteryWhPerDay: Math.round(batteryWh),
    recommendedCapacityWh,
    requiredAcOutputW,
    requiredSurgeW,
    solarWattsForDailyNeed,
    hasAcLoads: acW > 0,
    assumptions: [
      `Eficiência do inversor (AC): ${Math.round(settings.inverterEfficiency * 100)}%; saídas USB/DC: ${Math.round(dcEff * 100)}%.`,
      `Capacidade utilizável estimada: ${Math.round(ENERGY_DEFAULTS.usableCapacityFraction * 100)}% da capacidade nominal.`,
      `Potência AC dimensionada para todos os equipamentos ligados em simultâneo, com margem de ${Math.round((ENERGY_DEFAULTS.peakPowerMargin - 1) * 100)}%.`,
      `Solar: ${settings.peakSunHours} h de sol pleno equivalente por dia e ${Math.round(settings.solarDerate * 100)}% de rendimento real (temperatura, sujidade, orientação, cabos). No inverno e com céu nublado a produção pode ser muito inferior.`,
    ],
  };
}

export type EnergyTier = "none" | "powerbanks" | "economic" | "balanced" | "advanced" | "beyond_portable";

export interface TierBand {
  tier: Exclude<EnergyTier, "none" | "beyond_portable">;
  label: string;
  goal: string;
  capacityWh: [number, number];
  panelW: [number, number];
  /** Indicative planning band in euros — not prices. */
  budgetEur: [number, number];
}

export const TIER_BANDS: TierBand[] = [
  { tier: "powerbanks", label: "Apenas powerbanks", goal: "Carregar telemóveis e lanternas", capacityWh: [0, 150], panelW: [0, 0], budgetEur: [30, 120] },
  { tier: "economic", label: "Económico", goal: "Manter comunicações e iluminação", capacityWh: [200, 500], panelW: [0, 100], budgetEur: [150, 450] },
  { tier: "balanced", label: "Equilibrado", goal: "Pequenos equipamentos durante vários dias", capacityWh: [500, 1000], panelW: [100, 300], budgetEur: [450, 1000] },
  { tier: "advanced", label: "Avançado", goal: "Mais equipamentos e maior autonomia", capacityWh: [1000, 2000], panelW: [300, 600], budgetEur: [1000, 2000] },
];

/** Smallest tier that covers the need. Never escalates beyond what is needed. */
export function recommendTier(needs: EnergyNeeds): EnergyTier {
  const wh = needs.recommendedCapacityWh;
  if (wh <= 0) return "none";
  if (wh <= 150 && !needs.hasAcLoads) return "powerbanks";
  if (wh <= 500) return "economic";
  if (wh <= 1000) return "balanced";
  if (wh <= 2000) return "advanced";
  return "beyond_portable";
}

export interface StationCandidate {
  id: string;
  name: string;
  capacityWh: number;
  acOutputW: number;
  surgeW: number | null;
  solarInputMaxW: number | null;
  priceCents: number | null;
}

export interface PanelCandidate {
  id: string;
  name: string;
  panelW: number;
  priceCents: number | null;
}

export interface StationEvaluation {
  station: StationCandidate;
  autonomyDays: number;
  meetsCapacity: boolean;
  meetsPower: boolean;
}

export function evaluateStation(station: StationCandidate, needs: EnergyNeeds): StationEvaluation {
  const usable = station.capacityWh * ENERGY_DEFAULTS.usableCapacityFraction;
  const autonomyDays = needs.batteryWhPerDay > 0 ? Math.floor((usable / needs.batteryWhPerDay) * 10) / 10 : Infinity;
  return {
    station,
    autonomyDays,
    meetsCapacity: station.capacityWh >= needs.recommendedCapacityWh,
    meetsPower: !needs.hasAcLoads || (station.acOutputW >= needs.requiredAcOutputW && (station.surgeW ?? station.acOutputW) >= needs.requiredSurgeW),
  };
}

const priceOrInfinity = (c: number | null) => (c == null ? Number.POSITIVE_INFINITY : c);

/**
 * Recommended = cheapest station that meets capacity and power.
 * Economic alternative = cheaper station that meets power (less autonomy).
 * Larger alternative = next station with more capacity than the recommended.
 * When prices are unknown, capacity is used as the cost proxy.
 */
export function pickStations(stations: StationCandidate[], needs: EnergyNeeds) {
  const evals = stations.map((s) => evaluateStation(s, needs));
  const cost = (e: StationEvaluation) => [priceOrInfinity(e.station.priceCents), e.station.capacityWh] as const;
  const byCost = [...evals].sort((a, b) => cost(a)[0] - cost(b)[0] || cost(a)[1] - cost(b)[1]);

  const recommended = byCost.find((e) => e.meetsCapacity && e.meetsPower) ?? null;
  const economic = recommended
    ? [...byCost].reverse().find((e) => e.meetsPower && e !== recommended && cost(e)[0] <= cost(recommended)[0] && e.station.capacityWh < recommended.station.capacityWh) ?? null
    : [...byCost].filter((e) => e.meetsPower).sort((a, b) => b.station.capacityWh - a.station.capacityWh)[0] ?? null;
  const larger = recommended
    ? [...evals].filter((e) => e.station.capacityWh > recommended.station.capacityWh && e.meetsPower).sort((a, b) => a.station.capacityWh - b.station.capacityWh)[0] ?? null
    : null;
  return { recommended, economic, larger };
}

export interface SolarPlan {
  panel: PanelCandidate;
  panelCount: number;
  arrayW: number;
  /** Limited by the station's maximum solar input. */
  usableArrayW: number;
  dailyHarvestWh: number;
  /** Days of sun to recharge the station from empty to full. */
  fullRechargeDays: number | null;
  coversDailyNeed: boolean;
  limitedByStationInput: boolean;
}

export function planSolar(panel: PanelCandidate, station: StationCandidate | null, needs: EnergyNeeds, settings: EnergySettings, panelCount?: number): SolarPlan {
  const maxInput = station?.solarInputMaxW ?? Number.POSITIVE_INFINITY;
  const target = Math.min(needs.solarWattsForDailyNeed, maxInput);
  const count = panelCount ?? Math.max(1, Math.ceil(target / panel.panelW));
  const arrayW = count * panel.panelW;
  const usableArrayW = Math.min(arrayW, maxInput);
  const dailyHarvestWh = Math.round(usableArrayW * settings.peakSunHours * settings.solarDerate);
  const fullRechargeDays = station && dailyHarvestWh > 0 ? Math.round((station.capacityWh / dailyHarvestWh) * 10) / 10 : null;
  return {
    panel,
    panelCount: count,
    arrayW,
    usableArrayW,
    dailyHarvestWh,
    fullRechargeDays,
    coversDailyNeed: dailyHarvestWh >= needs.batteryWhPerDay,
    limitedByStationInput: arrayW > maxInput,
  };
}

/** Typical consumption presets. Users must confirm values on device labels. */
export const DEVICE_PRESETS: Array<EnergyDevice & { key: string; note?: string }> = [
  { key: "smartphone", name: "Smartphone (carregamento)", watts: 10, hoursPerDay: 2, quantity: 1, isAc: false },
  { key: "router", name: "Router de Internet", watts: 12, hoursPerDay: 12, quantity: 1, isAc: true, note: "Só é útil se a rede do operador estiver a funcionar" },
  { key: "led_lamp", name: "Lâmpada/candeeiro LED", watts: 8, hoursPerDay: 5, quantity: 1, isAc: false },
  { key: "flashlight", name: "Lanterna recarregável", watts: 5, hoursPerDay: 2, quantity: 1, isAc: false },
  { key: "radio", name: "Rádio", watts: 3, hoursPerDay: 4, quantity: 1, isAc: false },
  { key: "laptop", name: "Computador portátil", watts: 50, hoursPerDay: 3, quantity: 1, isAc: true },
  { key: "medical", name: "Equipamento médico (ex.: CPAP)", watts: 40, hoursPerDay: 8, quantity: 1, isAc: true, note: "Confirme o consumo com o fabricante e o seu médico" },
  { key: "fridge", name: "Frigorífico", watts: 100, surgeWatts: 600, hoursPerDay: 8, quantity: 1, isAc: true, note: "Compressor liga e desliga: ~8 h/dia de funcionamento. Verifique o consumo anual (kWh/ano ÷ 365) na etiqueta" },
  { key: "fan", name: "Ventoinha", watts: 30, hoursPerDay: 6, quantity: 1, isAc: true },
  { key: "tv", name: "Televisão", watts: 60, hoursPerDay: 2, quantity: 1, isAc: true },
];
