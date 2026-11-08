"use client";

import { ArrowUpDown, CircleCheck, ExternalLink, ShoppingCart, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { ActionButton } from "@/components/ui/action-form";
import { Badge, PriorityBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/misc";
import { formatDate, formatMoney, formatNumber } from "@/i18n/format";
import { STORE_LABEL } from "@/i18n/messages";
import { cn } from "@/lib/utils";
import { newOpId, submitOp } from "@/modules/offline/outbox";
import { deleteShoppingItem, setShoppingItemStatus } from "./actions";
import type { ShoppingLine } from "./load";

const FILTERS = [
  { key: "to_buy", label: "Por comprar" },
  { key: "all", label: "Tudo" },
  { key: "purchased", label: "Já comprado" },
  { key: "owned", label: "Já tenho" },
  { key: "optional", label: "Opcional" },
  { key: "p0", label: "Prioridade máxima" },
] as const;

const SORTS = { priority: "Prioridade", price: "Preço", category: "Categoria", store: "Loja", status: "Estado" } as const;

const STATUS_LABEL = { to_buy: "Por comprar", purchased: "Comprado", owned: "Já tinha" } as const;

export function ShoppingList({ lines, familyId, canUpdate, storeHints }: { lines: ShoppingLine[]; familyId: string; canUpdate: boolean; storeHints: Record<string, string> }) {
  const router = useRouter();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("to_buy");
  const [sort, setSort] = useState<keyof typeof SORTS>("priority");
  const [source, setSource] = useState<"all" | "home" | "bag" | "manual" | "energy">("all");
  const [pending, start] = useTransition();

  const visible = useMemo(() => {
    let out = lines.filter((l) => {
      if (source !== "all" && l.source !== source) return false;
      switch (filter) {
        case "to_buy": return l.status === "to_buy";
        case "purchased": return l.status === "purchased";
        case "owned": return l.status === "owned";
        case "optional": return l.priority === 3;
        case "p0": return l.priority === 0 && l.status === "to_buy";
        default: return true;
      }
    });
    const by: Record<keyof typeof SORTS, (a: ShoppingLine, b: ShoppingLine) => number> = {
      priority: (a, b) => a.priority - b.priority || (a.totalCents ?? Infinity) - (b.totalCents ?? Infinity),
      price: (a, b) => (b.totalCents ?? -1) - (a.totalCents ?? -1),
      category: (a, b) => a.category.localeCompare(b.category) || a.priority - b.priority,
      store: (a, b) => (a.store ?? "~").localeCompare(b.store ?? "~") || a.priority - b.priority,
      status: (a, b) => a.status.localeCompare(b.status) || a.priority - b.priority,
    };
    out = [...out].sort(by[sort]);
    return out;
  }, [lines, filter, sort, source]);

  function kitOp(l: ShoppingLine, patch: { quantityHave: number; acquiredVia: "purchased" | "owned" | null }, msg: string) {
    if (!l.kit) return;
    const k = l.kit;
    start(async () => {
      const r = await submitOp({ opId: newOpId(), kind: k.kind, familyId, bagId: k.bagId, key: k.key, rowId: k.rowId, patch });
      if (r.status === "synced") { toast.success(msg); router.refresh(); }
      else if (r.status === "queued") toast.message("Sem ligação: será sincronizado.");
      else toast.error(r.error);
    });
  }

  function markBought(l: ShoppingLine) {
    try { navigator.vibrate?.(12); } catch { /* unsupported */ }
    if (l.kit) kitOp(l, l.status === "to_buy" ? { quantityHave: l.kit.required, acquiredVia: "purchased" } : { quantityHave: 0, acquiredVia: null }, l.status === "to_buy" ? "Comprado." : "Reaberto.");
    else if (l.source === "manual") start(async () => {
      const r = await setShoppingItemStatus({ id: l.id.slice(7), purchased: l.status === "to_buy" });
      if (r.ok) { toast.success(r.message ?? "Atualizado."); router.refresh(); } else toast.error(r.error);
    });
  }

  const toBuy = visible.filter((l) => l.status === "to_buy");
  const toBuyCents = toBuy.reduce((s, l) => s + (l.totalCents ?? 0), 0);

  return (
    <div className="min-w-0 space-y-3">
      <div className="space-y-2 no-print">
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="tablist" aria-label="Filtro">
          <div className="flex w-max gap-1.5">
            {FILTERS.map((f) => (
              <button key={f.key} role="tab" aria-selected={filter === f.key} onClick={() => setFilter(f.key)} className={cn("h-9 rounded-full px-3.5 text-sm whitespace-nowrap", filter === f.key ? "bg-brand-700 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50")}>{f.label}</button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Select aria-label="Origem" value={source} onChange={(e) => setSource(e.target.value as typeof source)} className="min-w-0 flex-1 sm:w-44 sm:flex-none">
            <option value="all">Todas as origens</option><option value="home">HOME KIT</option><option value="bag">GO BAGS</option><option value="manual">Manuais</option><option value="energy">Energia</option>
          </Select>
          <label className="flex min-w-0 flex-1 items-center gap-1 text-sm text-slate-500 sm:flex-none"><ArrowUpDown className="size-4 shrink-0" aria-hidden /><span className="sr-only">Ordenar por</span>
            <Select value={sort} onChange={(e) => setSort(e.target.value as keyof typeof SORTS)} className="min-w-0 flex-1 sm:w-40">{Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
          </label>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState icon={ShoppingCart} title={filter === "to_buy" ? "Nada por comprar" : "Sem artigos neste filtro"} description={filter === "to_buy" ? "Tudo o que é necessário está registado como existente." : undefined} />
      ) : (
        <Card>
          <ul className="divide-y divide-slate-100" aria-busy={pending}>
            {visible.map((l) => {
              const canToggle = canUpdate && (l.kit || l.source === "manual");
              const done = l.status !== "to_buy";
              return (
                <li key={l.id} className="flex gap-3 px-3 py-3 sm:px-4">
                  <button
                    type="button"
                    disabled={!canToggle || pending}
                    onClick={() => markBought(l)}
                    aria-label={done ? `${l.name}: reabrir` : `${l.name}: marcar como comprado`}
                    aria-pressed={done}
                    className="-m-1 flex size-11 shrink-0 items-center justify-center rounded-full disabled:cursor-default"
                  >
                    <span className={cn("flex size-7 items-center justify-center rounded-full border-2", done ? "border-ready-500 bg-ready-500 text-white" : "border-slate-300 bg-white")}>{done && <CircleCheck className="size-4" aria-hidden />}</span>
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("text-[15px] leading-snug font-medium sm:text-sm", done && "text-slate-500 line-through decoration-slate-300")}>{l.name}</p>
                      <p className="shrink-0 text-right text-sm font-semibold tabular-nums">{l.totalCents == null ? <span className="text-xs font-normal text-slate-400">s/ preço</span> : `${l.priceKind === "estimate" ? "≈ " : ""}${formatMoney(l.totalCents)}`}</p>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                      <PriorityBadge priority={l.priority} />
                      <span className="tabular-nums">{formatNumber(l.quantity)} {l.unit}</span>
                      <span>· {l.sourceLabel}</span>
                      {done && <Badge tone="ready">{STATUS_LABEL[l.status]}{l.boughtBy ? ` · ${l.boughtBy}` : ""}</Badge>}
                      {l.budget === "over_budget" && <Badge tone="warning">Fora do orçamento</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {l.store ? (STORE_LABEL[l.store] ?? l.store) : storeHints[l.category] ?? ""}
                      {l.unitCents != null && <span> · {formatMoney(l.unitCents)}/{l.unit} {l.priceKind === "verified" ? `(verificado ${formatDate(l.priceDate)})` : l.priceKind === "manual" ? "" : "(estimativa)"}</span>}
                      {l.url && <a href={l.url} target="_blank" rel="noopener noreferrer" className="ml-1 inline-flex items-center gap-0.5 text-brand-600">Loja <ExternalLink className="size-3" aria-hidden /></a>}
                    </p>
                    {l.cheaper && <p className="mt-0.5 text-xs text-ready-700">Mais económico: {l.cheaper.name} (≈ {formatMoney(l.cheaper.unitCents)}/{l.unit})</p>}
                    {canUpdate && (
                      <div className="mt-1.5 flex flex-wrap gap-1 no-print">
                        {l.kit && !done && <Button size="sm" variant="ghost" className="px-2" disabled={pending} onClick={() => kitOp(l, { quantityHave: l.kit!.required, acquiredVia: "owned" }, "Registado como já existente.")}>Já tenho</Button>}
                        {l.source === "manual" && <ActionButton size="sm" variant="ghost" className="px-2" action={deleteShoppingItem} input={{ id: l.id.slice(7) }} confirm="Remover da lista?"><Trash2 aria-hidden /> Remover</ActionButton>}
                        {l.source === "energy" && <Button asChild size="sm" variant="ghost" className="px-2"><Link href="/app/energy">Gerir energia</Link></Button>}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {toBuy.length > 0 && (
        <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 flex items-center justify-between rounded-xl bg-brand-900 px-4 py-3 text-sm text-white shadow-lg md:bottom-4 no-print" role="status">
          <span>{toBuy.length} por comprar</span>
          <span className="font-semibold tabular-nums">≈ {formatMoney(toBuyCents)}</span>
        </div>
      )}
    </div>
  );
}
