import type { Metadata } from "next";
import { PrintButton } from "@/components/print-button";
import { EMERGENCY_NUMBERS } from "@/content/scenarios";
import { DISTRICTS } from "@/domain/locations/portugal";
import { formatAge, formatDate } from "@/i18n/format";
import { CHANNEL_LABEL, MEETING_POINT_KIND_LABEL, MEMBER_CATEGORY_LABEL, PET_SPECIES_LABEL } from "@/i18n/messages";
import { requireFamily } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { loadPreparedness } from "@/modules/preparedness/load";

export const metadata: Metadata = { title: "Plano familiar de emergência" };

export default async function PrintPlanPage() {
  const ctx = await requireFamily();
  const supabase = await createClient();
  const [data, { data: points }, { data: contacts }, { data: comm }] = await Promise.all([
    loadPreparedness(ctx.family.id),
    supabase.from("meeting_points").select("*").eq("family_id", ctx.family.id).order("sort_order"),
    supabase.from("emergency_contacts").select("*").eq("family_id", ctx.family.id).order("created_at"),
    supabase.from("communication_plans").select("*").eq("family_id", ctx.family.id).single(),
  ]);
  const contact = (id: string | null | undefined) => (contacts ?? []).find((c) => c.id === id);
  const district = DISTRICTS.find((d) => d.slug === data.household.district)?.name;

  return (
    <article className="mx-auto max-w-3xl space-y-6 bg-white p-6 text-sm print:p-0 [&_h2]:mb-2 [&_h2]:border-b [&_h2]:border-slate-200 [&_h2]:pb-1 [&_h2]:text-base [&_h2]:font-semibold">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Plano familiar de emergência</h1>
          <p className="text-slate-600">{ctx.family.name}{district ? ` · ${district}` : ""}{data.household.municipality ? `, ${data.household.municipality}` : ""} · gerado em {formatDate(new Date().toISOString())}</p>
        </div>
        <PrintButton />
      </div>

      <section>
        <h2>Em perigo imediato</h2>
        <ul className="grid grid-cols-3 gap-2">{EMERGENCY_NUMBERS.map((n) => <li key={n.number}><strong className="text-lg">{n.number}</strong><br />{n.label}</li>)}</ul>
      </section>

      <section>
        <h2>Agregado</h2>
        <ul className="grid grid-cols-2 gap-1">
          {data.memberRows.map((m) => <li key={m.id}>{m.display_name} — {MEMBER_CATEGORY_LABEL[m.category]}{m.age_years != null ? `, ${formatAge(m.age_years)}` : ""}{m.reduced_mobility ? " · mobilidade reduzida" : ""}</li>)}
          {data.petRows.map((p) => <li key={p.id}>{p.name} — {PET_SPECIES_LABEL[p.species as keyof typeof PET_SPECIES_LABEL]}{p.has_microchip ? " · microchip" : ""}</li>)}
        </ul>
      </section>

      <section>
        <h2>Pontos de encontro</h2>
        {(points ?? []).length === 0 ? <p>Por definir.</p> : (
          <ol className="space-y-2">
            {(points ?? []).map((p) => (
              <li key={p.id}>
                <strong>{MEETING_POINT_KIND_LABEL[p.kind as keyof typeof MEETING_POINT_KIND_LABEL]}: {p.name}</strong>
                {p.address && <> — {p.address}</>}
                {p.latitude != null && <span className="font-mono"> ({Number(p.latitude).toFixed(5)}, {Number(p.longitude).toFixed(5)})</span>}
                {p.description && <p>{p.description}</p>}
                {p.access_instructions && <p className="text-slate-600">Acesso: {p.access_instructions}</p>}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <h2>Comunicação</h2>
        <dl className="grid grid-cols-[12rem_1fr] gap-x-3 gap-y-1">
          <dt className="font-medium">Contacto fora da região</dt><dd>{contact(comm?.out_of_region_contact_id) ? `${contact(comm?.out_of_region_contact_id)!.name} ${contact(comm?.out_of_region_contact_id)!.phone ?? ""}` : "—"}</dd>
          <dt className="font-medium">Contacto principal</dt><dd>{contact(comm?.primary_contact_id) ? `${contact(comm?.primary_contact_id)!.name} ${contact(comm?.primary_contact_id)!.phone ?? ""}` : "—"}</dd>
          <dt className="font-medium">Contacto alternativo</dt><dd>{contact(comm?.secondary_contact_id) ? `${contact(comm?.secondary_contact_id)!.name} ${contact(comm?.secondary_contact_id)!.phone ?? ""}` : "—"}</dd>
          <dt className="font-medium">Canais</dt><dd>{(comm?.channels ?? []).map((c) => CHANNEL_LABEL[c as keyof typeof CHANNEL_LABEL]).join(", ") || "—"}</dd>
          {comm?.pmr446_channel && <><dt className="font-medium">PMR446</dt><dd>{comm.pmr446_channel}</dd></>}
          <dt className="font-medium">Quem contacta quem</dt><dd className="whitespace-pre-line">{comm?.call_order ?? "—"}</dd>
          <dt className="font-medium">Sem Internet</dt><dd className="whitespace-pre-line">{comm?.no_internet_plan ?? "—"}</dd>
          <dt className="font-medium">Se as chamadas falharem</dt><dd className="whitespace-pre-line">{comm?.calls_fail_plan ?? "—"}</dd>
          <dt className="font-medium">Se os telemóveis falharem</dt><dd>{(points ?? []).find((p) => p.id === comm?.phones_down_meeting_point_id)?.name ?? "—"}</dd>
        </dl>
      </section>

      <section>
        <h2>Contactos</h2>
        <table className="w-full"><tbody>{(contacts ?? []).map((c) => <tr key={c.id} className="border-b border-slate-100"><td className="py-1 font-medium">{c.name}</td><td>{c.relationship}</td><td>{c.phone}</td><td>{c.phone_alt}</td><td>{c.email}</td></tr>)}</tbody></table>
      </section>

      <section>
        <h2>Kits</h2>
        <p>HOME KIT para {data.settings.targetDays} dia(s): {data.water.requiredLiters} L de água (existente {data.water.haveLiters} L). Mochilas: {data.bags.map((b) => b.bag.name).join(", ") || "por criar"}.</p>
      </section>

      <p className="text-xs text-slate-500">Este plano não substitui as instruções das autoridades. Siga sempre as indicações da Proteção Civil. Guarde uma cópia em casa, outra nas mochilas e outra com o contacto fora da região.</p>
    </article>
  );
}
