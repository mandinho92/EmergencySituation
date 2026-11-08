import type { Metadata } from "next";
import Link from "next/link";
import { MagicLinkForm } from "@/modules/auth/magic-link-form";

export const metadata: Metadata = { title: "Recuperar acesso" };

export default function RecoverPage() {
  return (
    <>
      <h1 className="text-lg font-semibold">Recuperar acesso</h1>
      <div className="mb-5 mt-1 space-y-2 text-sm text-slate-600">
        <p>Não há palavra-passe para recuperar: basta pedir um novo link para o email da conta.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Verifique a pasta de spam ou promoções.</li>
          <li>Cada link só funciona uma vez e expira em 1 hora — use sempre o mais recente.</li>
          <li>Se instalou a aplicação no telemóvel, use o código de 6 dígitos do email.</li>
          <li>Se perdeu o acesso ao email, peça ao administrador da família para o convidar com um novo email.</li>
        </ul>
      </div>
      <MagicLinkForm mode="login" />
      <p className="mt-5 text-center text-sm"><Link href="/login" className="text-brand-600 hover:underline">Voltar</Link></p>
    </>
  );
}
