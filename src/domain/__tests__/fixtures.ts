import type { DwellingInput, HomeKitSettings, HouseholdSnapshot, MemberInput, PetInput } from "../preparedness/types";

let seq = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;

export function member(partial: Partial<MemberInput> & Pick<MemberInput, "category">): MemberInput {
  return {
    id: uuid(),
    displayName: partial.category,
    ageYears: null,
    reducedMobility: false,
    dietaryNeeds: null,
    specialEquipment: null,
    usesDiapers: false,
    infantFeeding: null,
    comfortItems: null,
    responsibleMemberId: null,
    ...partial,
  };
}

export function pet(partial: Partial<PetInput> & Pick<PetInput, "species">): PetInput {
  return { id: uuid(), name: partial.species, quantity: 1, approxWeightKg: null, hasCarrier: false, hasMedication: false, ...partial };
}

export const dwelling = (partial: Partial<DwellingInput> = {}): DwellingInput => ({
  type: "apartment",
  floors: 1,
  hasGarden: false,
  hasFireplace: false,
  hasGas: true,
  hasElectricStove: false,
  hasSolarPanels: false,
  hasHomeBattery: false,
  hasGenerator: false,
  hasWell: false,
  ...partial,
});

export const settings = (partial: Partial<HomeKitSettings> = {}): HomeKitSettings => ({
  targetDays: 3,
  waterAdultLitersPerDay: null,
  includeHygieneWater: true,
  hotClimate: false,
  ...partial,
});

export function snapshot(partial: Partial<HouseholdSnapshot> = {}): HouseholdSnapshot {
  return { members: [], pets: [], dwelling: dwelling(), risks: [], communicationChannels: [], ...partial };
}
