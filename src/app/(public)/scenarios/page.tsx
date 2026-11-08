import type { Metadata } from "next";
import Link from "next/link";
import { ScenarioIcon } from "@/components/scenario-icon";
import { listScenarios } from "@/content/scenarios";

export const metadata: Metadata = { title: "Cenários de emergência", description: "O que fazer em apagões, falhas de água, incêndios, sismos, inundações, evacuações e outras emergências." };

export default function PublicScenariosPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Cenários de emergência</h1>
      <p className="mt-2 max-w-2xl text-slate-600">Procedimentos claros para cada situação. Com uma conta, cada cenário é adaptado à sua família, aos seus pontos de encontro e ao seu plano de comunicação.</p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {listScenarios().map((s) => (
          <Link key={s.key} href={`/scenarios/${s.key}`} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:border-brand-200 hover:bg-brand-50/40">
            <ScenarioIcon name={s.icon} className="mt-0.5 size-5 shrink-0 text-brand-600" />
            <span><span className="block font-medium">{s.title}</span><span className="text-sm text-slate-500">{s.summary}</span></span>
          </Link>
        ))}
      </div>
    </div>
  );
}
