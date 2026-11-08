/** Round up to `decimals` places, tolerant to floating point noise (0.1 + 0.2). */
export function roundUp(value: number, decimals = 0): number {
  const f = 10 ** decimals;
  const r = Math.ceil(value * f - 1e-9) / f;
  return r === 0 ? 0 : r; // normalise -0
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/** Coverage ratio of have vs required, in [0, 1]. Requirements of 0 count as covered. */
export function coverage(have: number, required: number): number {
  if (required <= 0) return 1;
  return clamp01(have / required);
}

/** Catalogue key of a requirement: per-person/per-pet keys end with a UUID segment. */
export function productKeyOf(requirementKey: string): string {
  return requirementKey.replace(/\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "");
}
