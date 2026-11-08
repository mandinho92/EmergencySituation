import { ChevronDown } from "lucide-react";
import { ProgressBar } from "@/components/ui/progress";

/** Native, accessible collapsible section. Incomplete categories start open. */
export function CategorySection({ id, title, done, total, coverage, children }: { id: string; title: string; done: number; total: number; coverage: number; children: React.ReactNode }) {
  const complete = done === total;
  return (
    <details id={id} open={!complete} className="group scroll-mt-28 rounded-[var(--radius-card)] border border-slate-200 bg-white shadow-[var(--shadow-card)] [&[open]_.chev]:rotate-180">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 sm:px-5 [&::-webkit-details-marker]:hidden">
        <span className="flex-1 text-sm font-semibold">{title}</span>
        <span className={complete ? "text-xs font-medium text-ready-700" : "text-xs text-slate-500"}>{complete ? "Completo" : `${done}/${total}`}</span>
        <ProgressBar value={coverage * 100} className="w-16" label={title} />
        <ChevronDown className="chev size-4 text-slate-400 transition-transform" aria-hidden />
      </summary>
      <ul className="divide-y divide-slate-100 px-4 pb-1 sm:px-5">{children}</ul>
    </details>
  );
}

/** Horizontal, sticky category shortcuts with the number of missing items. */
export function CategoryChips({ items }: { items: Array<{ id: string; label: string; missing: number }> }) {
  return (
    <nav aria-label="Categorias" className="sticky top-14 z-20 -mx-4 mb-3 overflow-x-auto bg-slate-50/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 no-print">
      <ul className="flex w-max gap-1.5">
        {items.map((c) => (
          <li key={c.id}>
            <a href={`#${c.id}`} className={c.missing > 0 ? "flex h-9 items-center gap-1.5 rounded-full bg-white px-3 text-sm ring-1 ring-slate-200" : "flex h-9 items-center gap-1.5 rounded-full bg-ready-50 px-3 text-sm text-ready-700"}>
              {c.label}{c.missing > 0 && <span className="rounded-full bg-amber-100 px-1.5 text-xs font-semibold text-amber-800">{c.missing}</span>}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
