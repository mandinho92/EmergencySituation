/**
 * Merges engine requirements with the family's persisted item state.
 *
 * - Generated items: requirement (derived) + optional row (state/overrides),
 *   joined by `key`.
 * - Custom items: rows with item_key = null.
 * - Rows whose key is no longer produced by the engine (household changed)
 *   are dropped from the active list but kept in the database, so history and
 *   inventory data are not lost if the change is reverted.
 */
import type { FoodGroup } from "./food";
import { productKeyOf } from "./math";
import type { Priority, Requirement } from "./types";

export interface KitItemRow {
  id: string;
  item_key: string | null;
  name: string;
  category: string;
  unit: string;
  quantity_required: number | null;
  quantity_have: number;
  priority: number;
  is_excluded: boolean;
  acquired_via: string | null;
  purchased_by: string | null;
  purchased_at: string | null;
  expires_on: string | null;
  product_id: string | null;
  notes: string | null;
  storage_location?: string | null;
  is_packed?: boolean;
  unit_weight_g?: number | null;
}

export interface KitLine {
  /** Stable identifier for UI lists: requirement key or `row:<id>`. */
  id: string;
  key: string | null;
  rowId: string | null;
  productKey: string | null;
  name: string;
  category: string;
  unit: string;
  required: number;
  computedRequired: number | null;
  have: number;
  missing: number;
  priority: Priority;
  excluded: boolean;
  isCustom: boolean;
  purchasable: boolean;
  rationale: string | null;
  acquiredVia: "purchased" | "owned" | null;
  purchasedBy: string | null;
  purchasedAt: string | null;
  expiresOn: string | null;
  productId: string | null;
  notes: string | null;
  storageLocation: string | null;
  isPacked: boolean;
  unitWeightGrams: number | null;
  group?: FoodGroup;
  perDay?: number;
}

type AnyRequirement = Requirement & { group?: FoodGroup; perDay?: number; unitWeightGrams?: number };

const toPriority = (p: number): Priority => (p <= 0 ? 0 : p >= 3 ? 3 : (p as Priority));

export function mergeKit(requirements: AnyRequirement[], rows: KitItemRow[]): KitLine[] {
  const byKey = new Map(rows.filter((r) => r.item_key).map((r) => [r.item_key as string, r]));
  const lines: KitLine[] = [];

  for (const req of requirements) {
    const row = byKey.get(req.key);
    const required = row?.quantity_required != null ? Number(row.quantity_required) : req.quantity;
    const have = row ? Number(row.quantity_have) : 0;
    const excluded = row?.is_excluded ?? false;
    lines.push({
      id: req.key,
      key: req.key,
      rowId: row?.id ?? null,
      productKey: req.productKey ?? productKeyOf(req.key),
      name: req.name,
      category: req.category,
      unit: req.unit,
      required,
      computedRequired: req.quantity,
      have,
      missing: excluded ? 0 : Math.max(0, round2(required - have)),
      priority: req.priority,
      excluded,
      isCustom: false,
      purchasable: req.purchasable,
      rationale: req.rationale || null,
      acquiredVia: (row?.acquired_via as KitLine["acquiredVia"]) ?? null,
      purchasedBy: row?.purchased_by ?? null,
      purchasedAt: row?.purchased_at ?? null,
      expiresOn: row?.expires_on ?? null,
      productId: row?.product_id ?? null,
      notes: row?.notes ?? null,
      storageLocation: row?.storage_location ?? null,
      isPacked: row?.is_packed ?? false,
      unitWeightGrams: row?.unit_weight_g ?? req.unitWeightGrams ?? null,
      group: req.group,
      perDay: req.perDay != null && req.quantity > 0 ? (req.perDay * required) / req.quantity : req.perDay,
    });
  }

  for (const row of rows.filter((r) => r.item_key == null)) {
    const required = Number(row.quantity_required ?? 0);
    const have = Number(row.quantity_have);
    lines.push({
      id: `row:${row.id}`,
      key: null,
      rowId: row.id,
      productKey: null,
      name: row.name,
      category: row.category,
      unit: row.unit,
      required,
      computedRequired: null,
      have,
      missing: row.is_excluded ? 0 : Math.max(0, round2(required - have)),
      priority: toPriority(row.priority),
      excluded: row.is_excluded,
      isCustom: true,
      purchasable: true,
      rationale: null,
      acquiredVia: (row.acquired_via as KitLine["acquiredVia"]) ?? null,
      purchasedBy: row.purchased_by,
      purchasedAt: row.purchased_at,
      expiresOn: row.expires_on,
      productId: row.product_id,
      notes: row.notes,
      storageLocation: row.storage_location ?? null,
      isPacked: row.is_packed ?? false,
      unitWeightGrams: row.unit_weight_g ?? null,
    });
  }
  return lines;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** A line is complete when nothing is missing (or it was excluded). */
export function isLineComplete(line: KitLine): boolean {
  return line.excluded || line.missing <= 0;
}

/** Priority weights used for coverage scores. */
export const PRIORITY_WEIGHT: Record<Priority, number> = { 0: 4, 1: 3, 2: 2, 3: 1 };

/**
 * Priority-weighted coverage in [0, 1]. Excluded lines are ignored.
 * `bag` mode: packed counts fully, owned-but-not-packed counts half.
 */
export function weightedCoverage(lines: KitLine[], mode: "home" | "bag" = "home"): number {
  let total = 0;
  let done = 0;
  for (const l of lines) {
    if (l.excluded || l.required <= 0) continue;
    const w = PRIORITY_WEIGHT[l.priority];
    total += w;
    const ratio = Math.min(1, l.have / l.required);
    done += w * (mode === "bag" ? (l.isPacked ? 1 : ratio * 0.5) : ratio);
  }
  return total === 0 ? 0 : done / total;
}
