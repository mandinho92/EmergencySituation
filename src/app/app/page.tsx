import { ArrowRight, Backpack, BatteryCharging, Bell, Droplets, HeartPulse, ListChecks, MessagesSquare, ShieldCheck, Soup, TriangleAlert, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Notice, PageHeader, Stat } from "@/components/ui/misc";
import { ProgressBar, ProgressRing } from "@/components/ui/progress";
import { formatDate, formatNumber } from "@/i18n/format";
import { hasRole, requireFamily } from "@/lib/session";
import { cn } from "@/lib/utils";
import { loadDashboard } from "@/modules/dashboard/load";

export const metadata: Metadata = { title: "Painel" };

const ENERGY_STATUS = {
  not_decided: "Por decidir (opcional)",
  not_wanted: "Sem bateria — só o básico",
  tier_chosen: "Nível escolhido, produto por selecionar",
  configured_not_acquired: "Solução configurada, ainda não adquirida",
  acquired: "Solução adquirida",
  basic_only: "Powerbanks e iluminação",
} as const;

export default async function DashboardPage({ searchParams }: PageProps<"/app">) {
  const ctx = await requireFamily();
  const sp = await searchParams;
  const { data, readiness, alerts, tasks } = await loadDashboard(ctx.family.id);
  // First visit of a brand-new family goes to onboarding; afterwards the user may skip it freely.
  if (!ctx.family.onboarding_completed_at && data.members.length === 0 && hasRole(ctx.role, "editor") && !sp.skip) redirect("/onboarding?step=members");
  const onboardingPending = !ctx.family.onboarding_completed_at && hasRole(ctx.role, "editor");
  const { scores, indicators, actions } = readiness;
  const firstName = ctx.profile.full_name.split(/\s+/)[0];

  const breakdown = [
    { label: "GO BAGS", value: scores.goBags, href: "/app/go-bags", icon: Backpack },
    { label: "HOME KIT", value: scores.homeKit, href: "/app/home-kit", icon: ShieldCheck },
    { label: "Água", value: scores.water, href: "/app/home-kit#water", icon: Droplets },
    { label: "Alimentação", value: scores.food, href: "/app/home-kit#food", icon: Soup },
    { label: "Energia", value: scores.energy, href: "/app/energy", icon: BatteryCharging },
    { label: "Primeiros socorros", value: scores.firstAid, href: "/app/home-kit#first_aid", icon: HeartPulse },
    { label: "Segurança", value: scores.safety, href: "/app/home-kit#fire", icon: TriangleAlert },
    { label: "Plano familiar", value: scores.plan, href: "/app/meeting-points", icon: Users },
    { label: "Comunicação", value: scores.communication, href: "/app/communication", icon: MessagesSquare },
  ];

  return (
    <>
      <PageHeader title={`Olá, ${firstName}`} description={`Preparação da ${ctx.family.name} para ${data.settings.targetDays === 1 ? "24 horas" : `${data.settings.targetDays} dias`} em casa e 72 horas em evacuação.`} />
      {sp.error === "permission" && <Notice tone="warning" className="mb-4">A sua permissão nesta família não permite abrir essa página.</Notice>}
      {onboardingPending && !sp.welcome && (
        <Notice className="mb-4" title="Configuração por completar">
          Pode continuar a configuração (habitação, autonomia e orçamento) quando quiser. <Link href="/onboarding?step=household">Continuar configuração</Link>
        </Notice>
      )}
      {sp.joined && <Notice tone="success" className="mb-4">Entrou na família {ctx.family.name}. Todas as alterações são partilhadas em tempo real.</Notice>}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Preparação global</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-4 pb-5 lg:flex-col lg:gap-3 lg:pb-6">
            <span className="lg:hidden"><ProgressRing value={scores.global} size={96} stroke={9} label="Preparação global" /></span>
            <span className="hidden lg:inline-flex"><ProgressRing value={scores.global} size={148} stroke={12} label="Preparação global" /></span>
            <p className="text-sm text-slate-500 lg:text-center">{scores.global >= 80 ? "Bem preparados. Mantenham as revisões em dia." : scores.global >= 40 ? "A caminho. Sigam as ações prioritárias." : "Comecem pelas ações prioritárias — os essenciais primeiro."}</p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Ações prioritárias</CardTitle>
            <Badge tone="brand">{actions.length}</Badge>
          </CardHeader>
          <CardContent>
            {actions.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">Sem ações pendentes. Excelente trabalho.</p>
            ) : (
              <ol className="space-y-2">
                {actions.map((a, i) => (
                  <li key={a.key}>
                    <Link href={a.href} className="group flex items-center gap-3 rounded-lg border border-slate-100 p-3 hover:border-brand-200 hover:bg-brand-50/40">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-700 text-xs font-semibold text-white">{i + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-slate-900">{a.title}</span>
                        {a.detail && <span className="block text-xs text-slate-500">{a.detail}</span>}
                      </span>
                      <ArrowRight className="size-4 text-slate-300 group-hover:text-brand-600" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat icon={Droplets} label="Autonomia de água" value={`${formatNumber(indicators.waterDays)} dia(s)`} hint={`${formatNumber(data.water.haveLiters)} de ${data.water.requiredLiters} L`} />
        <Stat icon={Soup} label="Autonomia alimentar" value={indicators.foodDays == null ? "—" : `${indicators.foodDays} dia(s)`} hint={`Objetivo: ${data.settings.targetDays} dias`} />
        <Stat icon={Backpack} label="Mochilas preparadas" value={`${indicators.bagsReady} de ${indicators.bagsTotal}`} hint={indicators.bagsTotal === 0 ? "Ainda não criadas" : "Essenciais colocados"} />
        <Stat icon={BatteryCharging} label="Energia" value={<span className="text-sm">{ENERGY_STATUS[indicators.energyStatus]}</span>} />
        <Stat icon={TriangleAlert} label="Essenciais em falta" value={indicators.essentialMissing} hint="Artigos P0" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Estado de preparação</CardTitle></CardHeader>
          <CardContent>
            <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {breakdown.map((b) => (
                <li key={b.label}>
                  <Link href={b.href} className="block rounded-md hover:bg-slate-50">
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-slate-700"><b.icon className="size-4 text-slate-400" aria-hidden />{b.label}</span>
                      <span className="font-medium tabular-nums">{b.value}%</span>
                    </div>
                    <ProgressBar value={b.value} label={b.label} />
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="size-4 text-brand-600" aria-hidden />Alertas</CardTitle>{alerts.length > 0 && <Badge tone="warning">{alerts.length}</Badge>}</CardHeader>
            <CardContent>
              {alerts.length === 0 ? <p className="text-sm text-slate-500">Sem validades, recargas ou revisões pendentes.</p> : (
                <ul className="space-y-2">
                  {alerts.slice(0, 5).map((a) => (
                    <li key={a.id}>
                      <Link href={a.href} className="flex items-start gap-2 text-sm hover:underline">
                        <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", a.severity === "high" ? "bg-red-500" : a.severity === "medium" ? "bg-amber-500" : "bg-slate-300")} aria-hidden />
                        <span><span className="font-medium">{a.title}</span><span className="block text-xs text-slate-500">{a.detail}</span></span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><ListChecks className="size-4 text-brand-600" aria-hidden />Tarefas</CardTitle><Link href="/app/tasks" className="text-xs text-brand-600 hover:underline">Ver todas</Link></CardHeader>
            <CardContent>
              {tasks.length === 0 ? <p className="text-sm text-slate-500">Sem tarefas abertas. Distribua tarefas pela família.</p> : (
                <ul className="space-y-1.5 text-sm">
                  {tasks.map((t) => <li key={t.id} className="flex justify-between gap-2"><span className="truncate">{t.title}</span>{t.due_on && <span className="shrink-0 text-xs text-slate-500">{formatDate(t.due_on)}</span>}</li>)}
                </ul>
              )}
            </CardContent>
          </Card>
          {ctx.role === "admin" && (
            <Button asChild variant="secondary" className="w-full"><Link href="/app/family"><Users aria-hidden /> Convidar um familiar</Link></Button>
          )}
        </div>
      </div>
    </>
  );
}
