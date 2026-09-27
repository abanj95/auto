import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

/**
 * THE ONLY place app code may use the secret (service-role) key. It bypasses
 * RLS, so callers must already have checked the user is an admin
 * (requireAdmin()) or be a trusted server job (e.g. the purge cron).
 * ESLint blocks reading SUPABASE_SECRET_KEY anywhere else in app code.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) throw new Error("SUPABASE_SECRET_KEY is not configured.");
  return createClient<Database>(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
