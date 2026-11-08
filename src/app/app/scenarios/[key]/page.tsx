import { Backpack, House, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ScenarioIcon } from "@/components/scenario-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { adaptScenario, getScenario } from "@/content/scenarios";
import { MEETING_POINT_KIND_LABEL } from "@/i18n/messages";
import { hasRole, requireFamily } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { loadPreparedness } from "@/modules/preparedness/load";
import { ScenarioChecklist } from "@/modules/scenarios/checklist";
import { ScenarioPlanForm } from "@/modules/scenarios/plan-form";
import { ScenarioView } from "@/modules/scenarios/scenario-view";

export async function generateMetadata({ params }: PageProps<"/app/scenarios/[key]">): Promise<Metadata> {
  return { title: getScenario((await params).key)?.title ?? "Cenário" };
}

export default async function FamilyScenarioPage({ params }: PageProps<"/app/scenarios/[key]">) {
  const { key } = await params;
  const scenario = getScenario(key);
  if (!scenario) notFound();
  const ctx = await requireFamily();
  const supabase = await createClient();
  const [data, { data: plan }, { data: points }, { data: comm }, { data: contacts }] = await Promise.all([
    loadPreparedness(ctx.family.id),
    supabase.from("emergency_plans").select("*").eq("family_id", ctx.family.id).eq("scenario_key", key).maybeSingle(),
    supabase.from("meeting_points").select("id, name, kind, address, scenario_keys, latitude, longitude").eq("family_id", ctx.family.id).order("sort_order"),
    supabase.from("communication_plans").select("*").eq("family_id", ctx.family.id).single(),
    supabase.from("emergency_contacts").select("id, name, phone, is_out_of_region").eq("family_id", ctx.family.id),
  ]);

  const audience = {
    children: data.members.some((m) => m.category === "child" || m.category === "baby"),
    pets: data.pets.length > 0,
    mobility: data.members.some((m) => m.reducedMobility),
    seniors: data.members.some((m) => m.category === "senior"),
  };
  const { checklist, adaptations } = adaptScenario(scenario, audience);
  const mp = (points ?? []).find((p) => p.id === plan?.meeting_point_id)
    ?? (points ?? []).find((p) => p.scenario_keys.includes(key))
    ?? (scenario.meetingPoint ? (points ?? []).find((p) => p.kind === scenario.meetingPoint) : undefined);
  const contactName = (id: string | null | undefined) => (contacts ?? []).find((c) => c.id === id);
  const outContact = contactName(comm?.out_of_region_contact_id) ?? (contacts ?? []).find((c) => c.is_out_of_region);
  const primary = contactName(comm?.primary_contact_id);
  const bagsLabel = scenario.kitStrategy === "home_kit" ? "HOME KIT" : scenario.kitStrategy === "go_bags" ? "GO BAGS" : "HOME KIT + GO BAGS prontas";

  return (
    <>
      <Link href="/app/scenarios" className="text-sm text-brand-600 hover:underline no-print">← Cenários</Link>
      <PageHeader title={scenario.title} description={scenario.summary} actions={<ScenarioIcon name={scenario.icon} className="size-8 text-brand-600" />} />
      <ScenarioView
        scenario={scenario}
        adaptations={adaptations}
        familySlot={
          <Card className="border-brand-100 bg-brand-50/40">
            <CardHeader><CardTitle>O plano da vossa família</CardTitle></CardHeader>
            <CardContent className="grid gap-4 text-sm sm:grid-cols-3">
              <div>
                <p className="flex items-center gap-1.5 font-medium">{scenario.kitStrategy === "home_kit" ? <House className="size-4 text-brand-600" aria-hidden /> : <Backpack className="size-4 text-brand-600" aria-hidden />}Kit a utilizar</p>
                <p className="mt-1">{bagsLabel}</p>
                <p className="mt-1 text-xs text-slate-500">{data.bags.length} mochila(s) · HOME KIT para {data.settings.targetDays} dia(s)</p>
              </div>
              <div>
                <p className="flex items-center gap-1.5 font-medium"><MapPin className="size-4 text-brand-600" aria-hidden />Ponto de encontro</p>
                {mp ? (<><p className="mt-1">{mp.name}</p><p className="text-xs text-slate-500">{MEETING_POINT_KIND_LABEL[mp.kind as keyof typeof MEETING_POINT_KIND_LABEL]}{mp.address ? ` · ${mp.address}` : ""}</p></>) : scenario.meetingPoint ? <p className="mt-1 text-amber-700">Ainda não definido — <Link href="/app/meeting-points" className="underline">definir</Link></p> : <p className="mt-1 text-slate-500">Normalmente não é necessário sair de casa.</p>}
              </div>
              <div>
                <p className="flex items-center gap-1.5 font-medium"><Phone className="size-4 text-brand-600" aria-hidden />Comunicação</p>
                {outContact ? <p className="mt-1">Informar: <a href={outContact.phone ? `tel:${outContact.phone.replace(/\s/g, "")}` : undefined} className="font-medium text-brand-700">{outContact.name}</a> (fora da região)</p> : <p className="mt-1 text-amber-700">Sem contacto fora da região — <Link href="/app/communication" className="underline">definir</Link></p>}
                {primary && <p className="text-xs text-slate-500">Principal: {primary.name}{primary.phone ? ` · ${primary.phone}` : ""}</p>}
                {comm?.pmr446_channel && <p className="text-xs text-slate-500">PMR446: {comm.pmr446_channel}</p>}
              </div>
              {plan?.notes && <p className="whitespace-pre-line rounded-lg bg-white p-3 sm:col-span-3">{plan.notes}</p>}
              {hasRole(ctx.role, "editor") && <details className="sm:col-span-3"><summary className="cursor-pointer text-sm font-medium text-brand-600">Ajustar para a nossa família</summary><div className="mt-3"><ScenarioPlanForm scenario={key} meetingPointId={plan?.meeting_point_id ?? null} notes={plan?.notes ?? null} meetingPoints={points ?? []} /></div></details>}
            </CardContent>
          </Card>
        }
        checklistSlot={<ScenarioChecklist scenario={key} items={checklist} done={plan?.completed_steps ?? []} canUpdate={hasRole(ctx.role, "member")} />}
      />
    </>
  );
}
