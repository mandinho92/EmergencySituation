import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Como funciona" };

const SECTIONS = [
  { title: "1. Registo em segundos", body: "Indique o nome e o email. Recebe um link (e um código de 6 dígitos) para entrar. Não há palavras-passe para esquecer." },
  { title: "2. A sua família, como ela é", body: "Uma pessoa, um casal, uma família com bebés, idosos, pessoas com mobilidade reduzida ou animais. Pode adicionar e remover membros a qualquer momento, e completar a configuração mais tarde." },
  { title: "3. Habitação e localização aproximada", body: "Tipo de casa, gás, lareira, gerador, poço e o distrito. A morada exata é opcional. A localização serve para destacar riscos regionais — que pode confirmar ou alterar." },
  { title: "4. Cálculo das necessidades", body: "O motor de cálculo estima água (beber, cozinhar, higiene e reserva), alimentação por idade, higiene, primeiros socorros e energia, para o horizonte que escolher: de 24 horas a 14 dias ou personalizado. As referências são para planeamento e estão explicadas em cada artigo." },
  { title: "5. Dois sistemas separados", body: "O HOME KIT prepara a casa para ficar isolado. As GO BAGS são mochilas de evacuação, uma por adulto, leves e completas. As listas nunca se misturam." },
  { title: "6. Comprar com prioridades", body: "A lista de compras ordena os artigos por prioridade (P0 essencial a P3 opcional) e mostra o que cabe no seu orçamento. Os essenciais nunca desaparecem da lista por falta de orçamento. Os preços apresentados são estimativas de planeamento, identificadas como tal." },
  { title: "7. Plano familiar", body: "Pontos de encontro, contacto fora da região, canais alternativos (SMS, PMR446, rádio) e cartões de emergência imprimíveis para cada membro." },
  { title: "8. Em família, sempre atualizado", body: "Convide familiares com permissões (administrador, editor, membro, visualização). Quando alguém marca uma compra, todos veem. Alertas de validade e uma revisão trimestral mantêm o plano vivo." },
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Como funciona</h1>
      <p className="mt-2 text-slate-600">Da despreparação a uma preparação organizada, mensurável e continuamente atualizada.</p>
      <div className="mt-8 space-y-6">
        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 className="font-semibold">{s.title}</h2>
            <p className="mt-1 text-slate-600">{s.body}</p>
          </section>
        ))}
      </div>
      <Button asChild size="lg" className="mt-10"><Link href="/signup">Preparar a minha família</Link></Button>
    </div>
  );
}
