/**
 * Internationalisation configuration.
 *
 * v1 ships PT-PT only. The structure is ready for EN/ES/FR:
 *  - user locale is stored in profiles.locale;
 *  - number/date/currency formatting goes through ./format.ts;
 *  - shared UI vocabulary (categories, roles, statuses) lives in ./messages;
 *  - long-form content (scenarios) is keyed by locale in src/content.
 * Page copy is currently inline PT-PT; extracting it is tracked in docs/ROADMAP.md.
 */
export const LOCALES = ["pt-PT", "en", "es", "fr"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "pt-PT";
export const ENABLED_LOCALES: Locale[] = ["pt-PT"];
export const DEFAULT_CURRENCY = "EUR";
export const DEFAULT_COUNTRY = "PT";
