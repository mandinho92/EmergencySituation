"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/client";

function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/app";
}

const ERRORS: Record<string, string> = {
  otp_expired: "Este link já foi usado ou expirou. Cada link funciona uma vez e durante 1 hora.",
  access_denied: "Este link já foi usado ou expirou. Cada link funciona uma vez e durante 1 hora.",
};

/**
 * Landing page of the email link. Works on any device: the session is in the
 * URL fragment (never sent to a server), stored in cookies, then removed from
 * the address bar. Links in other formats are forwarded to /auth/confirm.
 */
export default function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const next = safeNext(url.searchParams.get("next"));
    const hash = new URLSearchParams(url.hash.slice(1));

    if (url.searchParams.get("code") || url.searchParams.get("token_hash")) {
      window.location.replace(`/auth/confirm${url.search}`);
      return;
    }
    const errorCode = hash.get("error_code") ?? hash.get("error") ?? url.searchParams.get("error_code");
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    // Remove tokens from the address bar and history immediately.
    window.history.replaceState(null, "", url.pathname + (next !== "/app" ? `?next=${encodeURIComponent(next)}` : ""));

    if (errorCode || !accessToken || !refreshToken) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- result of reading the URL once on mount
      setError(ERRORS[errorCode ?? ""] ?? "Não foi possível validar o link. Peça um novo link de acesso.");
      return;
    }
    getBrowserClient()
      .auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error: e }) => {
        if (e) setError("Não foi possível iniciar a sessão. Peça um novo link de acesso.");
        else window.location.replace(next);
      });
  }, []);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-slate-50 px-6 text-center">
      {error ? (
        <div className="max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-[var(--shadow-card)]">
          <h1 className="text-lg font-semibold">Link inválido ou expirado</h1>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
          <Link href="/login" className="mt-5 inline-flex h-11 items-center justify-center rounded-lg bg-brand-700 px-5 text-sm font-medium text-white">Pedir novo link</Link>
        </div>
      ) : (
        <p className="flex items-center gap-2 text-sm text-slate-600"><Loader2 className="size-4 animate-spin" aria-hidden /> A entrar…</p>
      )}
    </main>
  );
}
