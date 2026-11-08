import { productKeyOf, roundUp } from "./math";
import { FOOD_PER_EQ_DAY, MILK_L_PER_DAY, PET_DEFAULT_WEIGHT_KG, PET_FOOD_KG_PER_KG_DAY, foodEquivalent } from "./reference";
import type { HomeKitRequirement, MemberInput, PetInput } from "./types";

/** Groups used to compute food autonomy: the scarcest essential group limits autonomy. */
export type FoodGroup = "carbs" | "protein" | "dairy" | "snacks" | "infant" | "special" | "pet";

export interface FoodRequirement extends HomeKitRequirement {
  group: FoodGroup;
  /** Daily quantity in the requirement unit (quantity = perDay × days). */
  perDay: number;
}

/** Groups that determine the food autonomy indicator. */
export const ESSENTIAL_FOOD_GROUPS: FoodGroup[] = ["carbs", "protein", "infant"];

function line(
  key: string,
  name: string,
  unit: string,
  perDay: number,
  days: number,
  group: FoodGroup,
  priority: 0 | 1 | 2 | 3,
  rationale: string,
  decimals = 0,
): FoodRequirement | null {
  if (perDay <= 0) return null;
  return {
    key,
    name,
    category: key.startsWith("pets.") ? "pets" : "food",
    unit,
    perDay,
    quantity: roundUp(perDay * days, decimals),
    group,
    priority,
    rationale,
    productKey: productKeyOf(key),
    purchasable: true,
  };
}

export function computeFood(members: MemberInput[], pets: PetInput[], days: number): FoodRequirement[] {
  const eq = members.reduce((sum, m) => sum + foodEquivalent(m.category, m.ageYears), 0);
  const milk = members.reduce((sum, m) => sum + MILK_L_PER_DAY[m.category], 0);
  const eqLabel = `${roundUp(eq, 1)} pessoa(s)-equivalente × ${days} dia(s)`;
  const out: (FoodRequirement | null)[] = [
    line("food.rice", "Arroz", "kg", FOOD_PER_EQ_DAY.riceKg * eq, days, "carbs", 0, eqLabel, 1),
    line("food.pasta", "Massa", "kg", FOOD_PER_EQ_DAY.pastaKg * eq, days, "carbs", 0, eqLabel, 1),
    line("food.cereals", "Cereais, tostas ou bolachas", "kg", FOOD_PER_EQ_DAY.cerealsKg * eq, days, "carbs", 1, eqLabel, 1),
    line("food.canned_protein", "Conservas de peixe ou carne", "latas", FOOD_PER_EQ_DAY.cannedProteinUnits * eq, days, "protein", 0, eqLabel),
    line("food.legumes", "Leguminosas cozidas (grão, feijão)", "frascos", FOOD_PER_EQ_DAY.legumesUnits * eq, days, "protein", 0, eqLabel),
    line("food.milk_uht", "Leite UHT ou bebida vegetal", "L", milk, days, "dairy", 1, "0,25 L/dia por adulto, 0,5 L/dia por criança", 0),
    line("food.snacks", "Snacks energéticos (frutos secos, barras)", "kg", FOOD_PER_EQ_DAY.snacksKg * eq, days, "snacks", 2, eqLabel, 1),
  ];

  // Infant feeding: expressed in days of supply — quantities depend on the
  // product and paediatric guidance, which the app must not prescribe.
  for (const m of members.filter((x) => x.category === "baby")) {
    const feeding = m.infantFeeding;
    if (feeding === "breastfeeding") continue;
    if (feeding === "baby_food") {
      out.push(line(`food.baby_food.${m.id}`, `Refeições infantis (boiões/papas) — ${m.displayName}`, "dias", 1, days, "infant", 0, "Quantidade diária conforme a idade e indicação do pediatra"));
    } else {
      out.push(line(`food.infant_formula.${m.id}`, `Leite infantil — ${m.displayName}`, "dias", 1, days, "infant", 0, "Reserva em dias; quantidade conforme a marca e indicação do pediatra"));
    }
  }

  // Special diets: reserve flagged so the family adapts the generic list.
  const special = members.filter((m) => m.dietaryNeeds && m.dietaryNeeds.trim().length > 0);
  if (special.length > 0) {
    out.push(line("food.special_diet", "Alimentação adaptada a necessidades alimentares declaradas", "dias", 1, days, "special", 0, `${special.length} pessoa(s) com necessidades alimentares — substituir artigos incompatíveis`));
  }

  for (const p of pets) {
    const perKg = PET_FOOD_KG_PER_KG_DAY[p.species];
    if (perKg != null) {
      const weight = p.approxWeightKg ?? PET_DEFAULT_WEIGHT_KG[p.species] ?? 5;
      const perDay = Math.max(0.03, perKg * weight) * p.quantity;
      out.push(line(`pets.food.${p.id}`, `Ração — ${p.name}`, "kg", perDay, days, "pet", 0, `Estimativa por peso (${weight} kg); siga a indicação do fabricante`, 1));
    } else {
      out.push(line(`pets.food.${p.id}`, `Alimentação — ${p.name}`, "dias", 1, days, "pet", 0, "Reserva em dias conforme a espécie"));
    }
  }

  return out.filter((x): x is FoodRequirement => x !== null);
}

/**
 * Food autonomy in whole days.
 *
 * Items in the same group substitute each other (rice ↔ pasta), so a group's
 * autonomy is Σ have / Σ daily need. Infant lines are per baby and are not
 * substitutable, so the scarcest one counts. The scarcest essential group
 * limits the overall result. Returns null when nothing essential is required.
 */
export function foodAutonomyDays(lines: Array<{ group: FoodGroup; perDay: number; have: number }>): number | null {
  const essential = lines.filter((l) => ESSENTIAL_FOOD_GROUPS.includes(l.group) && l.perDay > 0);
  if (essential.length === 0) return null;

  const results: number[] = [];
  for (const group of ESSENTIAL_FOOD_GROUPS) {
    const inGroup = essential.filter((l) => l.group === group);
    if (inGroup.length === 0) continue;
    if (group === "infant") {
      results.push(Math.min(...inGroup.map((l) => l.have / l.perDay)));
    } else {
      const have = inGroup.reduce((s, l) => s + l.have, 0);
      const perDay = inGroup.reduce((s, l) => s + l.perDay, 0);
      results.push(have / perDay);
    }
  }
  return Math.floor(Math.min(...results) + 1e-9);
}
