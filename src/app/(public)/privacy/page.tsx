import type { Metadata } from "next";

export const metadata: Metadata = { title: "Política de privacidade" };

export default function PrivacyPage() {
  return (
    <article className="prose-sm mx-auto max-w-3xl space-y-5 px-4 py-12 text-slate-700 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-slate-900">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Política de privacidade</h1>
      <p className="text-sm text-slate-500">Versão de 8 de novembro de 2026. Documento-base a validar juridicamente antes do lançamento público, incluindo a identificação do responsável pelo tratamento.</p>

      <h2>1. Que dados recolhemos</h2>
      <p>Para criar a conta: nome e email. Opcionalmente, para calcular o seu plano: composição do agregado (nomes ou identificações, faixas etárias, necessidades), animais, características da habitação, distrito e município, pontos de encontro e contactos de emergência.</p>
      <p>Dados de saúde (alergias, medicação, necessidades de saúde) são <strong>opcionais</strong>, só são guardados com o seu consentimento explícito e ficam numa área separada, não visível para quem tem permissão de visualização.</p>

      <h2>2. Para que usamos os dados</h2>
      <p>Exclusivamente para prestar o serviço: calcular necessidades, gerar listas e planos, partilhar a informação com os membros da família que convidar e enviar emails de acesso e convites. Não vendemos dados nem os usamos para publicidade.</p>

      <h2>3. Base legal</h2>
      <p>Execução do contrato (prestação do serviço) e, para dados de saúde, consentimento explícito (art. 9.º, n.º 2, alínea a) do RGPD), que pode retirar a qualquer momento apagando esses dados.</p>

      <h2>4. Quem tem acesso</h2>
      <p>Apenas as contas que pertencem à sua família, de acordo com as permissões atribuídas pelo administrador. O isolamento entre famílias é garantido na base de dados (Row Level Security). Os pontos de encontro e dados familiares nunca são publicados em páginas públicas. Convites e notificações não incluem dados de saúde.</p>

      <h2>5. Subcontratantes</h2>
      <p>Alojamento da aplicação (Vercel), base de dados e autenticação (Supabase), envio de emails (fornecedor de email configurado) e, nos mapas, o carregamento de mosaicos do OpenStreetMap a partir do seu navegador. A lista definitiva e as regiões de alojamento devem constar desta política antes do lançamento.</p>

      <h2>6. Conservação</h2>
      <p>Os dados são conservados enquanto a conta existir. Ao eliminar a conta, os seus dados pessoais são apagados; se for o único membro de uma família, a família e todos os seus dados são apagados. Os registos de auditoria guardam apenas que campos foram alterados, nunca os valores.</p>

      <h2>7. Os seus direitos</h2>
      <p>Pode aceder, retificar, exportar (Definições → Exportar os meus dados) e apagar os seus dados (Definições → Eliminar conta) a qualquer momento. Pode também apresentar reclamação à Comissão Nacional de Proteção de Dados (CNPD).</p>

      <h2>8. Segurança</h2>
      <p>Autenticação sem palavra-passe, sessões seguras, ligações cifradas, tokens de convite guardados apenas sob a forma de hash e com expiração, limitação de pedidos e registo de auditoria das alterações.</p>
    </article>
  );
}
