"use client";

import { Check, CircleCheck, Loader2, PackageCheck, Pencil, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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

/**
 * One kit line with operational actions (bought / already have / packed /
 * quantity). Changes go through the outbox: applied immediately when online,
 * queued in IndexedDB when offline. The editor-only edit dialog is injected.
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

  function send(patch: OutboxOp["patch"], optimistic: Partial<typeof local>, message: string) {
    const previous = local;
    setLocal({ ...local, ...optimistic });
    start(async () => {
      const r = await submitOp({ opId: newOpId(), kind, familyId, bagId, key: line.rowId ? undefined : line.key ?? undefined, rowId: line.rowId ?? undefined, patch });
      if (r.status === "synced") {
        toast.success(message);
        setQueued(false);
        router.refresh();
      } else if (r.status === "queued") {
        setQueued(true);
        toast.message("Sem ligação: alteração guardada e será sincronizada.");
      } else {
        setLocal(previous);
        toast.error(r.error);
      }
    });
  }

  const qtyLabel = `${formatNumber(local.have)} / ${formatNumber(line.required)} ${line.unit}`;

  return (
    <li data-item-key={line.key ?? line.rowId} className={cn("flex flex-col gap-3 py-3 sm:flex-row sm:items-center", line.excluded && "opacity-50")}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span data-status={status} className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border", status === "complete" ? "border-ready-500 bg-ready-500 text-white" : status === "partial" ? "border-brand-500 bg-brand-50" : "border-slate-300")} aria-label={status === "complete" ? "Completo" : status === "partial" ? "Parcial" : "Em falta"}>
          {status === "complete" && <Check className="size-3" aria-hidden />}
        </span>
        <div className="min-w-0">
          <p className={cn("text-sm font-medium text-slate-900", line.excluded && "line-through")}>{line.name}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            <PriorityBadge priority={line.priority} />
            <span className="tabular-nums">{qtyLabel}</span>
            {!complete && missing > 0 && <span className="font-medium text-amber-700">faltam {formatNumber(missing)} {line.unit}</span>}
            {line.estimatedCostCents != null && missing > 0 && <span title="Estimativa de planeamento">≈ {(line.estimatedCostCents / 100).toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}</span>}
            {line.expiresOn && <span>validade {formatDate(line.expiresOn)}</span>}
            {line.storageLocation && <span>· {line.storageLocation}</span>}
            {local.acquiredVia && line.purchasedByName && <span>· {local.acquiredVia === "purchased" ? "comprado" : "registado"} por {line.purchasedByName}</span>}
            {queued && <span className="text-brand-700">· por sincronizar</span>}
          </div>
          {line.rationale && <p className="mt-0.5 text-xs text-slate-400">{line.rationale}</p>}
        </div>
      </div>

      {canUpdate && !line.excluded && (
        <div className="flex shrink-0 flex-wrap items-center gap-1.5 pl-8 sm:pl-0 no-print">
          {pending && <Loader2 className="size-4 animate-spin text-slate-400" aria-hidden />}
          <label className="sr-only" htmlFor={`qty-${line.id}`}>Quantidade existente de {line.name}</label>
          <input
            id={`qty-${line.id}`}
            type="number"
            min={0}
            step="any"
            inputMode="decimal"
            className="h-8 w-20 rounded-md border border-slate-300 px-2 text-right text-sm tabular-nums"
            defaultValue={local.have}
            key={local.have}
            onBlur={(e) => {
              const v = Number(e.target.value.replace(",", "."));
              if (Number.isFinite(v) && v >= 0 && v !== local.have) send({ quantityHave: v }, { have: v }, "Quantidade atualizada.");
            }}
          />
          {kind === "bag" ? (
            local.isPacked ? (
              <Button size="sm" variant="ghost" onClick={() => send({ isPacked: false }, { isPacked: false }, "Retirado da mochila.")}><RotateCcw aria-hidden /> Retirar</Button>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => send({ isPacked: true, quantityHave: Math.max(local.have, line.required) }, { isPacked: true, have: Math.max(local.have, line.required) }, "Colocado na mochila.")}><PackageCheck aria-hidden /> Na mochila</Button>
            )
          ) : null}
          {missing > 0 && line.purchasable && (
            <Button size="sm" variant={kind === "home" ? "secondary" : "ghost"} onClick={() => send({ quantityHave: line.required, acquiredVia: "purchased" }, { have: line.required, acquiredVia: "purchased" }, "Registado como comprado.")}><CircleCheck aria-hidden /> Comprei</Button>
          )}
          {missing > 0 && (
            <Button size="sm" variant="ghost" onClick={() => send({ quantityHave: line.required, acquiredVia: "owned" }, { have: line.required, acquiredVia: "owned" }, "Registado como já existente.")}>{line.purchasable ? "Já tenho" : "Feito"}</Button>
          )}
          {editSlot}
        </div>
      )}
      {!canUpdate && editSlot}
    </li>
  );
}

export function EditTrigger(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <Button size="icon" variant="ghost" aria-label="Editar artigo" {...props}><Pencil aria-hidden /></Button>;
}
