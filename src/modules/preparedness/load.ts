import "server-only";
import { cache } from "react";
import { effectiveRisks } from "@/domain/locations/portugal";
import { foodAutonomyDays } from "@/domain/preparedness/food";
import { bagWeight, buildBagRequirements, type BagInput } from "@/domain/preparedness/go-bag";
import { buildHomeKitPlan } from "@/domain/preparedness/home-kit";
import { mergeKit, type KitLine } from "@/domain/preparedness/kit-lines";
import type { HomeKitSettings, HouseholdSnapshot, InfantFeeding, MemberInput, PetInput, PetSpecies } from "@/domain/preparedness/types";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

type Tables = Database["public"]["Tables"];
export type MemberRow = Tables["member_profiles"]["Row"];
export type PetRow = Tables["pets"]["Row"];
export type BagRow = Tables["evacuation_bags"]["Row"];

export function toMemberInput(m: MemberRow): MemberInput {
  return {
    id: m.id,
    displayName: m.display_name,
    category: m.category,
    ageYears: m.age_years,
    reducedMobility: m.reduced_mobility,
    dietaryNeeds: m.dietary_needs,
    specialEquipment: m.special_equipment,
    usesDiapers: m.uses_diapers,
    infantFeeding: (m.infant_feeding as InfantFeeding | null) ?? null,
    comfortItems: m.comfort_items,
    responsibleMemberId: m.responsible_member_id,
  };
}

export function toPetInput(p: PetRow): PetInput {
  return {
    id: p.id,
    name: p.name,
    species: p.species as PetSpecies,
    quantity: p.quantity,
    approxWeightKg: p.approx_weight_kg == null ? null : Number(p.approx_weight_kg),
    hasCarrier: p.has_carrier,
    hasMedication: !!p.medication && p.medication.trim().length > 0,
  };
}

export interface BagView {
  bag: BagRow;
  owner: MemberInput | null;
  lines: KitLine[];
  weight: ReturnType<typeof bagWeight>;
}

/**
 * Loads the family's preparedness state and evaluates the engine once per
 * request (React cache). All reads go through the user's session, so RLS applies.
 */
export const loadPreparedness = cache(async (familyId: string) => {
  const supabase = await createClient();
  const [members, pets, household, homeKit, homeRows, bags, bagRows, comm] = await Promise.all([
    supabase.from("member_profiles").select("*").eq("family_id", familyId).order("sort_order").order("created_at"),
    supabase.from("pets").select("*").eq("family_id", familyId).order("created_at"),
    supabase.from("household_profiles").select("*").eq("family_id", familyId).single(),
    supabase.from("home_kits").select("*").eq("family_id", familyId).single(),
    supabase.from("home_kit_items").select("*").eq("family_id", familyId),
    supabase.from("evacuation_bags").select("*").eq("family_id", familyId).order("sort_order").order("created_at"),
    supabase.from("evacuation_bag_items").select("*").eq("family_id", familyId),
    supabase.from("communication_plans").select("channels").eq("family_id", familyId).single(),
  ]);
  for (const r of [members, pets, household, homeKit, homeRows, bags, bagRows]) {
    if (r.error) throw new Error(`loadPreparedness: ${r.error.message}`);
  }

  const memberRows = members.data ?? [];
  const memberInputs = memberRows.map(toMemberInput);
  const petInputs = (pets.data ?? []).map(toPetInput);
  const h = household.data!;
  const kit = homeKit.data!;

  const snapshot: HouseholdSnapshot = {
    members: memberInputs,
    pets: petInputs,
    dwelling: {
      type: h.dwelling_type,
      floors: h.floors,
      hasGarden: h.has_garden,
      hasFireplace: h.has_fireplace,
      hasGas: h.has_gas,
      hasElectricStove: h.has_electric_stove,
      hasSolarPanels: h.has_solar_panels,
      hasHomeBattery: h.has_home_battery,
      hasGenerator: h.has_generator,
      hasWell: h.has_well,
    },
    risks: effectiveRisks(h.selected_risks, h.district),
    communicationChannels: comm.data?.channels ?? [],
  };
  const settings: HomeKitSettings = {
    targetDays: kit.target_days,
    waterAdultLitersPerDay: kit.water_adult_l_per_day == null ? null : Number(kit.water_adult_l_per_day),
    includeHygieneWater: kit.include_hygiene_water,
    hotClimate: kit.hot_climate,
  };

  const plan = buildHomeKitPlan(snapshot, settings);
  const homeLines = mergeKit(plan.requirements, homeRows.data ?? []);

  const bagList = bags.data ?? [];
  const bagInputs: BagInput[] = bagList.map((b) => ({ id: b.id, kind: b.kind as BagInput["kind"], ownerMemberId: b.owner_member_id, petId: b.pet_id }));
  const bagViews: BagView[] = bagList.map((bag, i) => {
    const reqs = buildBagRequirements(bagInputs[i], { members: memberInputs, pets: petInputs, bags: bagInputs });
    const lines = mergeKit(reqs, (bagRows.data ?? []).filter((r) => r.bag_id === bag.id));
    const owner = memberInputs.find((m) => m.id === bag.owner_member_id) ?? null;
    const weight = bagWeight(lines.map((l) => ({ quantity: l.required, unitWeightGrams: l.unitWeightGrams, excluded: l.excluded })), owner, bagInputs[i].kind);
    return { bag, owner, lines, weight };
  });

  const water = homeLines.find((l) => l.key === "water.stored");
  const foodDays = foodAutonomyDays(
    homeLines.filter((l) => l.group && !l.excluded && l.perDay).map((l) => ({ group: l.group!, perDay: l.perDay!, have: l.have })),
  );

  return {
    memberRows,
    members: memberInputs,
    pets: petInputs,
    petRows: pets.data ?? [],
    household: h,
    homeKit: kit,
    snapshot,
    settings,
    plan,
    homeLines,
    bags: bagViews,
    water: { requiredLiters: water?.required ?? plan.water.totalLiters, haveLiters: water?.have ?? 0, perDayTotal: plan.water.perDay.total },
    foodAutonomyDays: foodDays,
  };
});

export type PreparednessData = Awaited<ReturnType<typeof loadPreparedness>>;
