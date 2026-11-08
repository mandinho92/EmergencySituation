"use client";

import { ListChecks, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { ActionButton } from "@/components/ui/action-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";
import { useOnline } from "@/modules/offline/connection-status";
import { resetScenarioChecklist, toggleScenarioStep } from "./actions";

export function ScenarioChecklist({ scenario, items, done, canUpdate }: { scenario: string; items: Array<{ id: string; text: string }>; done: string[]; canUpdate: boolean }) {
  const router = useRouter();
  const online = useOnline();
  const [optimistic, setOptimistic] = useOptimistic(new Set(done), (state: Set<string>, action: { id: string; done: boolean }) => {
    const next = new Set(state);
    if (action.done) next.add(action.id); else next.delete(action.id);
    return next;
  });
  const [, start] = useTransition();
  const progress = items.length ? (items.filter((i) => optimistic.has(i.id)).length / items.length) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ListChecks className="size-4 text-brand-600" aria-hidden />Checklist da família</CardTitle>
        {canUpdate && done.length > 0 && <ActionButton size="sm" variant="ghost" action={resetScenarioChecklist} input={{ scenario }}><RotateCcw aria-hidden /> Reiniciar</ActionButton>}
      </CardHeader>
      <CardContent className="space-y-3">
        <ProgressBar value={progress} label="Progresso da checklist" />
        {!online && <p className="text-xs text-amber-700">Offline: pode consultar a checklist; marcar passos requer ligação.</p>}
        <ol className="space-y-1.5">
          {items.map((i) => (
            <li key={i.id}>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-slate-50">
                <input
                  type="checkbox"
                  className="mt-0.5 size-5 accent-ready-600"
                  checked={optimistic.has(i.id)}
                  disabled={!canUpdate || !online}
                  onChange={(e) => {
                    const value = e.target.checked;
                    start(async () => {
                      setOptimistic({ id: i.id, done: value });
                      const r = await toggleScenarioStep({ scenario, step: i.id, done: value });
                      if (!r.ok) toast.error(r.error);
                      router.refresh();
                    });
                  }}
                />
                <span className={optimistic.has(i.id) ? "text-sm text-slate-400 line-through" : "text-sm"}>{i.text}</span>
              </label>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
