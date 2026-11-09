import "server-only";
import { allocateBudget, type BudgetStatus } from "@/domain/budget/budget";
import type { KitLine } from "@/domain/preparedness/kit-lines";
import type { Priority } from "@/domain/preparedness/types";
import { createClient } from "@/lib/supabase/server";
import { loadAccountNames } from "@/modules/kits/view";
import { loadPreparedness } from "@/modules/preparedness/load";
import { bestPrice, loadPriceIndex, priceForLine } from "@/modules/products/pricing";

export interface ShoppingLine {
  id: string;
  source: "home" | "bag" | "manual" | "energy";
  sourceLabel: string;
  name: string;
  category: string;
  priority: Priority;
  quantity: number;
  unit: string;
  status: "to_buy" | "purchased" | "owned";
  unitCents: number | null;
  totalCents: number | null;
  priceKind: "verified" | "reference" | "estimate" | "manual" | null;
  priceDate: string | null;
  store: string | null;
  url: string | null;
  boughtBy: string | null;
  budget: BudgetStatus | null;
  cheaper: { name: string; unitCents: number } | null;
  /** Reference for item-state operations on kit lines. */
  kit: { kind: "home" | "bag"; bagId?: string; key?: string; rowId?: string; required: number } | null;
}

/** Suggested store types when no verified store price exists (text only, no fabricated links). */
export const STORE_HINT: Record<string, string> = {
  water: "Supermercados", food: "Supermercados", hygiene: "Supermercados", sanitation: "Supermercados, drogarias",
  first_aid: "Farmácias, parafarmácias", children: "Supermercados, farmácias", pets: "Lojas de animais, supermercados",
  lighting: "Decathlon, Leroy Merlin, Worten", communications: "Worten, Decathlon", energy: "Worten, Leroy Merlin, fornecedores especializados",
  kitchen: "Decathlon, supermercados", tools: "Leroy Merlin", fire: "Leroy Merlin, fornecedores de segurança", protection: "Leroy Merlin, Decathlon",
  shelter: "Decathlon", documents: "Papelarias, Decathlon", clothing: "Decathlon", medication: "Farmácias", money: "—", seniors: "Farmácias, ortopedias",
};

export async function loadShopping(familyId: string, budgetCents: number | null) {
  const supabase = await createClient();
  const [data, prices, names, manual, energy] = await Promise.all([
    loadPreparedness(familyId),
    loadPriceIndex(),
    loadAccountNames(familyId),
    supabase.from("shopping_list_items").select("*").eq("family_id", familyId).order("created_at"),
    supabase.from("energy_profiles").select("tier, selected_station_product_id, selected_panel_product_id, panel_count, station_acquired, panels_acquired").eq("family_id", familyId).single(),
  ]);

  const cheaperFor = (line: KitLine, currentCents: number | null) => {
    if (!line.productKey || currentCents == null) return null;
    const alt = prices.products
      .filter((p) => p.item_key === line.productKey && p.id !== line.productId)
      .map((p) => ({ p, price: bestPrice(p) }))
      .filter((x) => x.price && x.price.unitCents < currentCents)
      .sort((a, b) => a.price!.unitCents - b.price!.unitCents)[0];
    return alt ? { name: alt.p.name, unitCents: alt.price!.unitCents } : null;
  };

  const fromKit = (l: KitLine, source: "home" | "bag", sourceLabel: string, bagId?: string): ShoppingLine | null => {
    if (l.excluded || !l.purchasable) return null;
    const status = l.missing > 0 ? "to_buy" : l.acquiredVia === "owned" ? "owned" : l.acquiredVia === "purchased" ? "purchased" : null;
    if (!status) return null;
    const price = priceForLine(l, prices);
    const qty = status === "to_buy" ? l.missing : l.required;
    return {
      id: `${source}:${bagId ?? ""}:${l.id}`,
      source,
      sourceLabel,
      name: l.name,
      category: l.category,
      priority: l.priority,
      quantity: qty,
      unit: l.unit,
      status,
      unitCents: price?.unitCents ?? null,
      totalCents: price ? Math.round(price.unitCents * qty) : null,
      priceKind: price?.kind ?? null,
      priceDate: price?.date ?? null,
      store: price?.store ?? null,
      url: price?.url ?? null,
      boughtBy: l.purchasedBy ? names.get(l.purchasedBy) ?? null : null,
      budget: null,
      cheaper: status === "to_buy" ? cheaperFor(l, price?.unitCents ?? null) : null,
      kit: { kind: source, bagId, key: l.rowId ? undefined : l.key ?? undefined, rowId: l.rowId ?? undefined, required: l.required },
    };
  };

  const lines: ShoppingLine[] = [
    ...data.homeLines.map((l) => fromKit(l, "home", "HOME KIT")),
    ...data.bags.flatMap((b) => b.lines.map((l) => fromKit(l, "bag", b.bag.name, b.bag.id))),
  ].filter((x): x is ShoppingLine => x !== null);

  for (const m of manual.data ?? []) {
    const price = m.estimated_unit_price_cents;
    lines.push({
      id: `manual:${m.id}`, source: "manual", sourceLabel: "Adicionado manualmente", name: m.name, category: m.category, priority: m.priority as Priority,
      quantity: Number(m.quantity), unit: m.unit, status: m.status === "purchased" ? "purchased" : "to_buy",
      unitCents: price, totalCents: price == null ? null : Math.round(price * Number(m.quantity)), priceKind: price == null ? null : "manual", priceDate: null,
      store: m.store, url: m.url, boughtBy: m.purchased_by ? names.get(m.purchased_by) ?? null : null, budget: null, cheaper: null, kit: null,
    });
  }

  // Optional energy module: only once the family chose a product, and only until acquired.
  const e = energy.data;
  if (e && ["economic", "balanced", "advanced", "manual"].includes(e.tier)) {
    for (const [pid, acquired, qty] of [[e.selected_station_product_id, e.station_acquired, 1], [e.selected_panel_product_id, e.panels_acquired, e.panel_count ?? 1]] as const) {
      if (!pid) continue;
      const p = prices.products.find((x) => x.id === pid);
      if (!p) continue;
      const price = bestPrice(p);
      lines.push({
        id: `energy:${pid}`, source: "energy", sourceLabel: "Energia (opcional)", name: p.name, category: "energy", priority: 3, quantity: qty, unit: "un",
        status: acquired ? "purchased" : "to_buy", unitCents: price?.unitCents ?? null, totalCents: price ? price.unitCents * qty : null, priceKind: price?.kind ?? null,
        priceDate: price?.date ?? null, store: price?.store ?? null, url: price?.url ?? null, boughtBy: null, budget: null, cheaper: null, kit: null,
      });
    }
  }

  const toBuy = lines.filter((l) => l.status === "to_buy");
  const budget = allocateBudget(toBuy.map((l) => ({ id: l.id, priority: l.priority, category: l.category, costCents: l.totalCents })), budgetCents);
  for (const l of toBuy) l.budget = budget.status[l.id] ?? null;

  return { lines, budget, familyId };
}
