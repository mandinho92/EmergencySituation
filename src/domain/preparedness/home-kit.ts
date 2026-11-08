import { computeFood, type FoodRequirement } from "./food";
import { productKeyOf, roundUp } from "./math";
import { CAT_LITTER_KG_PER_CAT_DAY, GAS_CARTRIDGE_DAYS, HYGIENE } from "./reference";
import type { HomeKitCategory, HomeKitRequirement, HomeKitSettings, HouseholdSnapshot, Priority } from "./types";
import { computeWater, type WaterBreakdown } from "./water";

export interface HomeKitPlan {
  water: WaterBreakdown;
  requirements: (HomeKitRequirement | FoodRequirement)[];
  personDays: number;
}

function req(
  key: string,
  name: string,
  category: HomeKitCategory,
  quantity: number,
  priority: Priority,
  rationale: string,
  unit = "un",
  purchasable = true,
): HomeKitRequirement {
  return { key, name, category, unit, quantity, priority, rationale, productKey: productKeyOf(key), purchasable };
}

/**
 * Builds the HOME KIT requirement list for staying at home during
 * `settings.targetDays` days. Every requirement carries a stable `key` so the
 * family's progress (quantity owned, purchases) can be stored independently of
 * the computed quantity.
 */
export function buildHomeKitPlan(snapshot: HouseholdSnapshot, settings: HomeKitSettings): HomeKitPlan {
  const { members, pets, dwelling, risks } = snapshot;
  const days = settings.targetDays;
  const people = members.length;
  const nonBabies = members.filter((m) => m.category !== "baby").length;
  const adults = members.filter((m) => m.category === "adult" || m.category === "senior").length;
  const babies = members.filter((m) => m.category === "baby");
  const children = members.filter((m) => m.category === "child");
  const seniors = members.filter((m) => m.category === "senior");
  const mobility = members.filter((m) => m.reducedMobility);
  const withEquipment = members.filter((m) => m.specialEquipment && m.specialEquipment.trim().length > 0);
  const personDays = people * days;
  const has = (r: (typeof risks)[number]) => risks.includes(r);
  const dogs = pets.filter((p) => p.species === "dog").reduce((s, p) => s + p.quantity, 0);
  const cats = pets.filter((p) => p.species === "cat").reduce((s, p) => s + p.quantity, 0);
  const weeks = days / 7;

  const water = computeWater(members, pets, settings);
  const out: (HomeKitRequirement | FoodRequirement)[] = [];

  if (people === 0) {
    return { water, requirements: out, personDays };
  }

  // --- Water -----------------------------------------------------------------
  out.push(
    req("water.stored", "Água potável armazenada", "water", water.totalLiters, 0,
      `${water.perDay.total} L/dia × ${days} dia(s) + 10% de reserva (≈ ${water.containers.count} garrafões de ${water.containers.sizeLiters} L)`, "L"),
    req("water.container", "Recipiente alimentar para água (10–20 L)", "water", people > 4 ? 2 : 1, 2,
      "Para recolher e transportar água distribuída pelas autoridades"),
    req("water.purification", "Pastilhas ou filtro de purificação de água", "water", 1, dwelling.hasWell ? 1 : 2,
      dwelling.hasWell ? "Fonte própria de água: garantir tratamento se a qualidade for incerta" : "Alternativa se a água armazenada acabar", "emb."),
  );

  // --- Food ------------------------------------------------------------------
  out.push(...computeFood(members, pets, days));

  // --- Kitchen ----------------------------------------------------------------
  const needsStove = !dwelling.hasGas;
  out.push(
    req("kitchen.can_opener", "Abre-latas manual", "kitchen", 1, 0, "Não depende de eletricidade"),
    req("kitchen.lighter", "Isqueiro ou fósforos de reserva", "kitchen", 2, 1, "Guardar em local seco"),
  );
  if (needsStove) {
    out.push(
      req("kitchen.camping_stove", "Fogareiro de campismo", "kitchen", 1, dwelling.hasFireplace ? 2 : 1,
        dwelling.hasElectricStove ? "Fogão elétrico não funciona sem eletricidade" : "Sem gás na habitação", "un"),
      req("kitchen.gas_cartridges", "Cartuchos de gás para fogareiro", "kitchen", Math.max(1, Math.ceil(days / GAS_CARTRIDGE_DAYS)), 1,
        `≈ 1 cartucho por ${GAS_CARTRIDGE_DAYS} dias de confeção básica. Usar apenas em local ventilado`),
    );
  }
  out.push(req("kitchen.reusable_tableware", "Pratos, copos e talheres reutilizáveis", "kitchen", 1, 3, "Poupa água de lavagem com loiça descartável ou reutilizável simples", "conj."));

  // --- Hygiene ----------------------------------------------------------------
  const babyDays = babies.length * days;
  out.push(
    req("hygiene.toilet_paper", "Papel higiénico", "hygiene", Math.ceil(nonBabies * days * HYGIENE.toiletRollsPerPersonDay), 1, `${HYGIENE.toiletRollsPerPersonDay} rolo/pessoa/dia`, "rolos"),
    req("hygiene.wet_wipes", "Toalhitas", "hygiene", Math.ceil(personDays * HYGIENE.wipesPacksPerPersonDay + babyDays * HYGIENE.wipesPacksPerBabyDay), 1, "Higiene sem água", "emb."),
    req("hygiene.soap", "Sabonete", "hygiene", Math.max(1, Math.ceil(people * weeks * HYGIENE.soapBarsPerPersonWeek)), 1, "Lavagem das mãos"),
    req("hygiene.hand_sanitizer", "Gel desinfetante para as mãos", "hygiene", Math.max(1, Math.ceil(people * weeks * HYGIENE.sanitizerBottlesPerPersonWeek)), 1, "Frascos de ~250 ml", "frascos"),
    req("hygiene.trash_bags", "Sacos do lixo resistentes", "hygiene", Math.max(1, Math.ceil((personDays * HYGIENE.trashBagsPerPersonDay) / HYGIENE.trashBagsPerRoll)), 2, "Rolos de 20 sacos", "rolos"),
    req("hygiene.oral_care", "Escova e pasta de dentes de reserva", "hygiene", nonBabies, 2, "1 por pessoa", "kits"),
    req("hygiene.menstrual", "Produtos de higiene menstrual (se aplicável)", "hygiene", 1, 3, "Ajuste à sua família", "emb."),
  );

  // --- Sanitation (water supply failure) -------------------------------------
  out.push(
    req("sanitation.toilet_bags", "Sacos para sanita de emergência", "sanitation", Math.ceil(personDays * HYGIENE.emergencyToiletBagsPerPersonDay), has("water_outage") || has("earthquake") ? 1 : 2,
      "Para quando não houver água para descargas", "un"),
    req("sanitation.bleach", "Lixívia sem perfume (desinfeção)", "sanitation", 1, 2, "Seguir as instruções do rótulo", "L"),
    req("sanitation.gloves", "Luvas descartáveis", "sanitation", 1, 2, "Higiene e primeiros socorros", "caixa"),
  );

  // --- First aid ----------------------------------------------------------------
  out.push(
    req("first_aid.kit", "Kit de primeiros socorros doméstico", "first_aid", people > 6 ? 2 : 1, 0, "Um kit completo por habitação (dois para agregados grandes)"),
    req("first_aid.dressings", "Reforço de compressas, ligaduras e pensos", "first_aid", Math.max(1, Math.ceil(people / 4)), 1, "Reposição do kit", "emb."),
    req("first_aid.thermometer", "Termómetro", "first_aid", 1, 1, "Digital, com pilha de reserva"),
    req("first_aid.saline", "Soro fisiológico em unidoses", "first_aid", Math.max(1, Math.ceil(people / 3)), 2, "Limpeza de feridas e olhos", "emb."),
    req("first_aid.otc_pain_fever", "Analgésico/antipirético de venda livre para adultos", "first_aid", 1, 1, "Escolher com aconselhamento do farmacêutico", "emb."),
    req("first_aid.regular_medication", `Reserva da medicação habitual para ${days} dia(s) (se aplicável)`, "first_aid", 1, 1,
      "Confirmar com o médico ou farmacêutico a reserva adequada", "reserva", false),
  );

  // --- Fire -------------------------------------------------------------------
  const floors = Math.max(1, dwelling.floors ?? 1);
  out.push(
    req("fire.smoke_detector", "Detetor de fumo", "fire", dwelling.type === "apartment" ? 1 : Math.min(floors, 4), 1, "Pelo menos um por piso habitado"),
    req("fire.extinguisher", "Extintor doméstico (pó químico ABC)", "fire", 1, 1, "Junto à cozinha ou saída; verificar validade"),
    req("fire.blanket", "Manta ignífuga", "fire", 1, 1, "Para fogo em tachos e frigideiras"),
  );
  if (dwelling.hasFireplace || dwelling.hasGas || dwelling.hasGenerator) {
    out.push(req("fire.co_detector", "Detetor de monóxido de carbono", "fire", 1, 0,
      "Lareira, gás ou gerador: risco de intoxicação por monóxido de carbono"));
  }

  // --- Lighting ---------------------------------------------------------------
  out.push(
    req("lighting.flashlight", "Lanterna LED", "lighting", Math.max(2, nonBabies), 0, "Uma por pessoa (mínimo duas)"),
    req("lighting.area_lantern", "Candeeiro LED de área (campismo)", "lighting", floors > 1 || people > 4 ? 2 : 1, 1, "Iluminação de divisões sem velas"),
    req("lighting.batteries", "Pilhas de reserva (AA/AAA)", "lighting", 2 + Math.ceil(nonBabies / 2), 0, "Embalagens de 4; confirmar o tipo usado pelos seus equipamentos", "emb."),
  );

  // --- Communications ---------------------------------------------------------
  const usesPmr = snapshot.communicationChannels.includes("pmr446");
  out.push(
    req("communications.radio", "Rádio portátil (pilhas, manivela ou solar)", "communications", 1, 0, "Para seguir as indicações das autoridades sem Internet"),
    req("communications.powerbank", "Powerbank (10 000 mAh ou mais)", "communications", Math.max(1, adults), 0, "Uma por adulto; manter carregada"),
    req("communications.cables", "Cabos de carregamento de reserva", "communications", 1, 2, "Compatíveis com os telemóveis da família", "conj."),
    req("communications.pmr446", "Walkie-talkies PMR446 (par)", "communications", 1, usesPmr ? 1 : 3, usesPmr ? "Previsto no plano de comunicação" : "Opcional: comunicação de curto alcance sem rede", "par"),
  );

  // --- Energy (basic; the battery/solar module is separate and optional) -----
  out.push(req("energy.rechargeable_batteries", "Pilhas recarregáveis e carregador", "energy", 1, 3, "Reduz a dependência de pilhas descartáveis", "conj."));
  if (dwelling.hasGenerator) {
    out.push(req("energy.generator_fuel", "Combustível para o gerador (armazenado em segurança)", "energy", 1, 2,
      "Nunca usar o gerador dentro de casa ou garagem fechada", "reserva", false));
  }

  // --- Tools ------------------------------------------------------------------
  out.push(
    req("tools.multitool", "Canivete multifunções", "tools", 1, 2, "Ferramenta básica"),
    req("tools.duct_tape", "Fita adesiva resistente", "tools", 1, 2, "Reparações rápidas, vedação"),
    req("tools.work_gloves", "Luvas de trabalho", "tools", Math.max(1, Math.min(adults, 2)), 2, "Para limpeza e remoção de detritos", "pares"),
  );
  if (dwelling.hasGas) out.push(req("tools.shutoff_key", "Chave para fechar gás e água", "tools", 1, 1, "Saber onde estão as válvulas de corte"));
  if (has("earthquake")) out.push(req("tools.furniture_straps", "Fixações para móveis altos", "tools", 1, 2, "Reduz o risco de queda de móveis num sismo", "conj."));

  // --- Protection -------------------------------------------------------------
  out.push(
    req("protection.ffp2", "Máscaras FFP2", "protection", nonBabies * 2, has("wildfire") || has("earthquake") ? 1 : 2, "Fumo de incêndios e poeiras", "un"),
    req("protection.tarp", "Lona impermeável", "protection", 1, has("storm") || has("strong_wind") ? 2 : 3, "Proteção temporária de janelas ou telhado"),
    req("protection.whistle", "Apito", "protection", Math.max(1, nonBabies), 1, "Sinalizar a posição se ficar preso", "un"),
  );
  if (has("flood") && dwelling.type !== "apartment") {
    out.push(req("protection.flood_barrier", "Barreiras ou sacos anti-inundação", "protection", 4, 2, "Para portas e entradas ao nível do solo"));
  }

  // --- Shelter ----------------------------------------------------------------
  out.push(
    req("shelter.thermal_blanket", "Manta térmica de emergência", "shelter", people, 1, "Uma por pessoa"),
    req("shelter.blankets", "Cobertores ou sacos-cama extra", "shelter", people, has("cold_wave") ? 1 : 2, "Aquecimento sem eletricidade"),
  );

  // --- Documents --------------------------------------------------------------
  out.push(
    req("documents.waterproof_pouch", "Bolsa estanque para documentos", "documents", 1, 1, "Cópias de identificação, seguros, receitas"),
    req("documents.printed_plan", "Plano familiar e contactos impressos", "documents", 1, 0, "Use a exportação do plano nesta aplicação", "un", false),
    req("documents.cash", "Reserva de dinheiro em notas e moedas", "documents", 1, 1, "Pagamentos eletrónicos podem falhar num apagão", "reserva", false),
  );

  // --- Children ---------------------------------------------------------------
  const diaperBabies = babies.filter((b) => b.usesDiapers || b.ageYears == null || b.ageYears < 2);
  const diaperChildren = children.filter((c) => c.usesDiapers);
  const diapers = diaperBabies.length * HYGIENE.diapersPerBabyDay * days + diaperChildren.length * HYGIENE.diapersPerToddlerDay * days;
  if (diapers > 0) {
    out.push(req("children.diapers", "Fraldas", "children", Math.ceil(diapers), 0,
      `${diaperBabies.length + diaperChildren.length} criança(s) × ${days} dia(s); ajuste ao tamanho`, "un"));
    out.push(req("children.diaper_cream", "Creme para a muda da fralda", "children", 1, 2, "Higiene infantil"));
  }
  if (babies.length + children.length > 0) {
    out.push(
      req("children.pediatric_fever", "Medicação pediátrica para febre/dor", "children", 1, 1,
        "Apenas a indicada pelo pediatra para a idade e peso da criança", "emb."),
      req("children.activities", "Jogos, livros e atividades sem eletricidade", "children", 1, 3, "Ajuda a manter a rotina e a calma", "conj."),
    );
  }

  // --- Seniors / reduced mobility ---------------------------------------------
  if (seniors.length + mobility.length > 0) {
    out.push(req("seniors.spare_aids", "Óculos de reserva e pilhas para aparelhos auditivos (se aplicável)", "seniors", 1, 2,
      "Ajudas de uso diário", "conj."));
  }
  if (mobility.length > 0) {
    out.push(req("seniors.mobility_plan", "Plano de apoio à mobilidade (quem ajuda, como sair de casa)", "seniors", mobility.length, 0,
      `${mobility.length} pessoa(s) com mobilidade reduzida`, "un", false));
  }
  for (const m of withEquipment) {
    out.push(req(`seniors.equipment.${m.id}`, `Reserva e alimentação do equipamento especial — ${m.displayName}`, "seniors", 1, 0,
      "Se depende de eletricidade, configure-o na calculadora de energia", "un", false));
  }

  // --- Pets (food is generated with the food lines) ---------------------------
  if (cats > 0) {
    out.push(req("pets.cat_litter", "Areia para gatos", "pets", roundUp(cats * days * CAT_LITTER_KG_PER_CAT_DAY, 1), 1, `${CAT_LITTER_KG_PER_CAT_DAY} kg/gato/dia`, "kg"));
  }
  if (dogs > 0) out.push(req("pets.waste_bags", "Sacos para dejetos", "pets", 1, 2, "Passeios curtos durante o isolamento", "rolo"));
  for (const p of pets.filter((x) => x.hasMedication)) {
    out.push(req(`pets.medication.${p.id}`, `Reserva de medicação — ${p.name}`, "pets", days, 0, "Confirmar com o médico veterinário", "dias", false));
  }

  return { water, requirements: out, personDays };
}
