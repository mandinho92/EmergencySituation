"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { TIER_BANDS } from "@/domain/energy/energy";
import { cn } from "@/lib/utils";
import { setEnergyTier } from "./actions";

const OPTIONS = [
  { tier: "none", label: "Não quero bateria", goal: "Apenas lanternas, pilhas e rádio do HOME KIT." },
  ...TIER_BANDS.map((b) => ({
    tier: b.tier,
    label: b.label,
    goal: `${b.goal}. ${b.capacityWh[1] > 0 ? `${b.capacityWh[0]}–${b.capacityWh[1]} Wh` : ""}${b.panelW[1] > 0 ? ` · painel ${b.panelW[0]}–${b.panelW[1]} W` : ""}`,
    budget: `${b.budgetEur[0]}–${b.budgetEur[1].toLocaleString("pt-PT")} € (banda indicativa)`,
  })),
  { tier: "manual", label: "Configurar manualmente", goal: "Indique os equipamentos e calcule a solução." },
] as Array<{ tier: string; label: string; goal: string; budget?: string }>;

export function TierPicker({ current, disabled }: { current: string; disabled?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup" aria-label="Solução de energia">
      {OPTIONS.map((o) => (
        <button
          key={o.tier}
          type="button"
          role="radio"
          aria-checked={current === o.tier}
          disabled={disabled || pending}
          onClick={() =>
            start(async () => {
              const r = await setEnergyTier({ tier: o.tier });
              if (r.ok) {
                toast.success("Preferência guardada.");
                router.refresh();
              } else toast.error(r.error);
            })
          }
          className={cn("relative rounded-xl border p-4 text-left transition-colors disabled:opacity-60", current === o.tier ? "border-brand-600 bg-brand-50" : "border-slate-200 bg-white hover:border-slate-300")}
        >
          {current === o.tier && <Check className="absolute top-3 right-3 size-4 text-brand-600" aria-hidden />}
          <p className="font-medium">{o.label}</p>
          <p className="mt-1 text-sm text-slate-600">{o.goal}</p>
          {o.budget && <p className="mt-2 text-xs text-slate-500">{o.budget}</p>}
        </button>
      ))}
    </div>
  );
}
