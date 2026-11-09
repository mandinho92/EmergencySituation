import type { Metadata } from "next";
import Link from "next/link";
import { Notice } from "@/components/ui/misc";
import { MagicLinkForm } from "@/modules/auth/magic-link-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error, signed_out, email } = await searchParams;
  return (
    <>
      <h1 className="text-lg font-semibold">Entrar</h1>
      <p className="mb-5 mt-1 text-sm text-slate-600">Enviamos um link de acesso para o seu email. Sem palavra-passe.</p>
      {error === "link" && <Notice tone="danger" className="mb-4">O link é inválido ou expirou. Peça um novo.</Notice>}
      {signed_out && <Notice tone="success" className="mb-4">Sessão terminada.</Notice>}
      <MagicLinkForm mode="login" next={typeof next === "string" ? next : undefined} defaultEmail={typeof email === "string" ? email : undefined} />
      <div className="mt-5 space-y-1 text-center text-sm text-slate-600">
        <p>Ainda não tem conta? <Link href="/signup" className="font-medium text-brand-600 hover:underline">Criar conta</Link></p>
        <p><Link href="/recover" className="text-slate-500 hover:underline">Não consigo entrar</Link></p>
      </div>
    </>
  );
}
