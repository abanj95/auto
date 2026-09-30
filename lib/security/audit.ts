import "server-only";

import type { Json } from "@/lib/database.types";
import { requestInfo } from "@/lib/security/request-info";
import { createAdminClient } from "@/lib/supabase/admin";

/** Every action recorded in audit_log (shown on /admin/activity). */
export const AUDIT_ACTIONS = {
  sign_in: "Signed in",
  sign_in_failed: "Failed sign-in",
  sign_in_locked: "Account locked (failed sign-ins)",
  sign_out: "Signed out",
  session_expired: "Session ended (idle / time limit)",
  mfa_enrolled: "Set up two-factor",
  mfa_verified: "Two-factor check passed",
  mfa_reset: "Two-factor reset by admin",
  password_changed: "Changed password",
  password_reset_sent: "Password reset link created",
  user_invited: "Invited a user",
  role_changed: "Changed a role",
  user_deactivated: "Deactivated a user",
  user_reactivated: "Reactivated a user",
  vehicle_created: "Created a vehicle",
  vehicle_published: "Published a vehicle",
  vehicle_status_changed: "Changed vehicle status",
  vehicle_price_changed: "Changed a price",
  vehicle_deleted: "Deleted a vehicle",
  settings_changed: "Changed site settings",
  homepage_changed: "Changed the homepage",
} as const;
export type AuditAction = keyof typeof AUDIT_ACTIONS;

export type AuditEntry = {
  action: AuditAction;
  userId?: string | null;
  targetType?: string;
  targetId?: string | null;
  details?: Record<string, Json | undefined>;
  /** Highlight on /admin/activity (role change, new user, new device, repeated failures). */
  alert?: boolean;
};

/**
 * Append to audit_log with the secret key (insert-only table; nobody can
 * change or delete entries). Never throws: a logging failure must not break
 * the action being logged.
 */
export async function audit(entry: AuditEntry) {
  try {
    const { ip, userAgent } = await requestInfo();
    const { error } = await createAdminClient()
      .from("audit_log")
      .insert({
        user_id: entry.userId ?? null,
        action: entry.action,
        target_type: entry.targetType ?? null,
        target_id: entry.targetId ?? null,
        details: (entry.details ?? {}) as Json,
        ip,
        user_agent: userAgent,
        alert: entry.alert ?? false,
      });
    if (error) console.error("audit insert failed", error.code, entry.action);
  } catch (err) {
    console.error("audit failed", entry.action, err instanceof Error ? err.message : err);
  }
}

/** True if this user has never signed in successfully from this IP + browser before. */
export async function isNewDevice(userId: string) {
  const { ip, userAgent } = await requestInfo();
  const { count } = await createAdminClient()
    .from("audit_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("action", "sign_in")
    .eq("ip", ip)
    .eq("user_agent", userAgent);
  return (count ?? 0) === 0;
}
