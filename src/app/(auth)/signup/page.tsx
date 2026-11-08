import type { Metadata } from "next";
import Link from "next/link";
import { MagicLinkForm } from "@/modules/auth/magic-link-form";

export const metadata: Metadata = { title: "Criar conta" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const { next, email } = await searchParams;
  return (
    <>
      <h1 className="text-lg font-semibold">Preparar a minha família</h1>
      <p className="mb-5 mt-1 text-sm text-slate-600">Só precisamos do seu nome e email. Sem palavra-passe.</p>
      <MagicLinkForm mode="signup" next={typeof next === "string" ? next : undefined} defaultEmail={typeof email === "string" ? email : undefined} />
      <p className="mt-5 text-center text-sm text-slate-600">Já tem conta? <Link href={`/login${typeof next === "string" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-brand-600 hover:underline">Entrar</Link></p>
    </>
  );
}
