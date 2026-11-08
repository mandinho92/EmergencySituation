"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { getBrowserClient } from "@/lib/supabase/client";

const TABLES = [
  "home_kit_items", "evacuation_bag_items", "evacuation_bags", "inventory_items", "shopping_list_items",
  "tasks", "emergency_plans", "meeting_points", "member_profiles", "family_members", "home_kits", "reminders",
] as const;

/**
 * Keeps every family member's screen in sync: any change in the shared family
 * data triggers a (debounced) server refresh. RLS filters events server-side.
 */
export function FamilyRealtime({ familyId }: { familyId: string }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = getBrowserClient();
    let channel = supabase.channel(`family:${familyId}`);
    for (const table of TABLES) {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table, filter: `family_id=eq.${familyId}` }, () => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => router.refresh(), 400);
      });
    }
    channel.subscribe();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(channel);
    };
  }, [familyId, router]);

  return null;
}
