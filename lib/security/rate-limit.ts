import "server-only";

import { createHash } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";

// Postgres-backed limits (migration 015). Called with the secret key from
// trusted server code only: the functions aren't executable by browsers.

/** sha256 of a normalized email, so failure counters never store addresses. */
export function emailKey(email: string) {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

/** true = allowed. Fails open (allows) if the database can't be reached, and logs it. */
export async function rateLimit(key: string, limit: number, windowSeconds: number) {
  const { data, error } = await createAdminClient().rpc("rate_limit_hit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("rate limit check failed", error.code);
    return true;
  }
  return data;
}

/** Seconds left on an account lock (0 = not locked). */
export async function loginLockedSeconds(email: string) {
  const { data, error } = await createAdminClient().rpc("login_locked_seconds", {
    p_email_hash: emailKey(email),
  });
  if (error) console.error("lockout check failed", error.code);
  return data ?? 0;
}

/** Returns the number of failures in the current 15-minute window (5 locks the account). */
export async function recordLoginFailure(email: string) {
  const { data, error } = await createAdminClient().rpc("login_record_failure", {
    p_email_hash: emailKey(email),
  });
  if (error) console.error("failure record failed", error.code);
  return data ?? 0;
}

export async function recordLoginSuccess(email: string) {
  await createAdminClient().rpc("login_record_success", { p_email_hash: emailKey(email) });
}

export const LOCKOUT_FAILURES = 5;
