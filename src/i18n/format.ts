import { DEFAULT_CURRENCY, DEFAULT_LOCALE, type Locale } from "./config";

export function formatMoney(cents: number | null | undefined, locale: Locale = DEFAULT_LOCALE, currency = DEFAULT_CURRENCY): string {
  if (cents == null) return "—";
  return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: cents % 100 === 0 ? 0 : 2 }).format(cents / 100);
}

export function formatNumber(value: number, locale: Locale = DEFAULT_LOCALE, maxDecimals = 1): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: maxDecimals }).format(value);
}

export function formatDate(iso: string | null | undefined, locale: Locale = DEFAULT_LOCALE): string {
  if (!iso) return "—";
  const d = iso.length === 10 ? new Date(`${iso}T12:00:00Z`) : new Date(iso);
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Lisbon" }).format(d);
}

export function formatDateTime(iso: string | null | undefined, locale: Locale = DEFAULT_LOCALE): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Lisbon" }).format(new Date(iso));
}

export function formatWeight(grams: number, locale: Locale = DEFAULT_LOCALE): string {
  return grams >= 1000 ? `${formatNumber(grams / 1000, locale, 1)} kg` : `${Math.round(grams)} g`;
}

/** "1 ano" / "3 anos". */
export function formatAge(years: number): string {
  return `${years} ${years === 1 ? "ano" : "anos"}`;
}
