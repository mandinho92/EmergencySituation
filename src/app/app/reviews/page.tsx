import { CalendarCheck } from "lucide-react";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { formatDate } from "@/i18n/format";
import { hasRole, requireFamily } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { isoDaysFromNow, todayIso } from "@/lib/dates";
import { REVIEW_CHECKLIST } from "@/modules/reviews/checklist";
import { ReminderForm, ReviewForm } from "@/modules/reviews/review-form";

export const metadata: Metadata = { title: "Revisões" };

export default async function ReviewsPage() {
  const ctx = await requireFamily();
  const supabase = await createClient();
  const [{ data: open }, { data: done }, { data: accounts }] = await Promise.all([
    supabase.from("reminders").select("*").eq("family_id", ctx.family.id).is("completed_at", null).order("due_on"),
    supabase.from("reminders").select("*").eq("family_id", ctx.family.id).not("completed_at", "is", null).order("completed_at", { ascending: false }).limit(12),
    supabase.from("family_members").select("user_id, profiles!family_members_user_id_fkey(full_name)").eq("family_id", ctx.family.id),
  ]);
  const names = new Map((accounts ?? []).map((a) => [a.user_id, a.profiles?.full_name ?? "—"]));
  const today = todayIso();
  const inAWeek = isoDaysFromNow(7);
  const canUpdate = hasRole(ctx.role, "member");

  return (
    <>
      <PageHeader icon={CalendarCheck} title="Revisões e lembretes" description="Uma revisão trimestral mantém o plano vivo: validades, cargas, roupa da estação e contactos." />
      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          {(open ?? []).map((r) => (
            <Card key={r.id}>
              <CardHeader>
                <div><CardTitle>{r.title}</CardTitle><CardDescription>Prevista para {formatDate(r.due_on)}{r.recurrence_months ? ` · repete a cada ${r.recurrence_months} meses` : ""}</CardDescription></div>
                <Badge tone={r.due_on < today ? "danger" : r.due_on <= inAWeek ? "warning" : "neutral"}>{r.due_on < today ? "Em atraso" : "Agendada"}</Badge>
              </CardHeader>
              <CardContent>{canUpdate ? (r.kind === "quarterly_review" ? <ReviewForm id={r.id} checklist={REVIEW_CHECKLIST} /> : <ReviewForm id={r.id} checklist={[]} />) : <p className="text-sm text-slate-500">Apenas membros podem concluir revisões.</p>}</CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-4">
          {canUpdate && <Card><CardHeader><CardTitle>Novo lembrete</CardTitle></CardHeader><CardContent><ReminderForm /></CardContent></Card>}
          <Card>
            <CardHeader><CardTitle>Histórico</CardTitle></CardHeader>
            <CardContent>
              {(done ?? []).length === 0 ? <p className="text-sm text-slate-500">Ainda sem revisões concluídas.</p> : (
                <ul className="space-y-2 text-sm">{(done ?? []).map((r) => <li key={r.id}><p className="font-medium">{r.title}</p><p className="text-xs text-slate-500">{formatDate(r.completed_at)} · {r.completed_by ? names.get(r.completed_by) : "—"}{r.kind === "quarterly_review" ? ` · ${r.completed_items.length}/${REVIEW_CHECKLIST.length} pontos` : ""}</p></li>)}</ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
