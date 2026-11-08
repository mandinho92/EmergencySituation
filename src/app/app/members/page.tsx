import { UserRound } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/misc";
import { hasRole, requireFamily } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { MembersManager } from "@/modules/members/members-manager";
import { loadPreparedness } from "@/modules/preparedness/load";

export const metadata: Metadata = { title: "Membros" };

export default async function MembersPage() {
  const ctx = await requireFamily();
  const canSeeHealth = hasRole(ctx.role, "member");
  const supabase = await createClient();
  const [data, health] = await Promise.all([
    loadPreparedness(ctx.family.id),
    canSeeHealth ? supabase.from("member_health").select("*").eq("family_id", ctx.family.id) : Promise.resolve({ data: [] }),
  ]);
  return (
    <>
      <PageHeader icon={UserRound} title="Membros do agregado" description="Pessoas e animais que vivem convosco. Todos os cálculos se ajustam automaticamente." />
      <MembersManager members={data.memberRows} pets={data.petRows} health={health.data ?? []} canEdit={hasRole(ctx.role, "editor")} canSeeHealth={canSeeHealth && hasRole(ctx.role, "editor")} />
    </>
  );
}
