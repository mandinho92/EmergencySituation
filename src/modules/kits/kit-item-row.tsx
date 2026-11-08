"use client";

import { Check, CircleCheck, Loader2, Minus, PackageCheck, Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { PriorityBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatNumber } from "@/i18n/format";
import { cn } from "@/lib/utils";
import { newOpId, submitOp, type OutboxOp } from "@/modules/offline/outbox";

export interface KitLineView {
  id: string;
  key: string | null;
  rowId: string | null;
  name: string;
  unit: string;
  required: number;
  have: number;
  missing: number;
  priority: number;
  excluded: boolean;
  isCustom: boolean;
  purchasable: boolean;
  rationale: string | null;
  acquiredVia: "purchased" | "owned" | null;
  purchasedByName: string | null;
  purchasedAt: string | null;
  expiresOn: string | null;
  storageLocation: string | null;
  isPacked: boolean;
  unitWeightGrams: number | null;
  estimatedCostCents: number | null;
}

/** Step for the −/+ buttons: big quantities move faster, small kg/L quantities in halves. */
function stepFor(line: KitLineView) {
  if (line.required >= 20) return 5;
  if ((line.unit === "kg" || line.unit === "L") && line.required <= 3) return 0.5;
  return 1;
}

function haptic() {
  try {
    navigator.vibrate?.(12);
  } catch {
    /* unsupported */
  }
}

/**
 * One kit line, designed for one-handed use on a phone:
 *  - the large circle marks the line as done (home: "tenho tudo"; bag: "na mochila") or undoes it;
 *  - −/+ adjust the quantity (debounced: several taps send one change);
 *  - "Comprei" records a purchase (who bought it is shown to the family).
 * Changes go through the outbox: immediate when online, queued when offline.
 */
export function KitItemRow({
  line,
  kind,
  familyId,
  bagId,
  canUpdate,
  editSlot,
}: {
  line: KitLineView;
  kind: "home" | "bag";
  familyId: string;
  bagId?: string;
  canUpdate: boolean;
  editSlot?: React.ReactNode;
}) {
  const router = useRouter();
  const [local, setLocal] = useState({ have: line.have, isPacked: line.isPacked, acquiredVia: line.acquiredVia });
  const [pending, start] = useTransition();
  const [queued, setQueued] = useState(false);
  const qtyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset local optimistic state whenever the server values change (realtime refresh).
  const serverKey = `${line.have}|${line.isPacked}|${line.acquiredVia}`;
  const [syncedKey, setSyncedKey] = useState(serverKey);
  if (syncedKey !== serverKey) {
    setSyncedKey(serverKey);
    setLocal({ have: line.have, isPacked: line.isPacked, acquiredVia: line.acquiredVia });
  }

  const missing = line.excluded ? 0 : Math.max(0, Math.round((line.required - local.have) * 100) / 100);
  const complete = line.excluded || (kind === "bag" ? local.isPacked : missing <= 0);
  const status = line.excluded ? "excluded" : complete ? "complete" : local.have > 0 ? "partial" : "missing";

  function send(patch: OutboxOp["patch"], message: string | null, previous = local) {
    start(async () => {
      const r = await submitOp({ opId: newOpId(), kind, familyId, bagId, key: line.rowId ? undefined : line.key ?? undefined, rowId: line.rowId ?? undefined, patch });
      if (r.status === "synced") {
        if (message) toast.success(message, { duration: 1800 });
        setQueued(false);
        router.refresh();
      } else if (r.status === "queued") {
        setQueued(true);
        toast.message("Sem ligação: guardado no telemóvel e sincronizado depois.");
      } else {
        setLocal(previous);
        toast.error(r.error);
      }
    });
  }

  function apply(optimistic: Partial<typeof local>, patch: OutboxOp["patch"], message: string | null) {
    const previous = local;
    haptic();
    setLocal({ ...local, ...optimistic });
    send(patch, message, previous);
  }

  function toggleDone() {
    if (kind === "bag") {
      if (local.isPacked) apply({ isPacked: false }, { isPacked: false }, "Retirado da mochila.");
      else {
        const have = Math.max(local.have, line.required);
        apply({ isPacked: true, have }, { isPacked: true, quantityHave: have }, "Na mochila.");
      }
      return;
    }
    if (complete) {
      if (!window.confirm(`Marcar “${line.name}” como em falta?`)) return;
      apply({ have: 0, acquiredVia: null }, { quantityHave: 0, acquiredVia: null }, "Marcado como em falta.");
    } else {
      apply({ have: line.required, acquiredVia: local.acquiredVia ?? "owned" }, { quantityHave: line.required, acquiredVia: local.acquiredVia ?? "owned" }, "Registado.");
    }
  }

  function changeQty(next: number) {
    const value = Math.max(0, Math.round(next * 100) / 100);
    if (value === local.have) return;
    haptic();
    const previous = local;
    setLocal({ ...local, have: value });
    if (qtyTimer.current) clearTimeout(qtyTimer.current);
    qtyTimer.current = setTimeout(() => send({ quantityHave: value }, null, previous), 700);
  }

  const step = stepFor(line);
  const statusLabel = status === "complete" ? (kind === "bag" ? "Na mochila — tocar para retirar" : "Completo — tocar para marcar em falta") : kind === "bag" ? "Tocar para marcar como na mochila" : "Tocar para marcar que já tem tudo";

  return (
    <li data-item-key={line.key ?? line.rowId} data-row-status={status} className={cn("py-3", line.excluded && "opacity-50")}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={toggleDone}
          disabled={!canUpdate || line.excluded}
          aria-label={`${line.name}: ${statusLabel}`}
          aria-pressed={status === "complete"}
          className="-m-1.5 flex size-11 shrink-0 items-center justify-center rounded-full disabled:cursor-default"
        >
          <span data-status={status} className={cn("flex size-7 items-center justify-center rounded-full border-2 transition-colors", status === "complete" ? "border-ready-500 bg-ready-500 text-white" : status === "partial" ? "border-brand-500 bg-brand-50" : "border-slate-300 bg-white")}>
            {status === "complete" && <Check className="size-4" aria-hidden />}
          </span>
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className={cn("text-[15px] leading-snug font-medium text-slate-900 sm:text-sm", line.excluded && "line-through", status === "complete" && "text-slate-500")}>{line.name}</p>
            <div className="-mt-1.5 -mr-2 flex shrink-0 items-center no-print">
              {pending && <Loader2 className="size-4 animate-spin text-slate-400" aria-hidden />}
              {editSlot}
            </div>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            <PriorityBadge priority={line.priority} />
            <span className="tabular-nums">{formatNumber(local.have)} / {formatNumber(line.required)} {line.unit}</span>
            {!complete && missing > 0 && <span className="font-medium text-amber-700">faltam {formatNumber(missing)}</span>}
            {line.estimatedCostCents != null && missing > 0 && <span title="Estimativa de planeamento">≈ {(line.estimatedCostCents / 100).toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}</span>}
            {line.expiresOn && <span>val. {formatDate(line.expiresOn)}</span>}
            {line.storageLocation && <span>· {line.storageLocation}</span>}
            {local.acquiredVia && line.purchasedByName && <span>· {local.acquiredVia === "purchased" ? "comprado" : "registado"} por {line.purchasedByName}</span>}
            {queued && <span className="font-medium text-brand-700">· por sincronizar</span>}
          </div>
          {line.rationale && <p className="mt-0.5 hidden text-xs text-slate-400 sm:block">{line.rationale}</p>}

          {canUpdate && !line.excluded && (
            <div className="mt-2 flex flex-wrap items-center gap-2 no-print">
              <div className="flex items-center rounded-lg ring-1 ring-slate-300">
                <button type="button" onClick={() => changeQty(local.have - step)} disabled={local.have <= 0} aria-label={`Menos ${step} ${line.unit}`} className="flex size-10 items-center justify-center text-slate-600 disabled:opacity-30 sm:size-8"><Minus className="size-4" aria-hidden /></button>
                <label className="sr-only" htmlFor={`qty-${line.id}`}>Quantidade existente de {line.name}</label>
                <input
                  id={`qty-${line.id}`}
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  className="h-10 w-14 border-x border-slate-200 text-center text-base tabular-nums sm:h-8 sm:text-sm"
                  defaultValue={local.have}
                  key={local.have}
                  onFocus={(e) => e.currentTarget.select()}
                  onBlur={(e) => {
                    const v = Number(e.target.value.replace(",", "."));
                    if (Number.isFinite(v) && v >= 0) changeQty(v);
                  }}
                />
                <button type="button" onClick={() => changeQty(local.have + step)} aria-label={`Mais ${step} ${line.unit}`} className="flex size-10 items-center justify-center text-slate-600 sm:size-8"><Plus className="size-4" aria-hidden /></button>
              </div>
              {kind === "bag" && !local.isPacked && (
                <Button size="sm" variant="secondary" onClick={toggleDone}><PackageCheck aria-hidden /> Na mochila</Button>
              )}
              {missing > 0 && line.purchasable && (
                <Button size="sm" variant={kind === "home" ? "secondary" : "ghost"} onClick={() => apply({ have: line.required, acquiredVia: "purchased" }, { quantityHave: line.required, acquiredVia: "purchased" }, "Registado como comprado.")}>
                  <CircleCheck aria-hidden /> Comprei
                </Button>
              )}
              {missing > 0 && (
                // On phones the large circle already means "já tenho"; the extra button only shows on wider screens.
                <Button size="sm" variant="ghost" className="hidden sm:inline-flex" onClick={() => apply({ have: line.required, acquiredVia: "owned" }, { quantityHave: line.required, acquiredVia: "owned" }, "Registado como já existente.")}>{line.purchasable ? "Já tenho" : "Feito"}</Button>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

export function EditTrigger(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <Button size="icon" variant="ghost" aria-label="Editar artigo" {...props}><Pencil aria-hidden /></Button>;
}
