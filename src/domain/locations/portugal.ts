/**
 * Portuguese districts / autonomous regions and indicative regional risks.
 *
 * IMPORTANT: the "high" flags are an indicative starting point based on
 * well-known national hazard patterns (seismic hazard in Lisbon/Tagus valley,
 * Algarve and the Azores; rural fire exposure across most of the mainland;
 * river/urban flooding in large basins). They are NOT an official risk
 * assessment. The family confirms or changes the list, and the UI points to
 * the municipal civil protection service and ANEPC for the official picture.
 */
import type { RiskKey } from "../preparedness/types";

export interface District {
  slug: string;
  name: string;
  region: "mainland" | "azores" | "madeira";
}

export const DISTRICTS: District[] = [
  { slug: "aveiro", name: "Aveiro", region: "mainland" },
  { slug: "beja", name: "Beja", region: "mainland" },
  { slug: "braga", name: "Braga", region: "mainland" },
  { slug: "braganca", name: "Bragança", region: "mainland" },
  { slug: "castelo-branco", name: "Castelo Branco", region: "mainland" },
  { slug: "coimbra", name: "Coimbra", region: "mainland" },
  { slug: "evora", name: "Évora", region: "mainland" },
  { slug: "faro", name: "Faro", region: "mainland" },
  { slug: "guarda", name: "Guarda", region: "mainland" },
  { slug: "leiria", name: "Leiria", region: "mainland" },
  { slug: "lisboa", name: "Lisboa", region: "mainland" },
  { slug: "portalegre", name: "Portalegre", region: "mainland" },
  { slug: "porto", name: "Porto", region: "mainland" },
  { slug: "santarem", name: "Santarém", region: "mainland" },
  { slug: "setubal", name: "Setúbal", region: "mainland" },
  { slug: "viana-do-castelo", name: "Viana do Castelo", region: "mainland" },
  { slug: "vila-real", name: "Vila Real", region: "mainland" },
  { slug: "viseu", name: "Viseu", region: "mainland" },
  { slug: "acores", name: "Região Autónoma dos Açores", region: "azores" },
  { slug: "madeira", name: "Região Autónoma da Madeira", region: "madeira" },
];

export const RISKS: Array<{ key: RiskKey; label: string; description: string }> = [
  { key: "wildfire", label: "Incêndios rurais e florestais", description: "Fumo, cortes de estradas e possíveis evacuações." },
  { key: "flood", label: "Cheias e inundações", description: "Cheias de rios e inundações urbanas por chuva intensa." },
  { key: "storm", label: "Tempestades", description: "Chuva intensa, trovoada e agitação marítima." },
  { key: "strong_wind", label: "Vento forte", description: "Queda de árvores e estruturas, cortes de energia." },
  { key: "heat_wave", label: "Ondas de calor", description: "Temperaturas elevadas durante vários dias." },
  { key: "cold_wave", label: "Ondas de frio", description: "Temperaturas baixas, gelo e neve em zonas altas." },
  { key: "earthquake", label: "Sismos", description: "Sismos e, em zonas costeiras, possibilidade de tsunami." },
  { key: "power_outage", label: "Falhas prolongadas de eletricidade", description: "Apagões locais ou generalizados." },
  { key: "water_outage", label: "Interrupções de água", description: "Cortes ou contaminação do abastecimento." },
  { key: "telecom_outage", label: "Falhas de telecomunicações", description: "Rede móvel, fixa ou Internet indisponíveis." },
];

/** Risks relevant to every household in Portugal. */
const UNIVERSAL: RiskKey[] = ["power_outage", "water_outage", "telecom_outage", "storm", "strong_wind", "heat_wave"];

const HIGH: Partial<Record<RiskKey, string[]>> = {
  earthquake: ["lisboa", "setubal", "faro", "santarem", "acores"],
  wildfire: [
    "aveiro", "braga", "braganca", "castelo-branco", "coimbra", "faro", "guarda", "leiria", "portalegre",
    "porto", "santarem", "viana-do-castelo", "vila-real", "viseu", "madeira",
  ],
  flood: ["santarem", "coimbra", "lisboa", "porto", "madeira"],
  cold_wave: ["braganca", "guarda", "vila-real", "viseu"],
};

export function isKnownDistrict(slug: string | null | undefined): boolean {
  return !!slug && DISTRICTS.some((d) => d.slug === slug);
}

/**
 * Default risks for a district: universal risks plus the regional ones flagged
 * as high. Without a district, all risks are considered relevant.
 */
export function defaultRisksFor(district: string | null): RiskKey[] {
  if (!district || !isKnownDistrict(district)) return RISKS.map((r) => r.key);
  const set = new Set<RiskKey>(UNIVERSAL);
  for (const [risk, districts] of Object.entries(HIGH) as Array<[RiskKey, string[]]>) {
    if (districts.includes(district)) set.add(risk);
  }
  return RISKS.map((r) => r.key).filter((k) => set.has(k));
}

/** Risks flagged as particularly relevant for the district (for UI emphasis). */
export function highlightedRisksFor(district: string | null): RiskKey[] {
  if (!district) return [];
  return (Object.entries(HIGH) as Array<[RiskKey, string[]]>).filter(([, ds]) => ds.includes(district)).map(([r]) => r);
}

export function effectiveRisks(selected: string[] | null, district: string | null): RiskKey[] {
  if (selected && selected.length > 0) {
    const valid = new Set(RISKS.map((r) => r.key));
    return selected.filter((s): s is RiskKey => valid.has(s as RiskKey));
  }
  return defaultRisksFor(district);
}
