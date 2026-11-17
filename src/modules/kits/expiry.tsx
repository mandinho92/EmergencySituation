"use client";

import { CalendarClock, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/i18n/format";
import { cn } from "@/lib/utils";

/** Categories where an expiry date is usually meaningful: asked right after a purchase. */
export const EXPIRY_CATEGORIES = new Set(["water", "food", "first_aid", "medication", "children", "pets", "fire", "lighting", "hygiene", "sanitation"]);

/** Local date (yyyy-mm-dd), optionally shifted by a number of days. */
function localIso(addDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + addDays);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}
const todayIso = () => localIso();

/**
 * Inline expiry editor. `prompt` styles it as the optional question shown
 * right after "Comprei"/"Já tenho". Uses the phone's native date picker.
 */
export function ExpiryEditor({ value, onSave, onClose, prompt = false, itemName }: { value: string | null; onSave: (v: string | null) => void; onClose: () => void; prompt?: boolean; itemName: string }) {
  const [date, setDate] = useState(value ?? "");
  const past = date !== "" && date < todayIso();
  return (
    <div className={cn("mt-2 rounded-lg p-2.5 no-print", prompt ? "bg-amber-50 ring-1 ring-amber-200" : "bg-slate-50 ring-1 ring-slate-200")} role="group" aria-label={`Validade de ${itemName}`}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={`exp-${itemName}`} className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
          <CalendarClock className="size-4 text-amber-700" aria-hidden /> {prompt ? "Tem validade? (opcional)" : "Validade"}
        </label>
        <button type="button" onClick={onClose} className="-m-1 flex size-9 items-center justify-center rounded-full text-slate-500 hover:bg-white" aria-label="Fechar"><X className="size-4" /></button>
      </div>
      <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          id={`exp-${itemName}`}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base sm:h-9 sm:w-auto sm:text-sm"
        />
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button size="sm" disabled={date === "" || date === value} onClick={() => onSave(date)}>Guardar</Button>
          {value ? (
            <Button size="sm" variant="ghost" onClick={() => onSave(null)}>Remover</Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={onClose}>{prompt ? "Agora não" : "Cancelar"}</Button>
          )}
        </div>
      </div>
      {past && <p className="mt-1 text-xs text-red-700">Esta data já passou — o artigo vai aparecer como expirado.</p>}
      {prompt && <p className="mt-1 text-xs text-slate-500">Avisamos 30 dias antes de expirar.</p>}
    </div>
  );
}

/** Compact chip that shows the expiry (or offers to add one) and opens the editor. */
export function ExpiryChip({ value, onClick }: { value: string | null; onClick: () => void }) {
  const soon = value != null && value <= localIso(30);
  const expired = value != null && value < todayIso();
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-10 items-center gap-1 rounded-lg px-2.5 text-sm sm:h-8 sm:text-xs",
        value == null ? "text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50" : expired ? "bg-red-50 text-red-700" : soon ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-700",
      )}
      aria-label={value ? `Validade ${formatDate(value)} — alterar` : "Adicionar validade"}
    >
      <CalendarClock className="size-4 sm:size-3.5" aria-hidden />
      {value ? `val. ${formatDate(value)}` : "Validade"}
    </button>
  );
}
