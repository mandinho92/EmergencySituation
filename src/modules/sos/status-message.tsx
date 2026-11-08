"use client";

import { Copy, LocateFixed, MessageSquare, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Kind = "ok" | "help";

/**
 * Composes a short status SMS (works without mobile data). GPS location is
 * read from the device (no Internet needed) and added as coordinates.
 */
export function StatusMessage({ senderName, contacts }: { senderName: string; contacts: Array<{ id: string; name: string; phone: string; tag?: string }> }) {
  const [kind, setKind] = useState<Kind>("ok");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  const base = kind === "ok" ? `Estou bem. — ${senderName}` : `PRECISO DE AJUDA. — ${senderName}`;
  const where = coords ? ` Localização: ${coords.lat.toFixed(5)},${coords.lng.toFixed(5)} https://www.openstreetmap.org/?mlat=${coords.lat.toFixed(5)}&mlon=${coords.lng.toFixed(5)}` : "";
  const message = `${base}${where}`;
  const smsHref = (phone: string) => `sms:${phone.replace(/[^\d+]/g, "")}?&body=${encodeURIComponent(message)}`;

  function locate() {
    if (!navigator.geolocation) return toast.error("Localização indisponível neste dispositivo.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocating(false); },
      () => { setLocating(false); toast.error("Não foi possível obter a localização. Verifique as permissões."); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de mensagem">
        {([["ok", "Estou bem"], ["help", "Preciso de ajuda"]] as const).map(([k, label]) => (
          <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)}
            className={cn("h-12 rounded-xl border-2 text-sm font-semibold", kind === k ? (k === "ok" ? "border-ready-600 bg-ready-50 text-ready-700" : "border-red-600 bg-red-50 text-red-700") : "border-slate-200 bg-white text-slate-700")}>
            {label}
          </button>
        ))}
      </div>
      <Button type="button" variant="secondary" className="w-full" onClick={locate} disabled={locating}>
        <LocateFixed aria-hidden /> {coords ? "Localização adicionada · atualizar" : locating ? "A obter localização…" : "Adicionar a minha localização (GPS)"}
      </Button>
      <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700" aria-live="polite">{message}</p>
      {contacts.length === 0 ? (
        <p className="text-sm text-slate-500">Adicione contactos no plano de comunicação para enviar a mensagem com um toque.</p>
      ) : (
        <ul className="grid gap-2">
          {contacts.map((c) => (
            <li key={c.id}>
              <a href={smsHref(c.phone)} className="flex h-14 items-center gap-3 rounded-xl bg-brand-700 px-4 text-white active:bg-brand-900">
                <MessageSquare className="size-5 shrink-0" aria-hidden />
                <span className="min-w-0 flex-1"><span className="block truncate font-semibold">SMS para {c.name}</span>{c.tag && <span className="block text-xs text-brand-100">{c.tag}</span>}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="ghost" onClick={() => navigator.clipboard?.writeText(message).then(() => toast.success("Mensagem copiada."))}><Copy aria-hidden /> Copiar</Button>
        <Button type="button" variant="ghost" onClick={() => (navigator.share ? navigator.share({ text: message }).catch(() => undefined) : toast.message("Partilha indisponível: use Copiar."))}><Share2 aria-hidden /> Partilhar</Button>
      </div>
    </div>
  );
}
