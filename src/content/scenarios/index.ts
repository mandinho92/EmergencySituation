import type { Locale } from "@/i18n/config";
import { SCENARIOS_PT } from "./pt-PT";
import type { Audience, Scenario } from "./types";

export * from "./types";

const BY_LOCALE: Record<Locale, Scenario[]> = { "pt-PT": SCENARIOS_PT, en: SCENARIOS_PT, es: SCENARIOS_PT, fr: SCENARIOS_PT };

export function listScenarios(locale: Locale = "pt-PT"): Scenario[] {
  return BY_LOCALE[locale];
}

export function getScenario(key: string, locale: Locale = "pt-PT"): Scenario | undefined {
  return BY_LOCALE[locale].find((s) => s.key === key);
}

export interface HouseholdAudience {
  children: boolean;
  pets: boolean;
  mobility: boolean;
  seniors: boolean;
}

/** Filters a scenario's checklist and adaptations to the household composition. */
export function adaptScenario(s: Scenario, a: HouseholdAudience | null) {
  const include = (aud?: Audience) => !aud || !a || a[aud];
  return {
    checklist: s.checklist.filter((c) => include(c.audience)),
    adaptations: Object.entries(s.adaptations ?? {})
      .filter(([aud]) => include(aud as Audience))
      .flatMap(([, items]) => items ?? []),
  };
}
