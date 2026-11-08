"use client";

import { Download, Share, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "fr-install-dismissed";

/**
 * Suggests installing the app on the home screen (offline access to the plan).
 * Android/Chrome: native prompt. iOS Safari: short instructions (no API exists).
 * Hidden when already installed or dismissed (for 30 days).
 */
export function InstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    let dismissed = false;
    try {
      dismissed = Number(localStorage.getItem(DISMISS_KEY) ?? 0) > Date.now() - 30 * 86_400_000;
    } catch {
      /* private mode */
    }
    if (standalone || dismissed) return;
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
    if (isIos) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- platform detection only possible on the client
      setIos(true);
      setVisible(true);
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!visible) return null;
  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* private mode */
    }
  };

  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl bg-brand-800 p-4 text-sm text-white md:hidden no-print" role="region" aria-label="Instalar a aplicação">
      <Download className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="flex-1">
        <p className="font-semibold">Instale o FamilyReady no telemóvel</p>
        {ios ? (
          <p className="mt-1 text-brand-100">Toque em <Share className="inline size-4 align-text-bottom" aria-label="Partilhar" /> e depois em “Adicionar ao ecrã principal”. O plano fica disponível mesmo sem Internet.</p>
        ) : (
          <>
            <p className="mt-1 text-brand-100">Abre como uma app e o plano fica disponível sem Internet.</p>
            <Button size="sm" variant="secondary" className="mt-2" onClick={async () => { await event?.prompt(); dismiss(); }}>Instalar</Button>
          </>
        )}
      </div>
      <button type="button" onClick={dismiss} className="-m-2 p-2 text-brand-100" aria-label="Fechar"><X className="size-5" /></button>
    </div>
  );
}
