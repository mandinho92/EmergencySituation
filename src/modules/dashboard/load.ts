import "server-only";
import { computeReadiness } from "@/domain/preparedness/readiness";
import { createClient } from "@/lib/supabase/server";
import { loadAlerts } from "@/modules/notifications/load";
import { loadPreparedness } from "@/modules/preparedness/load";

export async function loadDashboard(familyId: string) {
  const supabase = await createClient();
  const [data, alerts, meetingPoints, contacts, comm, energy, reviews, tasks] = await Promise.all([
    loadPreparedness(familyId),
    loadAlerts(familyId),
    supabase.from("meeting_points").select("kind").eq("family_id", familyId),
    supabase.from("emergency_contacts").select("id, is_out_of_region").eq("family_id", familyId),
    supabase.from("communication_plans").select("*").eq("family_id", familyId).single(),
    supabase.from("energy_profiles").select("tier, station_acquired, selected_station_product_id").eq("family_id", familyId).single(),
    supabase.from("reminders").select("id, due_on").eq("family_id", familyId).is("completed_at", null),
    supabase.from("tasks").select("id, title, due_on, assignee_user_id").eq("family_id", familyId).eq("status", "open").order("due_on", { ascending: true, nullsFirst: false }).limit(5),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const c = comm.data;
  const readiness = computeReadiness({
    memberCount: data.members.length,
    adultCount: data.members.filter((m) => m.category === "adult" || m.category === "senior").length,
    targetDays: data.settings.targetDays,
    homeLines: data.homeLines,
    water: data.water,
    foodAutonomyDays: data.foodAutonomyDays,
    bags: data.bags.filter((b) => b.bag.kind !== "pet").map((b) => ({ id: b.bag.id, name: b.bag.name, lines: b.lines })),
    energy: { tier: energy.data?.tier ?? "undecided", stationAcquired: energy.data?.station_acquired ?? false, hasStationSelected: !!energy.data?.selected_station_product_id },
    plan: { meetingPointKinds: (meetingPoints.data ?? []).map((m) => m.kind), contactsCount: contacts.data?.length ?? 0, hasLocation: !!data.household.district },
    communication: {
      hasPrimaryContact: !!c?.primary_contact_id,
      hasOutOfRegionContact: !!c?.out_of_region_contact_id || (contacts.data ?? []).some((x) => x.is_out_of_region),
      channelsCount: c?.channels.length ?? 0,
      hasNoInternetPlan: !!c?.no_internet_plan,
      hasCallsFailPlan: !!c?.calls_fail_plan,
    },
    overdueReviews: (reviews.data ?? []).filter((r) => r.due_on < today).length,
    expiringSoon: alerts.filter((a) => a.kind === "expired" || a.kind === "expiring").length,
  });
  return { data, readiness, alerts, tasks: tasks.data ?? [] };
}
