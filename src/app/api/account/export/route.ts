import { NextResponse } from "next/server";
import { getUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

const FAMILY_TABLES = [
  "household_profiles", "member_profiles", "member_health", "pets", "home_kits", "home_kit_items", "evacuation_bags", "evacuation_bag_items",
  "inventory_items", "shopping_list_items", "energy_profiles", "energy_devices", "emergency_contacts", "meeting_points", "meeting_point_responsibles",
  "communication_plans", "emergency_plans", "tasks", "reminders",
] as const;

/**
 * RGPD data portability: everything the user can access, as JSON.
 * Reads go through the user's session, so RLS limits the export to what the
 * user is entitled to see (e.g. viewers do not receive health data).
 */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const supabase = await createClient();
  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("family_members").select("role, joined_at, families(*)").eq("user_id", user.id),
  ]);

  const families = [];
  for (const m of memberships ?? []) {
    if (!m.families) continue;
    const data: Record<string, unknown> = {};
    for (const t of FAMILY_TABLES) {
      const { data: rows, error } = await supabase.from(t).select("*").eq("family_id", m.families.id);
      data[t] = error ? { error: "unavailable" } : rows;
    }
    families.push({ family: m.families, role: m.role, joined_at: m.joined_at, data });
  }

  const body = JSON.stringify({ exported_at: new Date().toISOString(), account: { id: user.id, email: user.email, created_at: user.created_at, profile }, families }, null, 2);
  return new NextResponse(body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="familyready-dados-${new Date().toISOString().slice(0, 10)}.json"`,
      "cache-control": "no-store",
    },
  });
}
