import { Ban, Backpack, CheckCircle2, DoorOpen, House, MessagesSquare, Phone, RotateCcw, Wrench, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Notice } from "@/components/ui/misc";
import { CONTENT_STATUS, EMERGENCY_NUMBERS, type Scenario } from "@/content/scenarios";

function Section({ title, icon: Icon, items, tone }: { title: string; icon: typeof Zap; items: string[]; tone?: "danger" | "brand" }) {
  if (items.length === 0) return null;
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Icon className={tone === "danger" ? "size-4 text-red-600" : "size-4 text-brand-600"} aria-hidden />{title}</CardTitle></CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm text-slate-700">
          {items.map((t) => <li key={t} className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-slate-300" aria-hidden />{t}</li>)}
        </ul>
      </CardContent>
    </Card>
  );
}

const KIT_LABEL = { go_bags: "GO BAGS (evacuação)", home_kit: "HOME KIT (ficar em casa)", both: "HOME KIT e GO BAGS prontas" } as const;

/**
 * Renders a scenario procedure. `familySlot` receives family-specific blocks
 * (meeting point, contacts, interactive checklist) in the private area.
 */
export function ScenarioView({ scenario, adaptations = [], familySlot, checklistSlot }: { scenario: Scenario; adaptations?: string[]; familySlot?: ReactNode; checklistSlot?: ReactNode }) {
  return (
    <div className="space-y-4">
      <Notice tone="warning" title="Em perigo imediato ligue 112">
        Este procedimento não substitui as instruções das autoridades. Siga sempre as indicações da Proteção Civil, dos bombeiros e das forças de segurança.
      </Notice>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="O que fazer imediatamente" icon={Zap} items={scenario.immediate} />
        <Section title="O que não fazer" icon={Ban} items={scenario.dont} tone="danger" />
        <Section title="Quando permanecer em casa" icon={House} items={scenario.stayHome} />
        <Section title="Quando evacuar" icon={DoorOpen} items={scenario.evacuate} />
      </div>

      {adaptations.length > 0 && <Section title="Para a sua família" icon={CheckCircle2} items={adaptations} />}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Backpack className="size-4 text-brand-600" aria-hidden />Equipamento e kit a utilizar</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Badge tone="brand">{KIT_LABEL[scenario.kitStrategy]}</Badge>
            <ul className="flex flex-wrap gap-1.5">{scenario.equipment.map((e) => <li key={e}><Badge tone="outline">{e}</Badge></li>)}</ul>
          </CardContent>
        </Card>
        <Section title="Plano de comunicação" icon={MessagesSquare} items={scenario.communication} />
      </div>

      {familySlot}

      {checklistSlot ?? (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Wrench className="size-4 text-brand-600" aria-hidden />Checklist</CardTitle></CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm">{scenario.checklist.map((c, i) => <li key={c.id} className="flex gap-2"><span className="w-5 text-right font-medium text-slate-400">{i + 1}.</span>{c.text}</li>)}</ol>
          </CardContent>
        </Card>
      )}

      <Section title="Depois da emergência" icon={RotateCcw} items={scenario.after} />

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Phone className="size-4 text-brand-600" aria-hidden />Contactos de emergência</CardTitle></CardHeader>
        <CardContent>
          <ul className="grid gap-3 sm:grid-cols-3">
            {EMERGENCY_NUMBERS.map((n) => (
              <li key={n.number} className="rounded-lg bg-slate-50 p-3">
                <a href={`tel:${n.number.replace(/\s/g, "")}`} className="text-lg font-semibold text-brand-700">{n.number}</a>
                <p className="text-sm font-medium">{n.label}</p>
                <p className="text-xs text-slate-500">{n.description}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="text-xs text-slate-500">
        <p>Fontes de referência: {scenario.sources.map((s, i) => <span key={s.url + i}>{i > 0 && " · "}<a href={s.url} target="_blank" rel="noopener noreferrer" className="underline">{s.label}</a></span>)}</p>
        <p className="mt-1">{CONTENT_STATUS.note} Versão {CONTENT_STATUS.version}.</p>
      </div>
    </div>
  );
}
