/** Date helpers (ISO yyyy-mm-dd). Server components render once per request, so "now" is stable per render. */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isoDaysFromNow(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}
