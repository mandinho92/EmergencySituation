import { ArrowRight, Backpack, BookOpen, CircleCheck, House, Lock, MapPin, MessagesSquare, ShoppingCart, Users, WifiOff } from "lucide-react";
import Link from "next/link";
import { ScenarioIcon } from "@/components/scenario-icon";
import { Button } from "@/components/ui/button";
import { listScenarios } from "@/content/scenarios";
import { computeWater } from "@/domain/preparedness/water";

const STEPS = [
  { title: "Crie a conta", text: "Apenas nome e email. Entra com um link seguro, sem palavra-passe." },
  { title: "Descreva a família", text: "Adultos, crianças, bebés, idosos, animais e a sua habitação." },
  { title: "Receba o plano", text: "Quantidades de água, alimentação, higiene, energia e o que falta comprar." },
  { title: "Prepare em conjunto", text: "Convide familiares, distribua tarefas e acompanhe o progresso." },
];

const FEATURES = [
  { icon: House, title: "HOME KIT", text: "Tudo o que precisa para ficar em casa 24 horas a 14 dias: stock necessário, stock existente e o que falta." },
  { icon: Backpack, title: "GO BAGS", text: "Uma mochila de evacuação por adulto, leve e completa, com peso estimado e validades." },
  { icon: ShoppingCart, title: "Lista de compras", text: "Prioridades P0 a P3, custos estimados e o que cabe no seu orçamento — sem esconder os essenciais." },
  { icon: MapPin, title: "Pontos de encontro", text: "Perto de casa, fora da zona e alternativo, com coordenadas e instruções." },
  { icon: MessagesSquare, title: "Plano de comunicação", text: "Quem contacta quem, contacto fora da região e o que fazer quando a rede falha." },
  { icon: WifiOff, title: "Disponível offline", text: "Instale no telemóvel e consulte o plano, os contactos e as checklists sem Internet." },
];

export default function LandingPage() {
  const scenarios = listScenarios().slice(0, 8);
  // The example is computed with the real engine so the landing page never drifts from it.
  const base = { ageYears: null, reducedMobility: false, dietaryNeeds: null, specialEquipment: null, usesDiapers: false, infantFeeding: null, comfortItems: null, responsibleMemberId: null };
  const example = computeWater(
    [{ ...base, id: "a", displayName: "A", category: "adult" }, { ...base, id: "b", displayName: "B", category: "adult" }, { ...base, id: "c", displayName: "C", category: "child", ageYears: 8 }],
    [],
    { targetDays: 7, waterAdultLitersPerDay: null, includeHygieneWater: true, hotClimate: false },
  );
  return (
    <>
      <section className="border-b border-slate-100 bg-gradient-to-b from-brand-50/60 to-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:py-24 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-brand-700 shadow-sm ring-1 ring-brand-100">
              <CircleCheck className="size-3.5 text-ready-600" aria-hidden /> Preparação familiar para Portugal
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">Prepare hoje.<br />Proteja a sua família amanhã.</h1>
            <p className="mt-5 max-w-xl text-lg text-slate-600">
              O FamilyReady calcula o que a sua família precisa para apagões, falhas de água, incêndios, sismos ou evacuações — e ajuda-vos a preparar tudo, em conjunto, passo a passo.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg"><Link href="/signup">Preparar a minha família <ArrowRight aria-hidden /></Link></Button>
              <Button asChild size="lg" variant="secondary"><Link href="/how-it-works">Como funciona</Link></Button>
            </div>
            <p className="mt-4 text-sm text-slate-500">Gratuito. Sem palavra-passe. Os seus dados ficam privados à sua família.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-card)]" aria-hidden>
            <p className="text-sm font-medium text-slate-500">Exemplo · 2 adultos e 1 criança · 7 dias</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              {[["Água necessária", `${example.totalLiters} L`], ["Garrafões de 5 L", String(example.containers.count)], ["Mochilas", "2 adultos + 1 infantil"], ["Pontos de encontro", "3"]].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-slate-50 p-3"><p className="text-slate-500">{k}</p><p className="mt-1 text-lg font-semibold text-slate-900">{v}</p></div>
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-400">Calculado com o motor da aplicação (inclui higiene e 10% de reserva). O seu resultado depende da sua família e do clima.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-semibold tracking-tight">Do zero a um plano organizado</h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-xl border border-slate-200 p-5">
              <span className="flex size-7 items-center justify-center rounded-full bg-brand-700 text-sm font-semibold text-white">{i + 1}</span>
              <h3 className="mt-3 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-semibold tracking-tight">Uma aplicação para a família usar durante anos</h2>
          <p className="mt-2 max-w-2xl text-slate-600">Saber o que tem, o que falta, quem trata de quê, onde se encontrar e como comunicar.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-xl border border-slate-200 bg-white p-5">
                <f.icon className="size-5 text-brand-600" aria-hidden />
                <h3 className="mt-3 font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Saber o que fazer, em cada cenário</h2>
            <p className="mt-2 text-slate-600">Procedimentos práticos: o que fazer já, o que não fazer, quando ficar e quando sair.</p>
          </div>
          <Link href="/scenarios" className="hidden items-center gap-1 text-sm font-medium text-brand-600 hover:underline sm:inline-flex">Ver todos <ArrowRight className="size-4" aria-hidden /></Link>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {scenarios.map((s) => (
            <Link key={s.key} href={`/scenarios/${s.key}`} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-medium hover:border-brand-200 hover:bg-brand-50/40">
              <ScenarioIcon name={s.icon} className="size-5 shrink-0 text-brand-600" /> {s.title}
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-100 bg-brand-900 text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-3">
          {[
            { icon: Lock, title: "Privado por defeito", text: "Os dados da família são visíveis apenas para quem convidar. Dados de saúde são opcionais e protegidos." },
            { icon: Users, title: "Feito para partilhar", text: "Uma família, um plano: alterações sincronizadas entre todos os membros." },
            { icon: BookOpen, title: "Baseado em fontes oficiais", text: "Recomendações alinhadas com ANEPC, DGS, INEM e IPMA. Não substitui as autoridades." },
          ].map((f) => (
            <div key={f.title}>
              <f.icon className="size-5 text-ready-500" aria-hidden />
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-brand-100">{f.text}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
