import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Service-role client. Bypasses RLS — use only for operations that cannot be
 * expressed as the user (account deletion, rate limiting). Returns null when
 * the key is not configured so callers can degrade explicitly.
 */
export function createAdminClient() {
  const key = serverEnv().SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient<Database>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
