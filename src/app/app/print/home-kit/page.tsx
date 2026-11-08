import type { Metadata } from "next";
import { PrintButton } from "@/components/print-button";
import { formatDate, formatNumber } from "@/i18n/format";
import { CATEGORY_LABEL, HOME_KIT_CATEGORIES } from "@/i18n/messages";
import { requireFamily } from "@/lib/session";
import { loadPreparedness } from "@/modules/preparedness/load";

export const metadata: Metadata = { title: "HOME KIT — checklist" };

export default async function PrintHomeKitPage() {
  const ctx = await requireFamily();
  const data = await loadPreparedness(ctx.family.id);
  return (
    <article className="mx-auto max-w-3xl bg-white p-6 text-sm print:p-0">
      <div className="flex items-start justify-between gap-4">
        <div><h1 className="text-xl font-semibold">HOME KIT — {data.settings.targetDays} dia(s)</h1><p className="text-slate-600">{ctx.family.name} · {formatDate(new Date().toISOString())}</p></div>
        <PrintButton />
      </div>
      <table className="mt-4 w-full">
        <thead className="text-left text-xs text-slate-500"><tr><th className="py-1">Artigo</th><th className="text-right">Necessário</th><th className="text-right">Existente</th><th className="text-right">Falta</th><th>Local</th></tr></thead>
        {HOME_KIT_CATEGORIES.map((cat) => {
          const lines = data.homeLines.filter((l) => l.category === cat && !l.excluded);
          if (lines.length === 0) return null;
          return (
            <tbody key={cat} className="break-inside-avoid">
              <tr><td colSpan={5} className="pt-3 font-semibold">{CATEGORY_LABEL[cat]}</td></tr>
              {lines.map((l) => (
                <tr key={l.id} className="border-b border-slate-100">
                  <td className="py-0.5">{l.name}</td>
                  <td className="text-right tabular-nums">{formatNumber(l.required)} {l.unit}</td>
                  <td className="text-right tabular-nums">{formatNumber(l.have)}</td>
                  <td className="text-right tabular-nums font-medium">{l.missing > 0 ? formatNumber(l.missing) : "✓"}</td>
                  <td className="pl-2 text-slate-500">{l.storageLocation ?? ""}</td>
                </tr>
              ))}
            </tbody>
          );
        })}
      </table>
    </article>
  );
}
