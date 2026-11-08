"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <TriangleAlert className="mx-auto size-8 text-amber-500" aria-hidden />
      <h1 className="mt-3 text-lg font-semibold">{offline ? "Sem ligação" : "Algo correu mal"}</h1>
      <p className="mt-1 text-sm text-slate-600">
        {offline ? "Esta página não está disponível offline. As páginas já visitadas continuam acessíveis." : "Não foi possível carregar esta página. Tente novamente."}
      </p>
      {error.digest && <p className="mt-2 text-xs text-slate-400">Referência: {error.digest}</p>}
      <Button className="mt-5" onClick={reset}>Tentar novamente</Button>
    </div>
  );
}
