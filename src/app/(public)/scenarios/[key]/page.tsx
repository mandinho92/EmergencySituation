import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ScenarioIcon } from "@/components/scenario-icon";
import { Button } from "@/components/ui/button";
import { getScenario, listScenarios } from "@/content/scenarios";
import { ScenarioView } from "@/modules/scenarios/scenario-view";

export function generateStaticParams() {
  return listScenarios().map((s) => ({ key: s.key }));
}

export async function generateMetadata({ params }: PageProps<"/scenarios/[key]">): Promise<Metadata> {
  const s = getScenario((await params).key);
  return s ? { title: s.title, description: s.summary } : {};
}

export default async function PublicScenarioPage({ params }: PageProps<"/scenarios/[key]">) {
  const scenario = getScenario((await params).key);
  if (!scenario) notFound();
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/scenarios" className="text-sm text-brand-600 hover:underline">← Todos os cenários</Link>
      <h1 className="mt-3 flex items-center gap-3 text-3xl font-semibold tracking-tight"><ScenarioIcon name={scenario.icon} className="size-7 text-brand-600" />{scenario.title}</h1>
      <p className="mt-2 text-slate-600">{scenario.summary}</p>
      <div className="mt-6">
        <ScenarioView
          scenario={scenario}
          familySlot={
            <div className="rounded-xl border border-brand-100 bg-brand-50 p-5 text-sm text-brand-900">
              <p className="font-semibold">Adapte este cenário à sua família</p>
              <p className="mt-1">Com uma conta gratuita, o FamilyReady indica o ponto de encontro, a mochila a usar, quem contactar e uma checklist ajustada a crianças, idosos e animais.</p>
              <Button asChild size="sm" className="mt-3"><Link href="/signup">Preparar a minha família</Link></Button>
            </div>
          }
        />
      </div>
    </div>
  );
}
