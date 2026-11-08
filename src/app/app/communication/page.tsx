import { IdCard, MessagesSquare, Phone, Printer } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Notice, PageHeader } from "@/components/ui/misc";
import { EMERGENCY_NUMBERS } from "@/content/scenarios";
import { CHANNEL_LABEL } from "@/i18n/messages";
import { hasRole, requireFamily } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { ChildResponsibleSelect, CommunicationPlanForm, ContactDialog } from "@/modules/communication/forms";

export const metadata: Metadata = { title: "Plano de comunicação" };

export default async function CommunicationPage() {
  const ctx = await requireFamily();
  const supabase = await createClient();
  const [{ data: contacts }, { data: plan }, { data: points }, { data: members }] = await Promise.all([
    supabase.from("emergency_contacts").select("*").eq("family_id", ctx.family.id).order("created_at"),
    supabase.from("communication_plans").select("*").eq("family_id", ctx.family.id).single(),
    supabase.from("meeting_points").select("id, name").eq("family_id", ctx.family.id).order("sort_order"),
    supabase.from("member_profiles").select("id, display_name, category, responsible_member_id").eq("family_id", ctx.family.id).order("sort_order"),
  ]);
  const canEdit = hasRole(ctx.role, "editor");
  const list = contacts ?? [];
  const byId = new Map(list.map((c) => [c.id, c]));
  const adults = (members ?? []).filter((m) => m.category === "adult" || m.category === "senior");
  const children = (members ?? []).filter((m) => m.category === "child" || m.category === "baby");
  const hasOut = !!plan?.out_of_region_contact_id || list.some((c) => c.is_out_of_region);

  return (
    <>
      <PageHeader icon={MessagesSquare} title="Plano de comunicação" description="Definido antes da emergência: quem contacta quem, por que canal, e o que fazer quando nada funciona." actions={<Button asChild size="sm" variant="secondary"><Link href="/app/print/cards"><IdCard aria-hidden /> Cartões de emergência</Link></Button>} />
      {!hasOut && (
        <Notice tone="warning" className="mb-4" title="Recomendado: um contacto fora da região">
          Escolha uma pessoa de confiança que viva noutra região. Numa emergência local, é mais fácil fazer chamadas para fora da zona afetada, e essa pessoa centraliza a informação sobre o paradeiro de cada membro.
        </Notice>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          <Card>
            <CardHeader><div><CardTitle>Contactos de emergência</CardTitle><CardDescription>Familiares, vizinhos, escola, médico, veterinário.</CardDescription></div>{canEdit && <ContactDialog />}</CardHeader>
            <CardContent>
              {list.length === 0 ? <p className="text-sm text-slate-500">Ainda sem contactos.</p> : (
                <ul className="divide-y divide-slate-100">
                  {list.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                      <div>
                        <p className="font-medium">{c.name}{c.relationship && <span className="font-normal text-slate-500"> · {c.relationship}</span>}</p>
                        <p className="flex flex-wrap gap-x-3 text-slate-600">
                          {c.phone && <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1 text-brand-700"><Phone className="size-3" aria-hidden />{c.phone}</a>}
                          {c.phone_alt && <a href={`tel:${c.phone_alt.replace(/\s/g, "")}`} className="text-brand-700">{c.phone_alt}</a>}
                          {c.email && <span>{c.email}</span>}
                        </p>
                        <div className="mt-1 flex gap-1">
                          {plan?.primary_contact_id === c.id && <Badge tone="brand">Principal</Badge>}
                          {plan?.secondary_contact_id === c.id && <Badge>Alternativo</Badge>}
                          {(plan?.out_of_region_contact_id === c.id || c.is_out_of_region) && <Badge tone="ready">Fora da região{c.region ? ` · ${c.region}` : ""}</Badge>}
                        </div>
                      </div>
                      {canEdit && <ContactDialog contact={c} />}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {children.length > 0 && (
            <Card>
              <CardHeader><div><CardTitle>Quem fica responsável pelas crianças</CardTitle><CardDescription>Também define em que mochila vão os artigos dos mais pequenos.</CardDescription></div></CardHeader>
              <CardContent>
                <ul className="divide-y divide-slate-100">
                  {children.map((ch) => (
                    <li key={ch.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className="font-medium">{ch.display_name}</span>
                      {canEdit ? <ChildResponsibleSelect childId={ch.id} current={ch.responsible_member_id} adults={adults} /> : <span>{adults.find((a) => a.id === ch.responsible_member_id)?.display_name ?? "—"}</span>}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Plano</CardTitle></CardHeader>
            <CardContent>
              {canEdit && plan ? (
                <CommunicationPlanForm plan={plan} contacts={list} meetingPoints={points ?? []} />
              ) : plan ? (
                <dl className="space-y-3 text-sm">
                  <div><dt className="font-medium">Principal / alternativo / fora da região</dt><dd>{[plan.primary_contact_id, plan.secondary_contact_id, plan.out_of_region_contact_id].map((id) => (id ? byId.get(id)?.name : "—")).join(" · ")}</dd></div>
                  <div><dt className="font-medium">Canais</dt><dd>{plan.channels.map((c) => CHANNEL_LABEL[c as keyof typeof CHANNEL_LABEL]).join(", ") || "—"}</dd></div>
                  <div><dt className="font-medium">Quem contacta quem</dt><dd className="whitespace-pre-line">{plan.call_order ?? "—"}</dd></div>
                  <div><dt className="font-medium">Sem Internet</dt><dd className="whitespace-pre-line">{plan.no_internet_plan ?? "—"}</dd></div>
                  <div><dt className="font-medium">Quando as chamadas falham</dt><dd className="whitespace-pre-line">{plan.calls_fail_plan ?? "—"}</dd></div>
                  <div><dt className="font-medium">Encontro se os telemóveis falharem</dt><dd>{points?.find((p) => p.id === plan.phones_down_meeting_point_id)?.name ?? "—"}</dd></div>
                </dl>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Números de emergência</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-3">{EMERGENCY_NUMBERS.map((n) => <li key={n.number}><a href={`tel:${n.number.replace(/\s/g, "")}`} className="text-lg font-semibold text-brand-700">{n.number}</a><p className="text-sm">{n.label}</p><p className="text-xs text-slate-500">{n.description}</p></li>)}</ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Boas práticas</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-600">
              <p>SMS chega muitas vezes quando as chamadas falham: mensagens curtas, com onde está e como está.</p>
              <p>Walkie-talkies PMR446 funcionam sem licença e sem rede, com alcance curto (centenas de metros a poucos km).</p>
              <p>Combine uma hora fixa para ir ao ponto de encontro se não houver qualquer comunicação.</p>
              <Button asChild size="sm" variant="ghost" className="px-0"><Link href="/app/print/plan"><Printer aria-hidden /> Imprimir o plano completo</Link></Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
