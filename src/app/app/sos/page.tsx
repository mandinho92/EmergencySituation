import { Backpack, IdCard, MapPin, Navigation, Phone, Siren } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ScenarioIcon } from "@/components/scenario-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EMERGENCY_NUMBERS, listScenarios } from "@/content/scenarios";
import { effectiveRisks, highlightedRisksFor } from "@/domain/locations/portugal";
import { MEETING_POINT_KIND_LABEL } from "@/i18n/messages";
import { requireFamily } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { StatusMessage } from "@/modules/sos/status-message";

export const metadata: Metadata = { title: "Emergência" };

const tel = (n: string) => `tel:${n.replace(/[^\d+]/g, "")}`;

/** Everything needed in the first minutes of an emergency, in one screen that works offline once visited. */
export default async function SosPage() {
  const ctx = await requireFamily();
  const supabase = await createClient();
  const [{ data: contacts }, { data: comm }, { data: points }, { data: household }] = await Promise.all([
    supabase.from("emergency_contacts").select("*").eq("family_id", ctx.family.id).order("created_at"),
    supabase.from("communication_plans").select("*").eq("family_id", ctx.family.id).single(),
    supabase.from("meeting_points").select("*").eq("family_id", ctx.family.id).order("sort_order"),
    supabase.from("household_profiles").select("district, selected_risks").eq("family_id", ctx.family.id).single(),
  ]);

  const list = contacts ?? [];
  const order = [comm?.out_of_region_contact_id, comm?.primary_contact_id, comm?.secondary_contact_id];
  const ranked = [...list].sort((a, b) => {
    const ia = order.indexOf(a.id); const ib = order.indexOf(b.id);
    return (ia === -1 ? 9 : ia) - (ib === -1 ? 9 : ib) || Number(b.is_out_of_region) - Number(a.is_out_of_region);
  });
  const tagFor = (id: string, out: boolean) => (id === comm?.out_of_region_contact_id || out ? "Fora da região — centraliza notícias" : id === comm?.primary_contact_id ? "Contacto principal" : id === comm?.secondary_contact_id ? "Contacto alternativo" : undefined);
  const smsContacts = ranked.filter((c) => c.phone || c.phone_alt).slice(0, 4).map((c) => ({ id: c.id, name: c.name, phone: (c.phone ?? c.phone_alt)!, tag: tagFor(c.id, c.is_out_of_region) }));

  const high = new Set(highlightedRisksFor(household?.district ?? null));
  const risks = new Set(effectiveRisks(household?.selected_risks ?? null, household?.district ?? null));
  const scenarios = listScenarios()
    .filter((s) => s.risk == null || risks.has(s.risk))
    .sort((a, b) => Number(b.risk != null && high.has(b.risk)) - Number(a.risk != null && high.has(a.risk)));

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="flex items-center gap-2 text-xl font-semibold"><Siren className="size-6 text-red-600" aria-hidden /> Emergência</h1>

      <a href="tel:112" className="flex h-20 items-center justify-center gap-3 rounded-2xl bg-red-600 text-2xl font-bold text-white shadow-lg active:bg-red-700" aria-label="Ligar 112, número europeu de emergência">
        <Phone className="size-7" aria-hidden /> Ligar 112
      </a>
      <div className="grid grid-cols-2 gap-2">
        {EMERGENCY_NUMBERS.slice(1).map((n) => (
          <a key={n.number} href={tel(n.number)} className="rounded-xl border border-slate-200 bg-white p-3 active:bg-slate-50">
            <span className="block text-base font-semibold text-brand-700">{n.number}</span>
            <span className="block text-xs text-slate-500">{n.label}</span>
          </a>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Avisar a família</CardTitle></CardHeader>
        <CardContent><StatusMessage senderName={ctx.profile.full_name.split(/\s+/)[0]} contacts={smsContacts} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Ligar</CardTitle><Link href="/app/communication" className="text-xs text-brand-600">Editar</Link></CardHeader>
        <CardContent>
          {ranked.length === 0 ? <p className="text-sm text-slate-500">Sem contactos. <Link href="/app/communication" className="text-brand-600 underline">Adicionar</Link></p> : (
            <ul className="divide-y divide-slate-100">
              {ranked.map((c) => (
                <li key={c.id} className="flex items-center gap-3 py-2">
                  <span className="min-w-0 flex-1"><span className="block truncate font-medium">{c.name}</span><span className="block text-xs text-slate-500">{tagFor(c.id, c.is_out_of_region) ?? c.relationship ?? ""}</span></span>
                  {c.phone && <a href={tel(c.phone)} className="flex size-12 items-center justify-center rounded-full bg-ready-600 text-white active:bg-ready-700" aria-label={`Ligar a ${c.name}`}><Phone className="size-5" aria-hidden /></a>}
                </li>
              ))}
            </ul>
          )}
          {comm?.pmr446_channel && <p className="mt-2 text-sm">Walkie-talkie PMR446: <strong>{comm.pmr446_channel}</strong></p>}
          {comm?.calls_fail_plan && <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><strong>Se as chamadas falharem:</strong> {comm.calls_fail_plan}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="size-4 text-brand-600" aria-hidden />Pontos de encontro</CardTitle><Link href="/app/meeting-points" className="text-xs text-brand-600">Editar</Link></CardHeader>
        <CardContent>
          {(points ?? []).length === 0 ? <p className="text-sm text-slate-500">Ainda não definidos. <Link href="/app/meeting-points" className="text-brand-600 underline">Definir</Link></p> : (
            <ul className="space-y-3">
              {(points ?? []).map((p) => {
                const lat = p.latitude == null ? null : Number(p.latitude);
                const lng = p.longitude == null ? null : Number(p.longitude);
                return (
                  <li key={p.id} className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-medium text-slate-500">{MEETING_POINT_KIND_LABEL[p.kind as keyof typeof MEETING_POINT_KIND_LABEL]}</p>
                    <p className="font-semibold">{p.name}</p>
                    {p.address && <p className="text-sm text-slate-600">{p.address}</p>}
                    {p.access_instructions && <p className="mt-1 text-sm text-slate-600">{p.access_instructions}</p>}
                    {lat != null && lng != null && (
                      <a href={`geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(p.name)})`} className="mt-2 flex h-11 items-center justify-center gap-2 rounded-lg bg-white text-sm font-medium text-brand-700 ring-1 ring-slate-200 active:bg-slate-100">
                        <Navigation className="size-4" aria-hidden /> Navegar ({lat.toFixed(4)}, {lng.toFixed(4)})
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>O que fazer</CardTitle></CardHeader>
        <CardContent>
          <ul className="grid grid-cols-2 gap-2">
            {scenarios.map((s) => (
              <li key={s.key}>
                <Link href={`/app/scenarios/${s.key}`} className="flex min-h-14 items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm font-medium active:bg-slate-50">
                  <ScenarioIcon name={s.icon} className="size-5 shrink-0 text-brand-600" />{s.title}
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        <Link href="/app/go-bags" className="flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-medium"><Backpack className="size-4" aria-hidden /> Mochilas</Link>
        <Link href="/app/print/cards" className="flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-medium"><IdCard className="size-4" aria-hidden /> Cartões</Link>
      </div>
      <p className="text-center text-xs text-slate-500">Siga sempre as indicações das autoridades. Abra este ecrã com Internet pelo menos uma vez para ficar disponível offline.</p>
    </div>
  );
}
