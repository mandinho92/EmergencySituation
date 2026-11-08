import "server-only";
import { cache } from "react";
import { computeAlerts } from "@/domain/preparedness/alerts";
import { createClient } from "@/lib/supabase/server";
import { loadPreparedness } from "@/modules/preparedness/load";

/** In-app maintenance alerts (expiry, recharge, bag checks, reviews) computed on read. */
export const loadAlerts = cache(async (familyId: string) => {
  const supabase = await createClient();
  const [data, inventory, reminders] = await Promise.all([
    loadPreparedness(familyId),
    supabase.from("inventory_items").select("id, name, expires_on, condition, maintenance_interval_days, last_maintained_on, category").eq("family_id", familyId),
    supabase.from("reminders").select("id, title, due_on").eq("family_id", familyId).is("completed_at", null),
  ]);
  const expiring = [
    ...data.homeLines.filter((l) => l.expiresOn && !l.excluded).map((l) => ({ id: `home:${l.id}`, name: l.name, expiresOn: l.expiresOn, href: `/app/home-kit#${l.category}`, sensitive: l.category === "water" || l.category === "first_aid" })),
    ...data.bags.flatMap((b) => b.lines.filter((l) => l.expiresOn && !l.excluded).map((l) => ({ id: `bag:${b.bag.id}:${l.id}`, name: `${l.name} (${b.bag.name})`, expiresOn: l.expiresOn, href: `/app/go-bags/${b.bag.id}`, sensitive: l.category === "medication" || l.category === "water" }))),
    ...(inventory.data ?? []).map((i) => ({ id: `inv:${i.id}`, name: i.name, expiresOn: i.expires_on, href: "/app/inventory", sensitive: i.category === "first_aid" || i.category === "medication" })),
  ];
  return computeAlerts({
    expiring,
    maintainable: (inventory.data ?? []).map((i) => ({ id: i.id, name: i.name, condition: i.condition, maintenanceIntervalDays: i.maintenance_interval_days, lastMaintainedOn: i.last_maintained_on, href: "/app/inventory" })),
    bags: data.bags.map((b) => ({ id: b.bag.id, name: b.bag.name, lastCheckedAt: b.bag.last_checked_at, createdAt: b.bag.created_at })),
    reviews: (reminders.data ?? []).map((r) => ({ id: r.id, title: r.title, dueOn: r.due_on })),
  });
});
