/**
 * Budget allocation for the shopping list.
 *
 * Rules:
 *  1. Lines are processed by priority (P0 first); inside a priority, cheaper
 *     lines first so more needs are covered.
 *  2. If a line of priority P does not fit, the remaining budget is reserved
 *     for it: lower priorities are not allocated (essentials are never pushed
 *     out by optional items).
 *  3. Nothing is removed: lines outside the budget stay visible as pending.
 *  4. Lines without a price are reported separately and never counted as
 *     affordable or unaffordable.
 */
import type { Priority } from "../preparedness/types";

export interface BudgetLine {
  id: string;
  priority: Priority;
  category: string;
  /** Total cost of the missing quantity, in cents; null when unknown. */
  costCents: number | null;
}

export type BudgetStatus = "within_budget" | "over_budget" | "no_price";

export interface BudgetResult {
  status: Record<string, BudgetStatus>;
  totalCents: number;
  essentialCents: number;
  withinBudgetCents: number;
  remainingBudgetCents: number | null;
  linesWithoutPrice: number;
  /** First priority that could not be fully covered, if any. */
  blockedAtPriority: Priority | null;
  byCategory: Array<{ category: string; totalCents: number; withinBudgetCents: number }>;
}

export function allocateBudget(lines: BudgetLine[], budgetCents: number | null): BudgetResult {
  const status: Record<string, BudgetStatus> = {};
  const priced = lines.filter((l) => l.costCents != null) as Array<BudgetLine & { costCents: number }>;
  for (const l of lines) if (l.costCents == null) status[l.id] = "no_price";

  const sorted = [...priced].sort((a, b) => a.priority - b.priority || a.costCents - b.costCents || a.id.localeCompare(b.id));
  let remaining = budgetCents ?? Number.POSITIVE_INFINITY;
  let blockedAt: Priority | null = null;
  let within = 0;
  for (const l of sorted) {
    if (blockedAt != null && l.priority > blockedAt) {
      status[l.id] = "over_budget";
      continue;
    }
    if (l.costCents <= remaining) {
      remaining -= l.costCents;
      within += l.costCents;
      status[l.id] = "within_budget";
    } else {
      status[l.id] = "over_budget";
      if (blockedAt == null) blockedAt = l.priority;
    }
  }

  const categories = new Map<string, { totalCents: number; withinBudgetCents: number }>();
  for (const l of priced) {
    const c = categories.get(l.category) ?? { totalCents: 0, withinBudgetCents: 0 };
    c.totalCents += l.costCents;
    if (status[l.id] === "within_budget") c.withinBudgetCents += l.costCents;
    categories.set(l.category, c);
  }

  return {
    status,
    totalCents: priced.reduce((s, l) => s + l.costCents, 0),
    essentialCents: priced.filter((l) => l.priority === 0).reduce((s, l) => s + l.costCents, 0),
    withinBudgetCents: within,
    remainingBudgetCents: budgetCents == null ? null : Math.max(0, budgetCents - within),
    linesWithoutPrice: lines.length - priced.length,
    blockedAtPriority: blockedAt,
    byCategory: [...categories.entries()].map(([category, v]) => ({ category, ...v })).sort((a, b) => b.totalCents - a.totalCents),
  };
}

/** Budget presets offered in the UI (cents). `max` null = open-ended. */
export const BUDGET_PRESETS: Array<{ key: string; label: string; cents: number | null }> = [
  { key: "100", label: "Até 100 €", cents: 10000 },
  { key: "300", label: "100–300 €", cents: 30000 },
  { key: "500", label: "300–500 €", cents: 50000 },
  { key: "1000", label: "500–1.000 €", cents: 100000 },
  { key: "2000", label: "1.000–2.000 €", cents: 200000 },
  { key: "unlimited", label: "Mais de 2.000 €", cents: null },
];
