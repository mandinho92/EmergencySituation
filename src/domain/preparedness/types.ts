/**
 * Domain types for the preparedness engine.
 *
 * The engine is pure (no I/O): it receives a snapshot of the household and
 * returns requirements. Persistence adapters map database rows to these types.
 */

export type MemberCategory = "adult" | "child" | "baby" | "senior";
export type InfantFeeding = "formula" | "breastfeeding" | "baby_food" | "mixed";
export type PetSpecies = "dog" | "cat" | "bird" | "rabbit" | "rodent" | "reptile" | "fish" | "other";
export type DwellingType = "apartment" | "house" | "farm" | "other";

/** Priority: 0 = P0 essential … 3 = P3 optional. */
export type Priority = 0 | 1 | 2 | 3;

export type RiskKey =
  | "wildfire"
  | "flood"
  | "storm"
  | "strong_wind"
  | "heat_wave"
  | "cold_wave"
  | "earthquake"
  | "power_outage"
  | "water_outage"
  | "telecom_outage";

export type HomeKitCategory =
  | "water"
  | "food"
  | "energy"
  | "kitchen"
  | "first_aid"
  | "fire"
  | "lighting"
  | "communications"
  | "hygiene"
  | "sanitation"
  | "tools"
  | "protection"
  | "shelter"
  | "documents"
  | "children"
  | "seniors"
  | "pets";

export type BagCategory =
  | "water"
  | "food"
  | "clothing"
  | "hygiene"
  | "first_aid"
  | "medication"
  | "lighting"
  | "communications"
  | "documents"
  | "money"
  | "protection"
  | "children"
  | "pets";

export interface MemberInput {
  id: string;
  displayName: string;
  category: MemberCategory;
  ageYears: number | null;
  reducedMobility: boolean;
  dietaryNeeds: string | null;
  specialEquipment: string | null;
  usesDiapers: boolean;
  infantFeeding: InfantFeeding | null;
  comfortItems: string | null;
  responsibleMemberId: string | null;
}

export interface PetInput {
  id: string;
  name: string;
  species: PetSpecies;
  quantity: number;
  approxWeightKg: number | null;
  hasCarrier: boolean;
  hasMedication: boolean;
}

export interface DwellingInput {
  type: DwellingType | null;
  floors: number | null;
  hasGarden: boolean;
  hasFireplace: boolean;
  hasGas: boolean;
  hasElectricStove: boolean;
  hasSolarPanels: boolean;
  hasHomeBattery: boolean;
  hasGenerator: boolean;
  hasWell: boolean;
}

export interface HomeKitSettings {
  targetDays: number;
  /** Override of the adult total daily water reference (L/day). */
  waterAdultLitersPerDay: number | null;
  includeHygieneWater: boolean;
  hotClimate: boolean;
}

export interface HouseholdSnapshot {
  members: MemberInput[];
  pets: PetInput[];
  dwelling: DwellingInput;
  risks: RiskKey[];
  /** Communication channels the family plans to use (affects PMR446 priority). */
  communicationChannels: string[];
}

/** A single requirement produced by the engine. */
export interface Requirement<C extends string = string> {
  key: string;
  name: string;
  category: C;
  unit: string;
  quantity: number;
  priority: Priority;
  /** Short explanation of how the quantity was derived (shown in the UI). */
  rationale: string;
  /** Catalogue item_key used to suggest products and estimated prices. */
  productKey?: string;
  /** False for things to prepare rather than buy (e.g. printed plan). */
  purchasable: boolean;
}

export type HomeKitRequirement = Requirement<HomeKitCategory>;

export interface BagRequirement extends Requirement<BagCategory> {
  unitWeightGrams: number;
}
