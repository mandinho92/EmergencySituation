import { ExternalLink, Package } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Notice, PageHeader } from "@/components/ui/misc";
import { formatDate, formatMoney } from "@/i18n/format";
import { CATEGORY_LABEL, STORE_LABEL } from "@/i18n/messages";
import { requireFamily } from "@/lib/session";
import { cn } from "@/lib/utils";
import { PriceTag } from "@/modules/products/price-tag";
import { bestPrice, loadCatalogue } from "@/modules/products/pricing";

export const metadata: Metadata = { title: "Produtos" };

export default async function ProductsPage({ searchParams }: PageProps<"/app/products">) {
  await requireFamily();
  const cat = (await searchParams).category;
  const products = await loadCatalogue();
  const categories = [...new Set(products.map((p) => p.category))].sort((a, b) => (CATEGORY_LABEL[a] ?? a).localeCompare(CATEGORY_LABEL[b] ?? b));
  const visible = typeof cat === "string" ? products.filter((p) => p.category === cat) : products;
  const brand = visible.filter((p) => p.brand);
  const generic = visible.filter((p) => !p.brand);

  return (
    <>
      <PageHeader icon={Package} title="Produtos" description="Catálogo de referência usado para estimar custos e comparar equipamentos." />
      <Notice tone="warning" title="Dados de demonstração" className="mb-4">
        Este catálogo inicial não tem integrações com lojas. Referências genéricas mostram estimativas de planeamento; produtos de marca mostram especificações confirmadas em listagens públicas e um preço de referência observado numa loja (fonte e data indicadas) — não é uma oferta e pode ter mudado. Confirme sempre na loja ou no fabricante antes de comprar.
      </Notice>
      <div className="mb-4 flex flex-wrap gap-1.5">
        <Link href="/app/products" className={cn("rounded-full px-3 py-1 text-sm", !cat ? "bg-brand-700 text-white" : "bg-white ring-1 ring-slate-200")}>Todos</Link>
        {categories.map((c) => <Link key={c} href={`/app/products?category=${c}`} className={cn("rounded-full px-3 py-1 text-sm", cat === c ? "bg-brand-700 text-white" : "bg-white ring-1 ring-slate-200")}>{CATEGORY_LABEL[c] ?? c}</Link>)}
      </div>

      {brand.length > 0 && (
        <Card className="mb-4">
          <CardHeader><CardTitle>Equipamentos de marca</CardTitle><Link href="/app/energy" className="text-xs text-brand-600 hover:underline">Calcular a solução de energia</Link></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="text-left text-xs text-slate-500"><tr><th className="py-2 font-medium">Produto</th><th className="font-medium">Capacidade</th><th className="font-medium">Saída AC</th><th className="font-medium">Pico</th><th className="font-medium">Carrega com painel solar</th><th className="font-medium">Química</th><th className="font-medium">Peso</th><th className="font-medium">Expansível</th><th className="font-medium">Preço</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {brand.map((p) => {
                    const s = p.product_energy_specs;
                    const price = bestPrice(p);
                    return (
                      <tr key={p.id}>
                        <td className="py-2.5"><p className="font-medium">{p.name}</p>{p.specs_source_url && <a href={p.specs_source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-xs text-brand-600 hover:underline">Fonte das especificações ({formatDate(p.specs_checked_on)}) <ExternalLink className="size-3" aria-hidden /></a>}</td>
                        <td className="tabular-nums">{s?.capacity_wh ? `${s.capacity_wh} Wh` : "—"}</td>
                        <td className="tabular-nums">{s?.ac_output_w ? `${s.ac_output_w} W` : "—"}</td>
                        <td className="tabular-nums">{s?.surge_w ? `${s.surge_w} W` : "—"}</td>
                        <td>{s?.solar_input_max_w ? `Sim, até ${s.solar_input_max_w} W` : s?.kind === "power_station" ? <span className="text-slate-400">Sim · potência a confirmar</span> : "—"}</td>
                        <td>{s?.chemistry ?? "—"}</td>
                        <td className="tabular-nums">{s?.weight_kg ? `${s.weight_kg} kg` : "—"}</td>
                        <td>{s?.expandable == null ? "—" : s.expandable ? "Sim" : "Não"}</td>
                        <td className="min-w-48 py-2.5"><PriceTag price={price} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {generic.map((p) => {
          const price = bestPrice(p);
          return (
            <li key={p.id}>
              <Card className="flex h-full gap-3 p-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-semibold text-slate-500 uppercase" aria-hidden>{(CATEGORY_LABEL[p.category] ?? "").slice(0, 3)}</div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{p.name}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge>{CATEGORY_LABEL[p.category]}</Badge>
                    <Badge tone={p.data_status === "verified" ? "ready" : "outline"}>{p.data_status === "verified" ? "Verificado" : "Demonstração"}</Badge>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">
                    {price ? `${price.kind === "estimate" ? "≈ " : ""}${formatMoney(price.unitCents)}${p.unit_label ? ` / ${p.unit_label}` : ""} · ${price.kind === "verified" ? `${STORE_LABEL[price.store ?? "other"]}, ${formatDate(price.date)}` : `estimativa de ${formatDate(price.date)}`}` : "Sem preço"}
                  </p>
                  {p.description && <p className="mt-1 text-xs text-slate-400">{p.description}</p>}
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </>
  );
}
