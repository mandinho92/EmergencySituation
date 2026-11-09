import { ExternalLink } from "lucide-react";
import { formatDate, formatMoney } from "@/i18n/format";
import { STORE_LABEL } from "@/i18n/messages";
import type { PriceInfo } from "./pricing";

/** Price with its provenance: verified (store + date), reference (listing + date) or estimate. */
export function PriceTag({ price, compact = false }: { price: PriceInfo | null; compact?: boolean }) {
  if (!price) return <span className="text-sm text-slate-400">Preço a verificar</span>;
  const label =
    price.kind === "verified" ? `Verificado em ${STORE_LABEL[price.store ?? "other"] ?? price.store}, ${formatDate(price.date)}`
      : price.kind === "reference" ? `Preço de referência · ${price.sourceLabel} · consultado ${formatDate(price.date)}`
      : `Estimativa de planeamento · ${formatDate(price.date)}`;
  return (
    <span className="inline-flex flex-col">
      <span className="text-base font-semibold tabular-nums text-slate-900">{price.kind === "verified" ? "" : "≈ "}{formatMoney(price.unitCents)}</span>
      {!compact && (
        <span className="text-xs leading-snug text-slate-500">
          {label}
          {price.url && <a href={price.url} target="_blank" rel="noopener noreferrer" className="ml-1 inline-flex items-center gap-0.5 text-brand-600 hover:underline">ver <ExternalLink className="size-3" aria-hidden /></a>}
        </span>
      )}
    </span>
  );
}
