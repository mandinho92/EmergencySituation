import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/misc";
import { getFamilyContext, hasRole, requireUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { CreateFamilyForm } from "@/modules/family/create-family-form";
import { OnboardingNav } from "@/modules/family/onboarding-nav";
import { BudgetForm, KitSettingsForm } from "@/modules/home-kit/preferences-form";
import { HouseholdForm } from "@/modules/household/household-form";
import { MembersManager } from "@/modules/members/members-manager";
import { TierPicker } from "@/modules/energy/tier-picker";
import { loadPreparedness } from "@/modules/preparedness/load";

export const metadata: Metadata = { title: "Configurar a família" };

const STEPS = [
  { key: "family", label: "Família" },
  { key: "members", label: "Membros" },
  { key: "household", label: "Habitação" },
  { key: "preferences", label: "Autonomia e orçamento" },
] as const;

export default async function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  const user = await requireUser("/onboarding");
  const ctx = await getFamilyContext();
  const requested = (await searchParams).step;
  const step = !ctx ? "family" : (STEPS.find((s) => s.key === requested)?.key ?? "members");
  if (ctx && step === "family") redirect("/onboarding?step=members");
  if (ctx && !hasRole(ctx.role, "editor")) redirect("/app");

  const surname = String(user.user_metadata?.full_name ?? "").trim().split(/\s+/).slice(-1)[0];
  const idx = STEPS.findIndex((s) => s.key === step);

  let body: React.ReactNode;
  if (!ctx) {
    body = (
      <>
        <h1 className="text-xl font-semibold">Bem-vindo ao FamilyReady</h1>
        <p className="mt-1 mb-5 text-sm text-slate-600">Comece por criar a sua família. Será o administrador e poderá convidar outros familiares depois. Se recebeu um convite, abra o link do email em vez de criar uma nova família.</p>
        <CreateFamilyForm defaultName={surname ? `Família ${surname}` : "A minha família"} />
      </>
    );
  } else {
    const data = await loadPreparedness(ctx.family.id);
    if (step === "members") {
      const supabase = await createClient();
      const { data: health } = await supabase.from("member_health").select("*").eq("family_id", ctx.family.id);
      body = (
        <>
          <h1 className="text-xl font-semibold">Quem vive convosco?</h1>
          <p className="mt-1 mb-5 text-sm text-slate-600">A composição do agregado define a água, a alimentação, as mochilas e os cuidados especiais. Não é preciso detalhar tudo agora.</p>
          <MembersManager members={data.memberRows} pets={data.petRows} health={health ?? []} canEdit canSeeHealth />
          <div className="mt-6"><OnboardingNav next="household" skippable={data.memberRows.length === 0} /></div>
        </>
      );
    } else if (step === "household") {
      body = (
        <>
          <h1 className="text-xl font-semibold">A vossa habitação</h1>
          <p className="mt-1 mb-5 text-sm text-slate-600">Ajuda a saber se precisam de fogareiro, detetor de monóxido de carbono, barreiras anti-inundação e outros equipamentos.</p>
          <HouseholdForm household={data.household} submitLabel="Guardar habitação" />
          <div className="mt-6"><OnboardingNav next="preferences" /></div>
        </>
      );
    } else {
      const supabase = await createClient();
      const { data: energy } = await supabase.from("energy_profiles").select("tier").eq("family_id", ctx.family.id).single();
      body = (
        <>
          <h1 className="text-xl font-semibold">Autonomia e orçamento</h1>
          <p className="mt-1 mb-5 text-sm text-slate-600">Defina o objetivo de autonomia em casa e quanto pretendem investir. Pode alterar tudo mais tarde.</p>
          <div className="space-y-8">
            <KitSettingsForm targetDays={data.homeKit.target_days} waterOverride={data.homeKit.water_adult_l_per_day} includeHygiene={data.homeKit.include_hygiene_water} hotClimate={data.homeKit.hot_climate} />
            <BudgetForm budgetCents={ctx.family.budget_cents} />
            <div>
              <h2 className="mb-1 text-sm font-medium">Energia de reserva (opcional)</h2>
              <p className="mb-3 text-sm text-slate-500">Baterias portáteis e painéis solares são um investimento adicional, não um requisito.</p>
              <TierPicker current={energy?.tier ?? "undecided"} />
            </div>
          </div>
          <div className="mt-6"><OnboardingNav next="done" label="Ver o meu plano" /></div>
        </>
      );
    }
  }

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <span className="flex items-center gap-2 font-semibold text-brand-800"><ShieldCheck className="size-5 text-ready-600" aria-hidden /> FamilyReady</span>
          {ctx && <Link href="/app" className="text-sm text-slate-500 hover:text-slate-900">Ir para o painel</Link>}
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <ol className="mb-6 grid grid-cols-4 gap-2" aria-label="Passos">
          {STEPS.map((s, i) => (
            <li key={s.key} className="space-y-1.5">
              <div className={cn("h-1.5 rounded-full", i <= idx ? "bg-brand-600" : "bg-slate-200")} />
              <p className={cn("text-xs", i === idx ? "font-semibold text-brand-800" : "text-slate-500")} aria-current={i === idx ? "step" : undefined}>{s.label}</p>
            </li>
          ))}
        </ol>
        <Card className="p-5 sm:p-7">{body}</Card>
        <Notice className="mt-4">Os seus dados são privados à sua família. Dados de saúde são opcionais e só são guardados com consentimento explícito.</Notice>
      </div>
    </div>
  );
}
