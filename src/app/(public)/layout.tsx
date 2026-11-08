import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Static public shell: the session is not read here so public pages can be prerendered. */
export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold text-brand-800">
            <ShieldCheck className="size-5 text-ready-600" aria-hidden /> FamilyReady
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-slate-600 md:flex" aria-label="Principal">
            <Link href="/how-it-works" className="hover:text-slate-900">Como funciona</Link>
            <Link href="/scenarios" className="hover:text-slate-900">Cenários de emergência</Link>
            <Link href="/privacy" className="hover:text-slate-900">Privacidade</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm"><Link href="/login">Entrar</Link></Button>
            <Button asChild size="sm"><Link href="/signup">Criar conta</Link></Button>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 text-sm text-slate-600 sm:grid-cols-3">
          <div>
            <p className="flex items-center gap-2 font-semibold text-brand-800"><ShieldCheck className="size-4 text-ready-600" aria-hidden /> FamilyReady</p>
            <p className="mt-2">Prepare hoje. Proteja a sua família amanhã.</p>
          </div>
          <div className="space-y-1">
            <Link href="/how-it-works" className="block hover:text-slate-900">Como funciona</Link>
            <Link href="/scenarios" className="block hover:text-slate-900">Cenários de emergência</Link>
            <Link href="/privacy" className="block hover:text-slate-900">Política de privacidade</Link>
            <Link href="/terms" className="block hover:text-slate-900">Termos de utilização</Link>
          </div>
          <p className="text-xs text-slate-500">
            O FamilyReady ajuda a preparar a sua família, mas não substitui as instruções das autoridades. Em emergência ligue <strong>112</strong> e siga as indicações da Proteção Civil.
          </p>
        </div>
      </footer>
    </div>
  );
}
