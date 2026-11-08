import { MapPin, Navigation } from "lucide-react";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Notice, PageHeader } from "@/components/ui/misc";
import { listScenarios } from "@/content/scenarios";
import { MEETING_POINT_KIND_LABEL } from "@/i18n/messages";
import { hasRole, requireFamily } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { EditMeetingPoint, NewMeetingPoint } from "@/modules/meeting-points/dialogs";
import { MapView } from "@/modules/meeting-points/map-view";

export const metadata: Metadata = { title: "Pontos de encontro" };

const KIND_HELP = {
  near_home: "Um local seguro perto de casa (jardim, largo) para quando é preciso sair rapidamente, por exemplo num incêndio.",
  out_of_area: "Fora da zona de residência (casa de familiares, outro bairro) para quando não é possível voltar à zona.",
  alternative: "Um local de recurso num município vizinho ou ponto de referência acordado.",
} as const;

export default async function MeetingPointsPage() {
  const ctx = await requireFamily();
  const supabase = await createClient();
  const [{ data: points }, { data: responsibles }, { data: members }] = await Promise.all([
    supabase.from("meeting_points").select("*").eq("family_id", ctx.family.id).order("sort_order"),
    supabase.from("meeting_point_responsibles").select("meeting_point_id, member_profile_id").eq("family_id", ctx.family.id),
    supabase.from("member_profiles").select("id, display_name").eq("family_id", ctx.family.id).order("sort_order"),
  ]);
  const canEdit = hasRole(ctx.role, "editor");
  const scenarios = listScenarios().map((s) => ({ key: s.key, title: s.title }));
  const scenarioTitle = new Map(scenarios.map((s) => [s.key, s.title]));
  const memberName = new Map((members ?? []).map((m) => [m.id, m.display_name]));
  const formProps = { members: members ?? [], scenarios };

  return (
    <>
      <PageHeader icon={MapPin} title="Pontos de encontro" description="Onde a família se reúne quando não está junta ou não pode ficar em casa." actions={canEdit ? <NewMeetingPoint {...formProps} /> : undefined} />
      <Notice className="mb-4">Os pontos e as coordenadas ficam disponíveis offline nesta aplicação. Os mapas e a navegação precisam de Internet. Os pontos de encontro nunca são públicos.</Notice>
      <div className="space-y-4">
        {(Object.keys(MEETING_POINT_KIND_LABEL) as Array<keyof typeof MEETING_POINT_KIND_LABEL>).map((kind, idx) => {
          const list = (points ?? []).filter((p) => p.kind === kind);
          return (
            <section key={kind} aria-labelledby={`k-${kind}`}>
              <h2 id={`k-${kind}`} className="mb-1 text-sm font-semibold">Ponto de encontro {idx + 1} — {MEETING_POINT_KIND_LABEL[kind]}</h2>
              <p className="mb-2 text-sm text-slate-500">{KIND_HELP[kind]}</p>
              {list.length === 0 ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                  Ainda não definido.
                  {canEdit && <NewMeetingPoint kind={kind} label="Definir" {...formProps} />}
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {list.map((p) => {
                    const resp = (responsibles ?? []).filter((r) => r.meeting_point_id === p.id).map((r) => r.member_profile_id);
                    const lat = p.latitude == null ? null : Number(p.latitude);
                    const lng = p.longitude == null ? null : Number(p.longitude);
                    return (
                      <Card key={p.id}>
                        <CardHeader>
                          <div><CardTitle>{p.name}</CardTitle>{p.address && <p className="text-sm text-slate-500">{p.address}</p>}</div>
                          {canEdit && <EditMeetingPoint point={{ ...p, latitude: lat, longitude: lng, kind: p.kind as "near_home", responsibles: resp }} {...formProps} />}
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                          {lat != null && lng != null && (
                            <>
                              <MapView lat={lat} lng={lng} />
                              <p className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                GPS: <span className="font-mono">{lat.toFixed(6)}, {lng.toFixed(6)}</span>
                                <a className="inline-flex items-center gap-1 text-brand-600 hover:underline" href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`} target="_blank" rel="noopener noreferrer"><Navigation className="size-3" aria-hidden />Abrir no mapa</a>
                                <a className="text-brand-600 hover:underline" href={`geo:${lat},${lng}`}>Navegação (geo:)</a>
                              </p>
                            </>
                          )}
                          {p.description && <p>{p.description}</p>}
                          {p.access_instructions && <p className="text-slate-600"><span className="font-medium">Acesso:</span> {p.access_instructions}</p>}
                          {resp.length > 0 && <p className="text-slate-600"><span className="font-medium">Responsáveis:</span> {resp.map((r) => memberName.get(r)).filter(Boolean).join(", ")}</p>}
                          {p.scenario_keys.length > 0 && <div className="flex flex-wrap gap-1">{p.scenario_keys.map((k) => <Badge key={k} tone="outline">{scenarioTitle.get(k) ?? k}</Badge>)}</div>}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
