/**
 * Reference values used by the preparedness engine.
 *
 * These are PLANNING references, not medical or nutritional advice. They are
 * deliberately centralised so they can be reviewed, versioned and, if needed,
 * made configurable per country. Sources and reasoning are documented in
 * docs/CALCULATION_ENGINE.md. When changing a value, update that document and
 * the unit tests.
 */
import type { MemberCategory, PetSpecies } from "./types";

export const REFERENCE_VERSION = "2026-11";

/**
 * Daily water reference per person (litres/day).
 * Drinking + cooking ≈ survival range of humanitarian standards (2.5–3 L
 * drinking) plus basic food preparation; hygiene is the minimum for basic
 * handwashing and personal hygiene. Not sufficient for hot weather, physical
 * effort, pregnancy, breastfeeding or illness — see HOT_CLIMATE_DRINKING_FACTOR.
 */
export const WATER_PER_DAY: Record<MemberCategory, { drinking: number; cooking: number; hygiene: number }> = {
  adult: { drinking: 2.5, cooking: 1.0, hygiene: 1.5 },
  senior: { drinking: 2.5, cooking: 1.0, hygiene: 1.5 },
  child: { drinking: 1.5, cooking: 0.75, hygiene: 1.0 },
  // Water for preparing infant formula and basic infant hygiene.
  baby: { drinking: 0.8, cooking: 0.25, hygiene: 1.0 },
};

/** Drinking water multiplier when the family flags hot climate / heat waves. */
export const HOT_CLIMATE_DRINKING_FACTOR = 1.5;

/** Safety reserve added on top of the computed total. */
export const WATER_RESERVE_FRACTION = 0.1;

/** Pet water (litres per kg of body weight per day) and defaults by species. */
export const PET_WATER_L_PER_KG_DAY: Partial<Record<PetSpecies, number>> = { dog: 0.06, cat: 0.05, rabbit: 0.1 };
export const PET_WATER_DEFAULT_L_PER_DAY = 0.25;
export const PET_DEFAULT_WEIGHT_KG: Partial<Record<PetSpecies, number>> = { dog: 15, cat: 4, rabbit: 2 };

/** Dry food (kg per kg of body weight per day). Manufacturer guidance prevails. */
export const PET_FOOD_KG_PER_KG_DAY: Partial<Record<PetSpecies, number>> = { dog: 0.02, cat: 0.015, rabbit: 0.03 };
export const CAT_LITTER_KG_PER_CAT_DAY = 0.2;

/** Standard container size used to express water quantities. */
export const WATER_CONTAINER_LITERS = 5;

/**
 * Food "person-day equivalents": scales the adult daily food reference
 * (~1 800 kcal of shelf-stable food) by category / age.
 */
export function foodEquivalent(category: MemberCategory, ageYears: number | null): number {
  switch (category) {
    case "adult":
      return 1;
    case "senior":
      return 0.9;
    case "baby":
      return 0; // infant feeding handled separately
    case "child":
      if (ageYears == null) return 0.7;
      if (ageYears < 4) return 0.5;
      if (ageYears < 9) return 0.7;
      return 0.9;
  }
}

/** Shelf-stable food per adult-equivalent per day. */
export const FOOD_PER_EQ_DAY = {
  riceKg: 0.075,
  pastaKg: 0.075,
  cerealsKg: 0.05,
  cannedProteinUnits: 1, // ~120 g net tins (fish/meat)
  legumesUnits: 0.5, // ~400 g jars/tins (grão, feijão)
  snacksKg: 0.08, // nuts, bars, crackers
} as const;

/** UHT milk (litres/day) by category. */
export const MILK_L_PER_DAY: Record<MemberCategory, number> = { adult: 0.25, senior: 0.25, child: 0.5, baby: 0 };

/** Hygiene consumption references. */
export const HYGIENE = {
  toiletRollsPerPersonDay: 0.35,
  wipesPacksPerPersonDay: 1 / 6,
  wipesPacksPerBabyDay: 1 / 3,
  soapBarsPerPersonWeek: 0.25,
  sanitizerBottlesPerPersonWeek: 1 / 3,
  trashBagsPerPersonDay: 0.5,
  trashBagsPerRoll: 20,
  emergencyToiletBagsPerPersonDay: 3,
  diapersPerBabyDay: 6,
  diapersPerToddlerDay: 5,
} as const;

/** Gas cartridge autonomy for basic family cooking (days per cartridge). */
export const GAS_CARTRIDGE_DAYS = 2;

/** Planning thresholds for evacuation bag weight (grams). */
export function bagWeightLimitGrams(category: MemberCategory, ageYears: number | null, reducedMobility: boolean): number {
  if (category === "child" || category === "baby") {
    if (ageYears == null || ageYears < 6) return 2000;
    if (ageYears < 12) return 4000;
    return 7000;
  }
  if (category === "senior" || reducedMobility) return 8000;
  return 12000;
}

/** Minimum age for a dedicated child bag; younger children's items go in an adult bag. */
export const CHILD_BAG_MIN_AGE = 6;

/** Energy defaults (also persisted per family in energy_profiles). */
export const ENERGY_DEFAULTS = {
  inverterEfficiency: 0.85,
  dcEfficiency: 0.9,
  /** Share of the rated Wh that is realistically deliverable. */
  usableCapacityFraction: 0.85,
  /** Margin over the sum of simultaneous AC loads. */
  peakPowerMargin: 1.25,
  peakSunHours: 3.0,
  solarDerate: 0.75,
  defaultPanelWatts: 100,
} as const;
