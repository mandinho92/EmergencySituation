/** Shared PT-PT vocabulary. Keys mirror database/engine enums. */
export const ROLE_LABEL = { admin: "Administrador", editor: "Editor", member: "Membro", viewer: "Visualização" } as const;
export const ROLE_DESCRIPTION = {
  admin: "Gere a família, convites e permissões.",
  editor: "Configura o agregado, kits e o plano de emergência.",
  member: "Atualiza compras, inventário, mochilas e tarefas.",
  viewer: "Consulta o plano. Não vê dados de saúde.",
} as const;

export const MEMBER_CATEGORY_LABEL = { adult: "Adulto", child: "Criança", baby: "Bebé", senior: "Sénior" } as const;

export const CATEGORY_LABEL: Record<string, string> = {
  water: "Água",
  food: "Alimentação",
  energy: "Energia",
  kitchen: "Cozinha",
  first_aid: "Primeiros socorros",
  fire: "Incêndio",
  lighting: "Iluminação",
  communications: "Comunicações",
  hygiene: "Higiene",
  sanitation: "Saneamento",
  tools: "Ferramentas",
  protection: "Proteção",
  shelter: "Abrigo",
  documents: "Documentação",
  children: "Crianças",
  seniors: "Idosos",
  pets: "Animais",
  clothing: "Roupa",
  medication: "Medicamentos",
  money: "Dinheiro",
  other: "Outros",
};

export const HOME_KIT_CATEGORIES = ["water", "food", "energy", "kitchen", "first_aid", "fire", "lighting", "communications", "hygiene", "sanitation", "tools", "protection", "shelter", "documents", "children", "seniors", "pets"] as const;
export const BAG_CATEGORIES = ["water", "food", "clothing", "hygiene", "first_aid", "medication", "lighting", "communications", "documents", "money", "protection", "children", "pets"] as const;
export const ALL_CATEGORIES = [...new Set<string>([...HOME_KIT_CATEGORIES, ...BAG_CATEGORIES, "other"])];

export const PRIORITY_LABEL = { 0: "P0 · Essencial", 1: "P1 · Muito importante", 2: "P2 · Recomendado", 3: "P3 · Opcional" } as const;
export const PRIORITY_SHORT = { 0: "P0", 1: "P1", 2: "P2", 3: "P3" } as const;

export const DWELLING_LABEL = { apartment: "Apartamento", house: "Moradia", farm: "Quinta", other: "Outro" } as const;

export const PET_SPECIES_LABEL = { dog: "Cão", cat: "Gato", bird: "Ave", rabbit: "Coelho", rodent: "Roedor", reptile: "Réptil", fish: "Peixe", other: "Outro" } as const;

export const MEETING_POINT_KIND_LABEL = { near_home: "Perto de casa", out_of_area: "Fora da zona de residência", alternative: "Local alternativo" } as const;

export const CHANNEL_LABEL = {
  call: "Chamada telefónica",
  sms: "SMS",
  whatsapp: "WhatsApp",
  email: "Email",
  pmr446: "Walkie-talkie PMR446",
  radio: "Rádio",
  meeting_point: "Ponto de encontro físico",
} as const;

export const STORE_LABEL: Record<string, string> = {
  decathlon: "Decathlon",
  leroy_merlin: "Leroy Merlin",
  worten: "Worten",
  continente: "Continente",
  auchan: "Auchan",
  pingo_doce: "Pingo Doce",
  amazon_es: "Amazon Espanha",
  pharmacy: "Farmácia",
  specialist: "Fornecedor especializado",
  other: "Outra loja",
};

export const ENERGY_TIER_LABEL = {
  undecided: "Por decidir",
  none: "Não quero bateria",
  powerbanks: "Apenas powerbanks",
  economic: "Solução económica",
  balanced: "Solução equilibrada",
  advanced: "Solução avançada",
  manual: "Configuração manual",
} as const;
