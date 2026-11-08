import {
  HOT_CLIMATE_DRINKING_FACTOR,
  PET_DEFAULT_WEIGHT_KG,
  PET_WATER_DEFAULT_L_PER_DAY,
  PET_WATER_L_PER_KG_DAY,
  WATER_CONTAINER_LITERS,
  WATER_PER_DAY,
  WATER_RESERVE_FRACTION,
} from "./reference";
import type { HomeKitSettings, MemberInput, PetInput } from "./types";
import { roundUp } from "./math";

export interface WaterBreakdown {
  /** Litres per day, per use. */
  perDay: { drinking: number; cooking: number; hygiene: number; pets: number; total: number };
  days: number;
  drinkingLiters: number;
  cookingLiters: number;
  hygieneLiters: number;
  petsLiters: number;
  reserveLiters: number;
  /** Total storage to hold, rounded up to whole litres. */
  totalLiters: number;
  containers: { sizeLiters: number; count: number };
  warnings: string[];
}

const ADULT_DEFAULT_TOTAL = WATER_PER_DAY.adult.drinking + WATER_PER_DAY.adult.cooking + WATER_PER_DAY.adult.hygiene;

export function petWaterPerDay(pet: PetInput): number {
  const perKg = PET_WATER_L_PER_KG_DAY[pet.species];
  if (perKg == null) return PET_WATER_DEFAULT_L_PER_DAY * pet.quantity;
  const weight = pet.approxWeightKg ?? PET_DEFAULT_WEIGHT_KG[pet.species] ?? 5;
  return perKg * weight * pet.quantity;
}

export function computeWater(members: MemberInput[], pets: PetInput[], settings: HomeKitSettings): WaterBreakdown {
  const days = settings.targetDays;
  // An adult override scales every person proportionally (keeps child/adult ratios).
  const scale = settings.waterAdultLitersPerDay != null ? settings.waterAdultLitersPerDay / ADULT_DEFAULT_TOTAL : 1;

  let drinking = 0;
  let cooking = 0;
  let hygiene = 0;
  for (const m of members) {
    const ref = WATER_PER_DAY[m.category];
    drinking += ref.drinking * scale * (settings.hotClimate ? HOT_CLIMATE_DRINKING_FACTOR : 1);
    cooking += ref.cooking * scale;
    if (settings.includeHygieneWater) hygiene += ref.hygiene * scale;
  }
  const petsPerDay = pets.reduce((sum, p) => sum + petWaterPerDay(p), 0);
  const perDayTotal = drinking + cooking + hygiene + petsPerDay;
  const base = perDayTotal * days;
  const reserve = base * WATER_RESERVE_FRACTION;
  const totalLiters = Math.ceil(base + reserve - 1e-9);

  const warnings: string[] = [
    "Valores de referência para planeamento. Em calor, esforço físico, gravidez, amamentação ou doença as necessidades aumentam.",
  ];
  if (!settings.includeHygieneWater) {
    warnings.push("A água para higiene não está incluída — considere reservas adicionais ou toalhitas.");
  }
  if (members.length === 0) warnings.push("Adicione os membros do agregado para calcular a água necessária.");

  return {
    perDay: {
      drinking: roundUp(drinking, 2),
      cooking: roundUp(cooking, 2),
      hygiene: roundUp(hygiene, 2),
      pets: roundUp(petsPerDay, 2),
      total: roundUp(perDayTotal, 2),
    },
    days,
    drinkingLiters: roundUp(drinking * days, 1),
    cookingLiters: roundUp(cooking * days, 1),
    hygieneLiters: roundUp(hygiene * days, 1),
    petsLiters: roundUp(petsPerDay * days, 1),
    reserveLiters: roundUp(reserve, 1),
    totalLiters,
    containers: { sizeLiters: WATER_CONTAINER_LITERS, count: Math.ceil(totalLiters / WATER_CONTAINER_LITERS) },
    warnings,
  };
}

/** Days of autonomy covered by a stored amount of water. */
export function waterAutonomyDays(haveLiters: number, perDayTotal: number): number {
  if (perDayTotal <= 0) return 0;
  return Math.floor((haveLiters / perDayTotal) * 10) / 10;
}
