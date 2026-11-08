"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { getBrowserClient } from "@/lib/supabase/client";

const TABLES = [
  "home_kit_items", "evacuation_bag_items", "evacuation_bags", "inventory_items", "shopping_list_items",
  "tasks", "emergency_plans", "meeting_points", "member_profiles", "family_members", "home_kits", "reminders",
] as const;

/**
 * Keeps every family member's screen in sync: any change in the shared family
 * data triggers a (debounced) server refresh. RLS filters events server-side,
 * so the channel must join with the user's access token — not the anon key.
 */
export function FamilyRealtime({ familyId }: { familyId: string }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = getBrowserClient();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled || !data.session) return;
      await supabase.realtime.setAuth(data.session.access_token);
      channel = supabase.channel(`family:${familyId}`);
      for (const table of TABLES) {
        channel.on("postgres_changes", { event: "*", schema: "public", table, filter: `family_id=eq.${familyId}` }, () => {
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => router.refresh(), 400);
        });
      }
      channel.subscribe((status, err) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") console.warn("[realtime]", status, err?.message);
      });
    })();

    // Keep the realtime token fresh when the session is refreshed.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) void supabase.realtime.setAuth(session.access_token);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      if (timer.current) clearTimeout(timer.current);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [familyId, router]);

  return null;
}
