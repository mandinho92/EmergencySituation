import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { formatDate, formatNumber, formatWeight } from "@/i18n/format";
import { BAG_CATEGORIES, CATEGORY_LABEL } from "@/i18n/messages";
import { requireFamily } from "@/lib/session";
import { loadPreparedness } from "@/modules/preparedness/load";

export const metadata: Metadata = { title: "Checklist da mochila" };

export default async function PrintBagPage({ params }: PageProps<"/app/print/go-bag/[id]">) {
  const { id } = await params;
  const ctx = await requireFamily();
  const data = await loadPreparedness(ctx.family.id);
  const view = data.bags.find((b) => b.bag.id === id);
  if (!view) notFound();
  return (
    <article className="mx-auto max-w-3xl bg-white p-6 text-sm print:p-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{view.bag.name}</h1>
          <p className="text-slate-600">{ctx.family.name} · {view.owner ? `Responsável: ${view.owner.displayName} · ` : ""}Peso estimado {formatWeight(view.weight.totalGrams)} · {formatDate(new Date().toISOString())}</p>
        </div>
        <PrintButton />
      </div>
      {BAG_CATEGORIES.map((cat) => {
        const lines = view.lines.filter((l) => l.category === cat && !l.excluded);
        if (lines.length === 0) return null;
        return (
          <section key={cat} className="mt-4 break-inside-avoid">
            <h2 className="border-b border-slate-200 pb-1 font-semibold">{CATEGORY_LABEL[cat]}</h2>
            <ul className="mt-1">
              {lines.map((l) => (
                <li key={l.id} className="flex items-baseline gap-2 py-0.5">
                  <span className="inline-block size-3.5 shrink-0 border border-slate-500" aria-hidden>{l.isPacked ? "✓" : ""}</span>
                  <span className="flex-1">{l.name}</span>
                  <span className="tabular-nums text-slate-600">{formatNumber(l.required)} {l.unit}</span>
                  {l.expiresOn && <span className="text-slate-500">val. {formatDate(l.expiresOn)}</span>}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </article>
  );
}
