import type { Metadata } from "next";

export const metadata: Metadata = { title: "Termos de utilização" };

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-5 px-4 py-12 text-slate-700 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-slate-900">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Termos de utilização</h1>
      <p className="text-sm text-slate-500">Versão de 8 de novembro de 2026. Documento-base a validar juridicamente antes do lançamento público.</p>
      <h2>1. Natureza do serviço</h2>
      <p>O FamilyReady é uma ferramenta de organização e planeamento da preparação familiar. <strong>Não substitui as instruções das autoridades</strong> (Proteção Civil, bombeiros, forças de segurança, INEM, DGS). Em perigo imediato, ligue 112.</p>
      <h2>2. Cálculos e recomendações</h2>
      <p>As quantidades calculadas são referências de planeamento. Não constituem aconselhamento médico, nutricional ou técnico individualizado. Necessidades reais variam com o clima, a saúde, a idade e a atividade. Medicação e alimentação infantil devem ser definidas com profissionais de saúde.</p>
      <h2>3. Produtos e preços</h2>
      <p>Os preços apresentados são estimativas de planeamento ou preços verificados numa data indicada. Não são ofertas. Confirme sempre o preço, as especificações e a compatibilidade junto da loja ou do fabricante antes de comprar.</p>
      <h2>4. Energia</h2>
      <p>As estimativas de autonomia de baterias e produção solar dependem de perdas de conversão, temperatura, estado da bateria e meteorologia. Não garantem um resultado. Equipamento médico de suporte de vida deve ter soluções validadas pelo fabricante e pelo médico.</p>
      <h2>5. Conta e família</h2>
      <p>O administrador de uma família é responsável pelos convites e permissões. Não inclua dados de terceiros sem o seu conhecimento. Pode eliminar a conta a qualquer momento.</p>
      <h2>6. Disponibilidade</h2>
      <p>O serviço é prestado com o cuidado devido, mas pode ter interrupções. Mantenha cópias impressas do plano familiar e dos cartões de emergência.</p>
    </article>
  );
}
