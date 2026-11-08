"use client";

import { ArrowUpDown, CircleCheck, ExternalLink, RotateCcw, ShoppingCart, Trash2 } from "lucide-react";
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
import { CATEGORY_LABEL, STORE_LABEL } from "@/i18n/messages";
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

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 no-print">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filtro">
          {FILTERS.map((f) => (
            <button key={f.key} role="tab" aria-selected={filter === f.key} onClick={() => setFilter(f.key)} className={cn("rounded-full px-3 py-1 text-sm", filter === f.key ? "bg-brand-700 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50")}>{f.label}</button>
          ))}
        </div>
        <div className="flex w-full gap-2 sm:ml-auto sm:w-auto">
          <Select aria-label="Origem" value={source} onChange={(e) => setSource(e.target.value as typeof source)} className="h-9 min-w-0 flex-1 sm:w-40 sm:flex-none">
            <option value="all">Todas as origens</option><option value="home">HOME KIT</option><option value="bag">GO BAGS</option><option value="manual">Manuais</option><option value="energy">Energia</option>
          </Select>
          <label className="flex min-w-0 flex-1 items-center gap-1 text-sm text-slate-500 sm:flex-none"><ArrowUpDown className="size-4" aria-hidden /><span className="sr-only">Ordenar por</span>
            <Select value={sort} onChange={(e) => setSort(e.target.value as keyof typeof SORTS)} className="h-9 min-w-0 flex-1 sm:w-36">{Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
          </label>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState icon={ShoppingCart} title={filter === "to_buy" ? "Nada por comprar" : "Sem artigos neste filtro"} description={filter === "to_buy" ? "Tudo o que é necessário está registado como existente." : undefined} />
      ) : (
        <Card>
          <ul className="divide-y divide-slate-100" aria-busy={pending}>
            {visible.map((l) => (
              <li key={l.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-semibold text-slate-500 uppercase" aria-hidden>{(CATEGORY_LABEL[l.category] ?? "").slice(0, 3)}</div>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm font-medium", l.status !== "to_buy" && "text-slate-500 line-through decoration-slate-300")}>{l.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                    <PriorityBadge priority={l.priority} />
                    <Badge tone="outline">{l.sourceLabel}</Badge>
                    <span>{CATEGORY_LABEL[l.category]}</span>
                    <span className="tabular-nums">· {formatNumber(l.quantity)} {l.unit}</span>
                    {l.status !== "to_buy" && <Badge tone="ready">{STATUS_LABEL[l.status]}{l.boughtBy ? ` · ${l.boughtBy}` : ""}</Badge>}
                    {l.budget === "within_budget" && <Badge tone="ready">Dentro do orçamento</Badge>}
                    {l.budget === "over_budget" && <Badge tone="warning">Fora do orçamento</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {l.store ? (STORE_LABEL[l.store] ?? l.store) : `Onde: ${storeHints[l.category] ?? "—"}`}
                    {l.url && <a href={l.url} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-0.5 text-brand-600 hover:underline">Ver na loja <ExternalLink className="size-3" aria-hidden /></a>}
                    {l.cheaper && <span className="ml-2 text-ready-700">Alternativa mais económica: {l.cheaper.name} (≈ {formatMoney(l.cheaper.unitCents)}/{l.unit})</span>}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums">{l.totalCents == null ? "Preço a verificar" : `${l.priceKind === "estimate" ? "≈ " : ""}${formatMoney(l.totalCents)}`}</p>
                    {l.unitCents != null && <p className="text-xs text-slate-500">{formatMoney(l.unitCents)}/{l.unit} · {l.priceKind === "verified" ? `verificado ${formatDate(l.priceDate)}` : l.priceKind === "manual" ? "indicado por si" : "estimativa"}</p>}
                  </div>
                  {canUpdate && (
                    <div className="flex gap-1 no-print">
                      {l.kit && l.status === "to_buy" && (
                        <>
                          <Button size="sm" variant="secondary" disabled={pending} onClick={() => kitOp(l, { quantityHave: l.kit!.required, acquiredVia: "purchased" }, "Registado como comprado.")}><CircleCheck aria-hidden /> Comprei</Button>
                          <Button size="sm" variant="ghost" disabled={pending} onClick={() => kitOp(l, { quantityHave: l.kit!.required, acquiredVia: "owned" }, "Registado como já existente.")}>Já tenho</Button>
                        </>
                      )}
                      {l.kit && l.status !== "to_buy" && <Button size="sm" variant="ghost" disabled={pending} onClick={() => kitOp(l, { quantityHave: 0, acquiredVia: null }, "Reaberto.")}><RotateCcw aria-hidden /> Desfazer</Button>}
                      {l.source === "manual" && (
                        <>
                          <ActionButton size="sm" variant={l.status === "to_buy" ? "secondary" : "ghost"} action={setShoppingItemStatus} input={{ id: l.id.slice(7), purchased: l.status === "to_buy" }}>{l.status === "to_buy" ? <><CircleCheck aria-hidden /> Comprei</> : <><RotateCcw aria-hidden /> Desfazer</>}</ActionButton>
                          <ActionButton size="icon" variant="ghost" aria-label="Remover" action={deleteShoppingItem} input={{ id: l.id.slice(7) }} confirm="Remover da lista?"><Trash2 aria-hidden /></ActionButton>
                        </>
                      )}
                      {l.source === "energy" && <Button asChild size="sm" variant="ghost"><Link href="/app/energy">Gerir</Link></Button>}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
