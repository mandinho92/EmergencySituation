import type { Metadata } from "next";
import { PrintButton } from "@/components/print-button";
import { Notice } from "@/components/ui/misc";
import { MEETING_POINT_KIND_LABEL } from "@/i18n/messages";
import { hasRole, requireFamily } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Cartões de emergência" };

export default async function CardsPage() {
  const ctx = await requireFamily();
  const supabase = await createClient();
  const [{ data: members }, { data: contacts }, { data: comm }, { data: points }, health] = await Promise.all([
    supabase.from("member_profiles").select("id, display_name, category").eq("family_id", ctx.family.id).order("sort_order"),
    supabase.from("emergency_contacts").select("*").eq("family_id", ctx.family.id),
    supabase.from("communication_plans").select("*").eq("family_id", ctx.family.id).single(),
    supabase.from("meeting_points").select("id, name, kind, address").eq("family_id", ctx.family.id).order("sort_order"),
    hasRole(ctx.role, "member") ? supabase.from("member_health").select("*").eq("family_id", ctx.family.id).eq("include_on_card", true) : Promise.resolve({ data: [] }),
  ]);
  const c = (id: string | null | undefined) => (contacts ?? []).find((x) => x.id === id);
  const primary = c(comm?.primary_contact_id);
  const secondary = c(comm?.secondary_contact_id);
  const out = c(comm?.out_of_region_contact_id) ?? (contacts ?? []).find((x) => x.is_out_of_region);
  const near = (points ?? []).find((p) => p.kind === "near_home");
  const far = (points ?? []).find((p) => p.kind === "out_of_area");
  const healthBy = new Map((health.data ?? []).map((h) => [h.member_profile_id, h]));

  return (
    <div className="mx-auto max-w-4xl bg-white p-6 print:p-0">
      <div className="mb-4 flex items-center justify-between gap-4 no-print">
        <div><h1 className="text-xl font-semibold">Cartões de emergência</h1><p className="text-sm text-slate-500">Um cartão por membro, para a carteira ou a mochila. Recorte pelas linhas.</p></div>
        <PrintButton />
      </div>
      {(!out || !near) && <Notice tone="warning" className="mb-4 no-print">Faltam dados: {!out && "contacto fora da região"}{!out && !near && " e "}{!near && "ponto de encontro perto de casa"}. Complete o plano para cartões mais úteis.</Notice>}
      <div className="grid gap-3 sm:grid-cols-2 print:grid-cols-2">
        {(members ?? []).map((m) => {
          const h = healthBy.get(m.id);
          return (
            <section key={m.id} className="break-inside-avoid rounded-lg border-2 border-dashed border-slate-300 p-4 text-[13px] leading-snug">
              <p className="text-[11px] font-semibold tracking-wide text-brand-700 uppercase">Cartão de emergência · {ctx.family.name}</p>
              <p className="mt-1 text-lg font-semibold">{m.display_name}</p>
              <p className="mt-2"><strong>Emergência: 112</strong></p>
              {primary && <p>Contacto: {primary.name} · {primary.phone ?? primary.email}</p>}
              {secondary && <p>Alternativo: {secondary.name} · {secondary.phone ?? secondary.email}</p>}
              {out && <p>Fora da região: {out.name} · {out.phone ?? out.email}</p>}
              {near && <p className="mt-1">Encontro ({MEETING_POINT_KIND_LABEL.near_home.toLowerCase()}): {near.name}{near.address ? `, ${near.address}` : ""}</p>}
              {far && <p>Encontro ({MEETING_POINT_KIND_LABEL.out_of_area.toLowerCase()}): {far.name}</p>}
              {h && (h.allergies || h.medication || h.health_needs) && (
                <div className="mt-2 border-t border-slate-200 pt-1.5">
                  <p className="font-semibold">Informação médica</p>
                  {h.allergies && <p>Alergias: {h.allergies}</p>}
                  {h.medication && <p>Medicação: {h.medication}</p>}
                  {h.health_needs && <p>Saúde: {h.health_needs}</p>}
                </div>
              )}
            </section>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-slate-500">A informação médica só aparece para os membros em que foi ativada a opção “Incluir no cartão de emergência”.</p>
    </div>
  );
}
