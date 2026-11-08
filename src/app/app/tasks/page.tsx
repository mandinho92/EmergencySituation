import { ListChecks } from "lucide-react";
import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { hasRole, requireFamily } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { loadDashboard } from "@/modules/dashboard/load";
import { TaskDialog, TaskItem } from "@/modules/tasks/task-ui";

export const metadata: Metadata = { title: "Tarefas" };

export default async function TasksPage() {
  const ctx = await requireFamily();
  const supabase = await createClient();
  const [{ data: tasks }, { data: accounts }, dash] = await Promise.all([
    supabase.from("tasks").select("*").eq("family_id", ctx.family.id).order("status").order("due_on", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false }),
    supabase.from("family_members").select("user_id, profiles!family_members_user_id_fkey(full_name)").eq("family_id", ctx.family.id),
    loadDashboard(ctx.family.id),
  ]);
  const accs = (accounts ?? []).map((a) => ({ id: a.user_id, name: a.profiles?.full_name ?? "—" }));
  const names = Object.fromEntries(accs.map((a) => [a.id, a.name.split(/\s+/)[0]]));
  const open = (tasks ?? []).filter((t) => t.status === "open");
  const done = (tasks ?? []).filter((t) => t.status === "done").slice(0, 30);
  const canCreate = hasRole(ctx.role, "member");
  const canDelete = (createdBy: string | null) => hasRole(ctx.role, "editor") || createdBy === ctx.user.id;

  return (
    <>
      <PageHeader icon={ListChecks} title="Tarefas" description="Quem trata de quê. Atribua tarefas a qualquer conta da família." actions={canCreate ? <TaskDialog accounts={accs} /> : undefined} />
      {canCreate && dash.readiness.actions.length > 0 && (
        <Card className="mb-4">
          <CardHeader><CardTitle>Sugestões a partir das ações prioritárias</CardTitle></CardHeader>
          <CardContent><ul className="space-y-2">{dash.readiness.actions.map((a) => <li key={a.key} className="flex items-center justify-between gap-3 text-sm"><span>{a.title}</span><TaskDialog accounts={accs} suggestion={a.title} /></li>)}</ul></CardContent>
        </Card>
      )}
      <Card>
        <CardHeader><CardTitle>Em aberto ({open.length})</CardTitle></CardHeader>
        <CardContent>
          {open.length === 0 ? <EmptyState icon={ListChecks} title="Sem tarefas em aberto" className="border-0" /> : <ul className="divide-y divide-slate-100">{open.map((t) => <TaskItem key={t.id} task={t} names={names} canDelete={canDelete(t.created_by)} />)}</ul>}
        </CardContent>
      </Card>
      {done.length > 0 && (
        <Card className="mt-4">
          <CardHeader><CardTitle>Concluídas</CardTitle></CardHeader>
          <CardContent><ul className="divide-y divide-slate-100">{done.map((t) => <TaskItem key={t.id} task={t} names={names} canDelete={canDelete(t.created_by)} />)}</ul></CardContent>
        </Card>
      )}
    </>
  );
}
