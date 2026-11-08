import "server-only";
import { cache } from "react";
import type { KitLine } from "@/domain/preparedness/kit-lines";
import { createClient } from "@/lib/supabase/server";

export interface PriceInfo {
  productId: string;
  productName: string;
  unitCents: number;
  /** "verified" = a dated store price exists; "estimate" = planning estimate only. */
  kind: "verified" | "estimate";
  store: string | null;
  url: string | null;
  date: string | null;
}

export interface CatalogueProduct {
  id: string;
  slug: string;
  item_key: string | null;
  category: string;
  name: string;
  brand: string | null;
  model: string | null;
  description: string | null;
  data_status: string;
  specs_source_url: string | null;
  specs_checked_on: string | null;
  estimated_price_cents: number | null;
  estimate_date: string | null;
  unit_label: string | null;
  product_prices: Array<{ store: string; price_cents: number; url: string | null; checked_at: string }>;
  product_energy_specs: {
    kind: string;
    capacity_wh: number | null;
    ac_output_w: number | null;
    surge_w: number | null;
    solar_input_max_w: number | null;
    panel_w: number | null;
    chemistry: string | null;
    weight_kg: number | null;
    warranty_years: number | null;
    expandable: boolean | null;
    max_expanded_wh: number | null;
  } | null;
}

export const loadCatalogue = cache(async (): Promise<CatalogueProduct[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_catalog")
    .select("id, slug, item_key, category, name, brand, model, description, data_status, specs_source_url, specs_checked_on, estimated_price_cents, estimate_date, unit_label, product_prices(store, price_cents, url, checked_at), product_energy_specs(*)")
    .eq("is_active", true)
    .order("name");
  if (error) throw new Error(`loadCatalogue: ${error.message}`);
  return (data ?? []) as unknown as CatalogueProduct[];
});

/** Best price for a product: the cheapest verified store price, else the planning estimate. */
export function bestPrice(p: CatalogueProduct): PriceInfo | null {
  const verified = [...p.product_prices].sort((a, b) => a.price_cents - b.price_cents)[0];
  if (verified) return { productId: p.id, productName: p.name, unitCents: verified.price_cents, kind: "verified", store: verified.store, url: verified.url, date: verified.checked_at };
  if (p.estimated_price_cents != null) return { productId: p.id, productName: p.name, unitCents: p.estimated_price_cents, kind: "estimate", store: null, url: null, date: p.estimate_date };
  return null;
}

/** item_key → cheapest known price; product id → price. */
export const loadPriceIndex = cache(async () => {
  const products = await loadCatalogue();
  const byKey = new Map<string, PriceInfo>();
  const byProduct = new Map<string, PriceInfo>();
  for (const p of products) {
    const price = bestPrice(p);
    if (!price) continue;
    byProduct.set(p.id, price);
    if (!p.item_key) continue;
    const current = byKey.get(p.item_key);
    if (!current || price.unitCents < current.unitCents) byKey.set(p.item_key, price);
  }
  return { byKey, byProduct, products };
});

/** Price applicable to a kit line: the chosen product first, else the cheapest for its key. */
export function priceForLine(line: KitLine, index: Awaited<ReturnType<typeof loadPriceIndex>>): PriceInfo | null {
  if (line.productId && index.byProduct.has(line.productId)) return index.byProduct.get(line.productId)!;
  if (!line.purchasable || !line.productKey) return null;
  return index.byKey.get(line.productKey) ?? null;
}
