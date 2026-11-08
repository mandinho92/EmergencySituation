import { History } from "lucide-react";
import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, Notice, PageHeader } from "@/components/ui/misc";
import { formatDateTime } from "@/i18n/format";
import { hasRole, requireFamily } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Atividade" };

const TABLE_LABEL: Record<string, string> = {
  families: "Família", family_members: "Acesso à família", family_invitations: "Convite", household_profiles: "Habitação", member_profiles: "Membro do agregado",
  member_health: "Dados de saúde", pets: "Animal", home_kits: "Objetivo do HOME KIT", home_kit_items: "Artigo do HOME KIT", evacuation_bags: "Mochila",
  evacuation_bag_items: "Artigo de mochila", inventory_items: "Inventário", shopping_list_items: "Lista de compras", energy_profiles: "Energia", energy_devices: "Equipamento de energia",
  emergency_contacts: "Contacto de emergência", meeting_points: "Ponto de encontro", communication_plans: "Plano de comunicação", emergency_plans: "Plano de cenário", tasks: "Tarefa", reminders: "Revisão",
};
const ACTION_LABEL = { insert: "criou", update: "alterou", delete: "removeu" } as const;

export default async function ActivityPage() {
  const ctx = await requireFamily();
  if (!hasRole(ctx.role, "member")) {
    return (<><PageHeader icon={History} title="Atividade" /><Notice>O histórico de alterações está disponível para membros, editores e administradores.</Notice></>);
  }
  const supabase = await createClient();
  const [{ data: logs }, { data: accounts }] = await Promise.all([
    supabase.from("audit_logs").select("*").eq("family_id", ctx.family.id).order("created_at", { ascending: false }).limit(150),
    supabase.from("family_members").select("user_id, profiles!family_members_user_id_fkey(full_name)").eq("family_id", ctx.family.id),
  ]);
  const names = new Map((accounts ?? []).map((a) => [a.user_id, a.profiles?.full_name ?? "—"]));
  return (
    <>
      <PageHeader icon={History} title="Atividade da família" description="Quem alterou o quê. Por privacidade, o registo guarda os campos alterados, nunca os valores." />
      {(logs ?? []).length === 0 ? <EmptyState icon={History} title="Sem atividade" /> : (
        <Card><CardContent className="pt-4">
          <ol className="divide-y divide-slate-100">
            {(logs ?? []).map((l) => (
              <li key={l.id} className="flex flex-wrap justify-between gap-2 py-2.5 text-sm">
                <span><span className="font-medium">{l.actor_id ? names.get(l.actor_id) ?? "Ex-membro" : "Sistema"}</span> {ACTION_LABEL[l.action as keyof typeof ACTION_LABEL]} · {TABLE_LABEL[l.table_name] ?? l.table_name}{l.changed_fields && l.changed_fields.length > 0 && l.table_name !== "member_health" ? <span className="text-slate-500"> ({l.changed_fields.join(", ")})</span> : null}</span>
                <time className="text-xs text-slate-500" dateTime={l.created_at}>{formatDateTime(l.created_at)}</time>
              </li>
            ))}
          </ol>
        </CardContent></Card>
      )}
    </>
  );
}
