import { Siren } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ScenarioIcon } from "@/components/scenario-icon";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/misc";
import { listScenarios } from "@/content/scenarios";
import { effectiveRisks, highlightedRisksFor } from "@/domain/locations/portugal";
import { requireFamily } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { loadPreparedness } from "@/modules/preparedness/load";

export const metadata: Metadata = { title: "Cenários de emergência" };

export default async function ScenariosPage() {
  const ctx = await requireFamily();
  const supabase = await createClient();
  const [data, { data: plans }] = await Promise.all([loadPreparedness(ctx.family.id), supabase.from("emergency_plans").select("scenario_key, completed_steps").eq("family_id", ctx.family.id)]);
  const risks = new Set(effectiveRisks(data.household.selected_risks, data.household.district));
  const high = new Set(highlightedRisksFor(data.household.district));
  const progress = new Map((plans ?? []).map((p) => [p.scenario_key, p.completed_steps.length]));
  const scenarios = listScenarios().sort((a, b) => Number(b.risk != null && high.has(b.risk)) - Number(a.risk != null && high.has(a.risk)));

  return (
    <>
      <PageHeader icon={Siren} title="Cenários de emergência" description="O que fazer, adaptado à vossa família, aos pontos de encontro e ao plano de comunicação." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {scenarios.map((s) => {
          const relevant = s.risk == null || risks.has(s.risk);
          return (
            <Link key={s.key} href={`/app/scenarios/${s.key}`} className={`flex gap-3 rounded-xl border bg-white p-4 hover:border-brand-200 ${relevant ? "border-slate-200" : "border-slate-100 opacity-70"}`}>
              <ScenarioIcon name={s.icon} className="mt-0.5 size-5 shrink-0 text-brand-600" />
              <span className="min-w-0">
                <span className="block font-medium">{s.title}</span>
                <span className="text-sm text-slate-500">{s.summary}</span>
                <span className="mt-2 flex flex-wrap gap-1">
                  {s.risk && high.has(s.risk) && <Badge tone="warning">Relevante na sua região</Badge>}
                  {!relevant && <Badge tone="outline">Risco não selecionado</Badge>}
                  {progress.get(s.key) ? <Badge tone="ready">{progress.get(s.key)}/{s.checklist.length} passos</Badge> : null}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
