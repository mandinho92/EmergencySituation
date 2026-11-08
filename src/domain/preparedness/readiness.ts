/**
 * Readiness scoring and priority actions for the dashboard.
 * Pure function: inputs are already-merged kit lines and plan facts.
 */
import { coverage } from "./math";
import { type KitLine, weightedCoverage } from "./kit-lines";

export interface BagSummaryInput {
  id: string;
  name: string;
  lines: KitLine[];
}

export interface ReadinessInput {
  memberCount: number;
  adultCount: number;
  targetDays: number;
  homeLines: KitLine[];
  water: { requiredLiters: number; haveLiters: number; perDayTotal: number };
  foodAutonomyDays: number | null;
  bags: BagSummaryInput[];
  energy: { tier: string; stationAcquired: boolean; hasStationSelected: boolean };
  plan: {
    meetingPointKinds: string[];
    contactsCount: number;
    hasLocation: boolean;
  };
  communication: {
    hasPrimaryContact: boolean;
    hasOutOfRegionContact: boolean;
    channelsCount: number;
    hasNoInternetPlan: boolean;
    hasCallsFailPlan: boolean;
  };
  overdueReviews: number;
  expiringSoon: number;
}

export interface ReadinessScores {
  global: number;
  goBags: number;
  homeKit: number;
  water: number;
  food: number;
  energy: number;
  firstAid: number;
  safety: number;
  plan: number;
  communication: number;
}

export interface PriorityAction {
  key: string;
  title: string;
  detail?: string;
  href: string;
  /** Lower = more urgent. */
  rank: number;
}

export interface ReadinessResult {
  scores: ReadinessScores;
  indicators: {
    waterDays: number;
    foodDays: number | null;
    bagsReady: number;
    bagsTotal: number;
    energyStatus: "not_decided" | "not_wanted" | "tier_chosen" | "configured_not_acquired" | "acquired" | "basic_only";
    essentialMissing: number;
  };
  actions: PriorityAction[];
}

/** Global score weights (sum = 100). Documented in docs/CALCULATION_ENGINE.md. */
export const GLOBAL_WEIGHTS: Record<Exclude<keyof ReadinessScores, "global" | "homeKit">, number> = {
  water: 15,
  food: 15,
  goBags: 15,
  firstAid: 10,
  safety: 10,
  energy: 10,
  plan: 15,
  communication: 10,
};

const pct = (r: number) => Math.round(Math.min(1, Math.max(0, r)) * 100);

export function isBagReady(lines: KitLine[]): boolean {
  const relevant = lines.filter((l) => !l.excluded && l.priority <= 1 && l.required > 0);
  return relevant.length > 0 && relevant.every((l) => l.isPacked);
}

export function computeReadiness(input: ReadinessInput): ReadinessResult {
  const active = input.homeLines.filter((l) => !l.excluded);
  const inCats = (cats: string[]) => active.filter((l) => cats.includes(l.category));

  const water = coverage(input.water.haveLiters, input.water.requiredLiters);
  const food = input.foodAutonomyDays == null ? 0 : coverage(input.foodAutonomyDays, input.targetDays);
  const firstAid = weightedCoverage(inCats(["first_aid"]));
  const safety = weightedCoverage(inCats(["fire", "protection", "tools"]));
  const homeKit = weightedCoverage(active);

  const bagsReady = input.bags.filter((b) => isBagReady(b.lines)).length;
  const bagScore = input.bags.length === 0 ? 0 : input.bags.reduce((s, b) => s + weightedCoverage(b.lines, "bag"), 0) / input.bags.length;
  // Missing adult bags reduce the score proportionally.
  const expectedBags = Math.max(input.adultCount, 1);
  const adultBagCount = Math.min(input.bags.length, expectedBags);
  const goBags = bagScore * (adultBagCount / expectedBags);

  const basicEnergy = weightedCoverage(inCats(["energy", "lighting"]).concat(active.filter((l) => l.key === "communications.powerbank")));
  const wantsStation = ["economic", "balanced", "advanced", "manual"].includes(input.energy.tier);
  const energy = wantsStation ? basicEnergy * 0.5 + (input.energy.stationAcquired ? 0.5 : 0) : basicEnergy;

  const kinds = new Set(input.plan.meetingPointKinds);
  const plan =
    (kinds.has("near_home") ? 0.3 : 0) +
    (kinds.has("out_of_area") ? 0.3 : 0) +
    (input.plan.contactsCount > 0 ? 0.2 : 0) +
    (input.plan.hasLocation ? 0.2 : 0);

  const c = input.communication;
  const communication =
    (c.hasPrimaryContact ? 0.2 : 0) +
    (c.hasOutOfRegionContact ? 0.25 : 0) +
    (c.channelsCount >= 2 ? 0.15 : 0) +
    (c.hasNoInternetPlan ? 0.2 : 0) +
    (c.hasCallsFailPlan ? 0.2 : 0);

  const sub = { water, food, goBags, firstAid, safety, energy, plan, communication };
  const global =
    input.memberCount === 0
      ? 0
      : Object.entries(GLOBAL_WEIGHTS).reduce((s, [k, w]) => s + sub[k as keyof typeof sub] * w, 0) / 100;

  const essentialMissing = active.filter((l) => l.priority === 0 && l.missing > 0).length +
    input.bags.reduce((s, b) => s + b.lines.filter((l) => !l.excluded && l.priority === 0 && !l.isPacked).length, 0);

  const energyStatus: ReadinessResult["indicators"]["energyStatus"] =
    input.energy.tier === "undecided" ? "not_decided"
      : input.energy.tier === "none" ? "not_wanted"
      : wantsStation ? (input.energy.stationAcquired ? "acquired" : input.energy.hasStationSelected ? "configured_not_acquired" : "tier_chosen")
      : "basic_only";

  return {
    scores: {
      global: pct(global),
      goBags: pct(goBags),
      homeKit: pct(homeKit),
      water: pct(water),
      food: pct(food),
      energy: pct(energy),
      firstAid: pct(firstAid),
      safety: pct(safety),
      plan: pct(plan),
      communication: pct(communication),
    },
    indicators: {
      waterDays: input.water.perDayTotal > 0 ? Math.floor((input.water.haveLiters / input.water.perDayTotal) * 10) / 10 : 0,
      foodDays: input.foodAutonomyDays,
      bagsReady,
      bagsTotal: input.bags.length,
      energyStatus,
      essentialMissing,
    },
    actions: buildActions(input),
  };
}

function fmtQty(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ",");
}

function buildActions(input: ReadinessInput): PriorityAction[] {
  const actions: PriorityAction[] = [];
  if (input.memberCount === 0) {
    actions.push({ key: "members", title: "Adicionar os membros do agregado", detail: "Os cálculos dependem da composição da família.", href: "/app/members", rank: 0 });
    return actions;
  }

  const waterGap = Math.max(0, input.water.requiredLiters - input.water.haveLiters);
  if (waterGap > 0) {
    actions.push({ key: "water", title: `Comprar ${fmtQty(Math.ceil(waterGap))} L adicionais de água`, detail: `Objetivo: ${input.water.requiredLiters} L para ${input.targetDays} dia(s).`, href: "/app/home-kit#water", rank: 1 });
  }

  if (input.bags.length < input.adultCount) {
    actions.push({ key: "bags.create", title: "Criar as mochilas de evacuação", detail: "Uma por adulto, preparada para 72 horas.", href: "/app/go-bags", rank: 2 });
  }
  for (const b of input.bags) {
    if (!isBagReady(b.lines)) {
      const missing = b.lines.filter((l) => !l.excluded && l.priority === 0 && !l.isPacked).length;
      actions.push({ key: `bag.${b.id}`, title: `Preparar: ${b.name}`, detail: missing > 0 ? `${missing} artigo(s) essencial(is) por colocar.` : "Complete os artigos importantes.", href: `/app/go-bags/${b.id}`, rank: missing > 0 ? 3 : 7 });
    }
  }

  if (input.foodAutonomyDays != null && input.foodAutonomyDays < input.targetDays) {
    const gap = input.targetDays - input.foodAutonomyDays;
    actions.push({ key: "food", title: `Completar a alimentação para mais ${gap} dia(s)`, detail: `Autonomia atual: ${input.foodAutonomyDays} de ${input.targetDays} dias.`, href: "/app/home-kit#food", rank: 4 });
  }

  const kinds = new Set(input.plan.meetingPointKinds);
  if (!kinds.has("near_home")) actions.push({ key: "mp.near", title: "Definir o ponto de encontro perto de casa", href: "/app/meeting-points", rank: 4 });
  if (!kinds.has("out_of_area")) actions.push({ key: "mp.out", title: "Definir o ponto de encontro fora da zona de residência", href: "/app/meeting-points", rank: 5 });
  if (!input.communication.hasOutOfRegionContact) {
    actions.push({ key: "comm.out", title: "Escolher um contacto de confiança noutra região", detail: "Centraliza informação sobre o paradeiro de cada membro.", href: "/app/communication", rank: 5 });
  }

  const missingEssentials = input.homeLines
    .filter((l) => !l.excluded && l.priority === 0 && l.missing > 0 && l.category !== "water" && l.group == null)
    .slice(0, 4);
  for (const l of missingEssentials) {
    actions.push({
      key: `item.${l.id}`,
      title: l.purchasable ? `Comprar: ${l.name.toLowerCase()}` : `Preparar: ${l.name.toLowerCase()}`,
      href: `/app/home-kit#${l.category}`,
      rank: 6,
    });
  }

  if (input.expiringSoon > 0) actions.push({ key: "expiry", title: `Substituir ${input.expiringSoon} artigo(s) a expirar`, href: "/app/inventory?filter=expiring", rank: 3 });
  if (input.overdueReviews > 0) actions.push({ key: "review", title: "Fazer a revisão periódica do plano", href: "/app/reviews", rank: 4 });
  if (!input.communication.hasNoInternetPlan || !input.communication.hasCallsFailPlan) {
    actions.push({ key: "comm.plan", title: "Completar o plano de comunicação sem rede", href: "/app/communication", rank: 7 });
  }
  if (!input.plan.hasLocation) actions.push({ key: "location", title: "Indicar o distrito para adaptar os riscos", href: "/app/household", rank: 8 });
  if (input.energy.tier === "undecided") actions.push({ key: "energy", title: "Decidir sobre energia de reserva (opcional)", href: "/app/energy", rank: 9 });

  return actions.sort((a, b) => a.rank - b.rank).slice(0, 5);
}
