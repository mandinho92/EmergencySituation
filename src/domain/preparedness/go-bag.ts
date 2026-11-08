import { productKeyOf } from "./math";
import { CHILD_BAG_MIN_AGE, PET_DEFAULT_WEIGHT_KG, PET_FOOD_KG_PER_KG_DAY, bagWeightLimitGrams } from "./reference";
import type { BagCategory, BagRequirement, MemberInput, PetInput, Priority } from "./types";
import { petWaterPerDay } from "./water";

/**
 * GO BAGS — evacuation bags sized for ~72 hours away from home.
 *
 * Bags are intentionally light: water carried is limited (≈2 L for an adult)
 * and complemented by purification. Children younger than CHILD_BAG_MIN_AGE do
 * not get a bag of their own: their items are placed in the responsible adult's
 * bag. Shared items (radio) go into the family's primary bag only.
 */

export type BagKind = "adult" | "child" | "pet";

export interface BagInput {
  id: string;
  kind: BagKind;
  ownerMemberId: string | null;
  petId: string | null;
}

export interface BagContext {
  members: MemberInput[];
  pets: PetInput[];
  bags: BagInput[];
}

export const BAG_DURATION_HOURS = 72;

function item(
  key: string,
  name: string,
  category: BagCategory,
  quantity: number,
  unitWeightGrams: number,
  priority: Priority,
  rationale = "",
  unit = "un",
  purchasable = true,
): BagRequirement {
  return { key, name, category, quantity, unitWeightGrams, priority, rationale, unit, productKey: `bag.${productKeyOf(key)}`, purchasable };
}

/** The primary bag holds shared items: first adult bag by sort order. */
export function primaryBagId(bags: BagInput[]): string | null {
  return bags.find((b) => b.kind === "adult")?.id ?? null;
}

/** Adult bag that carries the items of a young child / baby. */
export function carrierBagFor(member: MemberInput, bags: BagInput[]): string | null {
  const adultBags = bags.filter((b) => b.kind === "adult");
  if (member.responsibleMemberId) {
    const bag = adultBags.find((b) => b.ownerMemberId === member.responsibleMemberId);
    if (bag) return bag.id;
  }
  return adultBags[0]?.id ?? null;
}

function adultItems(isPrimary: boolean): BagRequirement[] {
  const items = [
    item("water.bottles", "Água em garrafas (0,5–1,5 L)", "water", 2, 1000, 0, "≈ 2 L; complementar com purificação", "L"),
    item("water.purification", "Pastilhas de purificação de água", "water", 1, 30, 1, "", "emb."),
    item("water.reusable_bottle", "Garrafa ou cantil reutilizável", "water", 1, 150, 2),
    item("food.energy_bars", "Barras energéticas ou alimentos prontos a comer", "food", 6, 60, 0, "2 por dia durante 72 h"),
    item("food.easy_open_cans", "Conservas de abertura fácil", "food", 3, 150, 1),
    item("food.nuts", "Frutos secos", "food", 1, 200, 2, "", "emb."),
    item("clothing.change", "Muda de roupa completa", "clothing", 1, 800, 1, "Adequada à estação", "conj."),
    item("clothing.rain_jacket", "Casaco impermeável ou corta-vento", "clothing", 1, 400, 1),
    item("clothing.socks", "Meias extra", "clothing", 2, 60, 2, "", "pares"),
    item("clothing.hat", "Gorro ou chapéu", "clothing", 1, 80, 2),
    item("hygiene.kit", "Kit de higiene pessoal (escova, pasta, sabonete)", "hygiene", 1, 250, 1),
    item("hygiene.wipes", "Toalhitas", "hygiene", 1, 300, 1, "", "emb."),
    item("hygiene.sanitizer", "Gel desinfetante (formato pequeno)", "hygiene", 1, 100, 1),
    item("hygiene.toilet_paper", "Papel higiénico", "hygiene", 1, 100, 2, "", "rolo"),
    item("hygiene.ffp2", "Máscaras FFP2", "hygiene", 3, 15, 1),
    item("first_aid.compact_kit", "Kit de primeiros socorros compacto", "first_aid", 1, 300, 0),
    item("medication.personal", "Medicação pessoal habitual para 7 dias (se aplicável)", "medication", 1, 100, 1, "Confirmar com o médico ou farmacêutico", "reserva", false),
    item("medication.prescriptions", "Cópia das receitas médicas (se aplicável)", "medication", 1, 10, 2, "", "un", false),
    item("lighting.headlamp", "Lanterna frontal LED", "lighting", 1, 100, 0),
    item("lighting.batteries", "Pilhas de reserva para a lanterna", "lighting", 1, 100, 1, "", "emb."),
    item("communications.powerbank", "Powerbank carregada", "communications", 1, 250, 0),
    item("communications.cable", "Cabo de carregamento", "communications", 1, 50, 1),
    item("communications.contacts_card", "Cartão de emergência com contactos (papel)", "communications", 1, 10, 0, "Exportável nesta aplicação", "un", false),
    item("documents.copies", "Cópias de documentos de identificação (bolsa estanque)", "documents", 1, 100, 0, "", "conj.", false),
    item("money.cash", "Dinheiro em notas e moedas", "money", 1, 50, 1, "", "reserva", false),
    item("protection.thermal_blanket", "Manta térmica de emergência", "protection", 1, 60, 1),
    item("protection.whistle", "Apito", "protection", 1, 20, 1),
    item("protection.poncho", "Poncho impermeável", "protection", 1, 150, 2),
    item("protection.work_gloves", "Luvas de trabalho", "protection", 1, 150, 2, "", "par"),
    item("protection.multitool", "Canivete multifunções", "protection", 1, 150, 2),
  ];
  if (isPrimary) {
    items.push(item("communications.radio", "Rádio portátil (pilhas ou manivela)", "communications", 1, 250, 1, "Um por família, na mochila principal"));
  }
  return items;
}

function childBagItems(member: MemberInput): BagRequirement[] {
  const items = [
    item("water.small_bottle", "Garrafa de água pequena", "water", 0.5, 1000, 0, "Leve para a criança transportar", "L"),
    item("food.snacks", "Snacks (barras, bolachas)", "food", 3, 50, 1),
    item("clothing.change", "Muda de roupa", "clothing", 1, 400, 1, "", "conj."),
    item("clothing.light_jacket", "Casaco leve impermeável", "clothing", 1, 250, 2),
    item("lighting.small_flashlight", "Lanterna pequena", "lighting", 1, 80, 1),
    item("protection.whistle", "Apito", "protection", 1, 20, 1, "Ensinar a criança a usar"),
    item("communications.id_card", "Cartão com nome e contactos da família", "communications", 1, 10, 0, "Exportável nesta aplicação", "un", false),
    item("protection.thermal_blanket", "Manta térmica de emergência", "protection", 1, 60, 2),
  ];
  items.push(item("children.comfort", member.comfortItems ? `Objeto de conforto: ${member.comfortItems}` : "Objeto de conforto (peluche, livro)", "children", 1, 150, 2, "Reduz a ansiedade", "un", false));
  return items;
}

/** Items for a young child or baby, carried by an adult. Keys are per member. */
function carriedChildItems(member: MemberInput): BagRequirement[] {
  const id = member.id;
  const name = member.displayName;
  const items: BagRequirement[] = [];
  const needsDiapers = member.category === "baby" ? member.usesDiapers || member.ageYears == null || member.ageYears < 2 : member.usesDiapers;
  if (needsDiapers) {
    items.push(item(`children.diapers.${id}`, `Fraldas para 72 h — ${name}`, "children", 18, 40, 0, "6 por dia"));
    items.push(item(`children.baby_wipes.${id}`, `Toalhitas de bebé — ${name}`, "children", 1, 300, 0, "", "emb."));
  }
  if (member.category === "baby" && member.infantFeeding !== "breastfeeding") {
    const food = member.infantFeeding === "baby_food" ? "Refeições infantis (boiões/papas)" : "Leite infantil e biberão";
    items.push(item(`children.infant_food.${id}`, `${food} para 72 h — ${name}`, "children", 3, 350, 0, "Quantidade conforme indicação do pediatra", "dias"));
  }
  items.push(
    item(`children.clothes.${id}`, `Muda de roupa — ${name}`, "children", 1, 300, 1, "", "conj."),
    item(`children.comfort.${id}`, member.comfortItems ? `Objeto de conforto de ${name}: ${member.comfortItems}` : `Objeto de conforto — ${name}`, "children", 1, 150, 2, "", "un", false),
    item(`children.id_card.${id}`, `Cartão de identificação com contactos — ${name}`, "children", 1, 10, 0, "", "un", false),
  );
  return items;
}

function petItems(pet: PetInput): BagRequirement[] {
  const perKg = PET_FOOD_KG_PER_KG_DAY[pet.species];
  const weight = pet.approxWeightKg ?? PET_DEFAULT_WEIGHT_KG[pet.species] ?? 5;
  const foodKg = perKg != null ? Math.max(0.1, Math.round(perKg * weight * pet.quantity * 3 * 10) / 10) : null;
  const waterL = Math.max(0.5, Math.round(petWaterPerDay(pet) * 3 * 2) / 2);
  const items = [
    foodKg != null
      ? item("pets.food", `Ração para 72 h — ${pet.name}`, "pets", foodKg, 1000, 0, "Estimativa por peso; siga o fabricante", "kg")
      : item("pets.food", `Alimentação para 72 h — ${pet.name}`, "pets", 3, 200, 0, "", "dias"),
    item("pets.water", `Água para 72 h — ${pet.name}`, "pets", waterL, 1000, 0, "", "L"),
    item("pets.bowls", "Taças dobráveis para água e comida", "pets", 1, 100, 1, "", "conj."),
    item("pets.documents", "Cópia do boletim sanitário e identificação", "pets", 1, 20, 0, "", "un", false),
    item("pets.photo", "Fotografia recente do animal", "pets", 1, 5, 1, "Ajuda a identificar se se perder", "un", false),
  ];
  if (pet.species === "dog") {
    items.push(item("pets.leash", "Trela e coleira com identificação", "pets", 1, 200, 0), item("pets.waste_bags", "Sacos para dejetos", "pets", 1, 50, 1, "", "rolo"));
  }
  if (!pet.hasCarrier && pet.species !== "dog") {
    items.push(item("pets.carrier", "Transportadora", "pets", 1, 1500, 0, "Obrigatória para evacuar a maioria dos animais pequenos"));
  }
  if (pet.hasMedication) items.push(item("pets.medication", "Medicação do animal para 7 dias", "pets", 1, 100, 0, "Confirmar com o veterinário", "reserva", false));
  return items;
}

/** Requirements for one bag given the whole family context. */
export function buildBagRequirements(bag: BagInput, ctx: BagContext): BagRequirement[] {
  if (bag.kind === "pet") {
    const pet = ctx.pets.find((p) => p.id === bag.petId);
    return pet ? petItems(pet) : [];
  }
  if (bag.kind === "child") {
    const owner = ctx.members.find((m) => m.id === bag.ownerMemberId);
    return owner ? childBagItems(owner) : childBagItems({ id: bag.id, displayName: "Criança", category: "child", ageYears: null, reducedMobility: false, dietaryNeeds: null, specialEquipment: null, usesDiapers: false, infantFeeding: null, comfortItems: null, responsibleMemberId: null });
  }

  const isPrimary = primaryBagId(ctx.bags) === bag.id;
  const items = adultItems(isPrimary);

  // Babies and children without their own bag are carried by an adult.
  const childBagOwners = new Set(ctx.bags.filter((b) => b.kind === "child").map((b) => b.ownerMemberId));
  for (const m of ctx.members) {
    if ((m.category === "baby" || m.category === "child") && !childBagOwners.has(m.id) && carrierBagFor(m, ctx.bags) === bag.id) {
      items.push(...carriedChildItems(m));
    }
  }
  // Pets without their own kit go into the primary bag.
  if (isPrimary) {
    const petBagPets = new Set(ctx.bags.filter((b) => b.kind === "pet").map((b) => b.petId));
    for (const p of ctx.pets.filter((x) => !petBagPets.has(x.id))) {
      items.push(...petItems(p).map((i) => ({ ...i, key: `${i.key}.${p.id}` })));
    }
  }
  return items;
}

export interface BagWeight {
  totalGrams: number;
  limitGrams: number | null;
  overLimit: boolean;
}

export function bagWeight(
  lines: Array<{ quantity: number; unitWeightGrams: number | null; excluded?: boolean }>,
  owner: MemberInput | null,
  kind: BagKind,
): BagWeight {
  const totalGrams = Math.round(lines.filter((l) => !l.excluded).reduce((s, l) => s + l.quantity * (l.unitWeightGrams ?? 0), 0));
  const limitGrams = kind === "pet" ? null : owner ? bagWeightLimitGrams(owner.category, owner.ageYears, owner.reducedMobility) : kind === "child" ? bagWeightLimitGrams("child", null, false) : bagWeightLimitGrams("adult", null, false);
  return { totalGrams, limitGrams, overLimit: limitGrams != null && totalGrams > limitGrams };
}

/** Suggested bags for a household: one per adult/senior, one per pet group. Child bags are optional. */
export function suggestBags(members: MemberInput[], pets: PetInput[]): Array<Omit<BagInput, "id"> & { name: string }> {
  const out: Array<Omit<BagInput, "id"> & { name: string }> = [];
  for (const m of members.filter((x) => x.category === "adult" || x.category === "senior")) {
    out.push({ kind: "adult", ownerMemberId: m.id, petId: null, name: `Mochila de ${m.displayName}` });
  }
  for (const p of pets) out.push({ kind: "pet", ownerMemberId: null, petId: p.id, name: `Kit de ${p.name}` });
  return out;
}

/** Children old enough for a light bag of their own (offered, not forced). */
export function childBagCandidates(members: MemberInput[], bags: BagInput[]): MemberInput[] {
  const owners = new Set(bags.filter((b) => b.kind === "child").map((b) => b.ownerMemberId));
  return members.filter((m) => m.category === "child" && (m.ageYears ?? 0) >= CHILD_BAG_MIN_AGE && !owners.has(m.id));
}
