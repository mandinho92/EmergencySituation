import type { RiskKey } from "@/domain/preparedness/types";

export type Audience = "children" | "pets" | "mobility" | "seniors";

export interface ChecklistItem {
  id: string;
  text: string;
  /** Shown only when the household includes this audience. */
  audience?: Audience;
}

export interface SourceRef {
  label: string;
  url: string;
}

export interface Scenario {
  key: string;
  title: string;
  summary: string;
  icon: string;
  /** Regional risk the scenario relates to (null = applies everywhere). */
  risk: RiskKey | null;
  kitStrategy: "go_bags" | "home_kit" | "both";
  meetingPoint: "near_home" | "out_of_area" | "alternative" | null;
  immediate: string[];
  dont: string[];
  stayHome: string[];
  evacuate: string[];
  equipment: string[];
  communication: string[];
  checklist: ChecklistItem[];
  after: string[];
  adaptations?: Partial<Record<Audience, string[]>>;
  sources: SourceRef[];
}

/**
 * Editorial status of the scenario library. Content is written from public
 * guidance of Portuguese authorities but has not yet been reviewed line by
 * line against the official documents. The UI shows this status and the
 * launch checklist (docs/CONTENT.md) requires validation before production.
 */
export const CONTENT_STATUS = {
  version: "2026-11-08",
  validated: false,
  note: "Procedimentos redigidos com base em recomendações públicas da ANEPC, DGS, INEM e IPMA. Validação editorial formal pendente.",
} as const;

export const EMERGENCY_NUMBERS = [
  { label: "Número Europeu de Emergência", number: "112", description: "Perigo imediato para pessoas: incêndio, acidente, emergência médica, crime." },
  { label: "SNS 24", number: "808 24 24 24", description: "Aconselhamento de saúde quando não há perigo imediato de vida." },
  { label: "Centro de Informação Antivenenos (CIAV)", number: "800 250 250", description: "Intoxicações e ingestão de substâncias." },
] as const;

export const SOURCES = {
  anepc: { label: "ANEPC — Autoridade Nacional de Emergência e Proteção Civil", url: "https://www.prociv.gov.pt" },
  ipma: { label: "IPMA — avisos meteorológicos", url: "https://www.ipma.pt" },
  dgs: { label: "DGS — Direção-Geral da Saúde", url: "https://www.dgs.pt" },
  inem: { label: "INEM — Instituto Nacional de Emergência Médica", url: "https://www.inem.pt" },
  sns24: { label: "SNS 24", url: "https://www.sns24.gov.pt" },
  municipal: { label: "Serviço Municipal de Proteção Civil da sua câmara", url: "https://www.prociv.gov.pt" },
} satisfies Record<string, SourceRef>;
