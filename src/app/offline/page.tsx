import { CloudOff } from "lucide-react";

export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <CloudOff className="size-10 text-slate-400" aria-hidden />
      <h1 className="mt-4 text-xl font-semibold">Sem ligação à Internet</h1>
      <p className="mt-2 text-sm text-slate-600">Esta página ainda não foi guardada para consulta offline. As páginas que já visitou (plano, pontos de encontro, mochilas, cenários) continuam disponíveis.</p>
      <p className="mt-4 text-sm text-slate-600">Em perigo imediato ligue <a href="tel:112" className="font-semibold text-brand-700">112</a>.</p>
      <a href="/app" className="mt-6 text-sm font-medium text-brand-600 underline">Voltar ao painel</a>
    </main>
  );
}
