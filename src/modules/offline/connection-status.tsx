"use client";

import { CloudOff, Download, Loader2, RefreshCw, Wifi } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { formatDateTime } from "@/i18n/format";
import { cn } from "@/lib/utils";
import { flushOutbox, listOps, onOutboxChange } from "./outbox";
import { precachePages } from "./sw-registration";

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function useOnline() {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}

/**
 * Connectivity indicator: online/offline, when the data on screen was produced
 * by the server, pending offline changes, and "make available offline".
 */
export function ConnectionStatus({ renderedAt, offlineUrls, compact = false }: { renderedAt: string; offlineUrls: string[]; compact?: boolean }) {
  const online = useOnline();
  const router = useRouter();
  const [pending, setPending] = useState(0);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    listOps().then((o) => setPending(o.length));
    return onOutboxChange(setPending);
  }, []);

  useEffect(() => {
    if (!online) return;
    flushOutbox().then((r) => {
      if (!r || r.sent + r.failed.length === 0) return;
      if (r.sent > 0) toast.success(`${r.sent} alteração(ões) sincronizada(s).`);
      if (r.failed.length > 0) toast.error(`${r.failed.length} alteração(ões) não foram aplicadas: ${r.failed[0]}`);
      router.refresh();
    });
  }, [online, router]);

  async function download() {
    setDownloading(true);
    const r = await precachePages(offlineUrls);
    setDownloading(false);
    if (!r) toast.error("O modo offline requer a aplicação instalada ou o navegador com suporte a service workers.");
    else toast.success(`${r.ok} de ${r.total} páginas disponíveis offline.`);
  }

  return (
    <div className={cn("flex items-center gap-2 text-xs", compact && "gap-1.5")}>
      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium", online ? "bg-ready-50 text-ready-700" : "bg-amber-50 text-amber-800")} role="status" aria-live="polite">
        {online ? <Wifi className="size-3" aria-hidden /> : <CloudOff className="size-3" aria-hidden />}
        {online ? "Online" : "Offline"}
      </span>
      {!compact && (
        <span className="hidden text-slate-500 lg:inline" title="Momento em que estes dados foram obtidos do servidor">
          Dados de {formatDateTime(renderedAt)}
        </span>
      )}
      {pending > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 font-medium text-brand-700">
          <RefreshCw className="size-3" aria-hidden /> {pending} pendente{pending > 1 ? "s" : ""}
        </span>
      )}
      {online && !compact && (
        <button type="button" onClick={download} disabled={downloading} className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-slate-600 hover:bg-slate-100 disabled:opacity-50" title="Guardar o plano, pontos de encontro, contactos e checklists para consulta sem Internet">
          {downloading ? <Loader2 className="size-3 animate-spin" aria-hidden /> : <Download className="size-3" aria-hidden />}
          <span className="hidden sm:inline">Disponibilizar offline</span>
        </button>
      )}
    </div>
  );
}
