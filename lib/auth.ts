import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { DASHBOARD_PATH, LOGIN_PATH, SIGN_OUT_PATH } from "@/lib/auth-paths";
import type { Tables } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

export type StaffProfile = Pick<Tables<"profiles">, "id" | "full_name" | "role" | "active">;

export const DISABLED_MESSAGE = "Your account is disabled.";
export const DENIED_PARAM = "denied";

/** 'ok' | 'idle' | 'expired' | 'ended' | 'none' — from public.touch_staff_session(). */
export type SessionStatus = "ok" | "idle" | "expired" | "ended" | "none";

/**
 * Current user, profile and staff-session status, or null when
 * signed out. Cached per request. Uses getClaims() (verified JWT), never
 * getSession(). Touching the session also records activity for the idle limit.
 */
export const getStaff = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const userId = claims?.sub;
  if (!claims || !userId) return null;

  const [{ data: profile }, session] = await Promise.all([
    supabase.from("profiles").select("id, full_name, role, active").eq("id", userId).maybeSingle(),
    supabase.rpc("touch_staff_session").then(({ data, error }) => {
      if (error) console.error("touch_staff_session failed", error.code);
      return (data ?? "none") as SessionStatus;
    }),
  ]);

  return {
    userId,
    email: claims.email,
    sessionId: (claims.session_id as string | undefined) ?? null,
    session,
    profile,
  };
});

/**
 * Call at the top of every staff page and server action. Layout checks alone
 * are not enough: they don't stop pages or actions from running. Requires an
 * active profile and a live session (not idle / expired).
 */
export async function requireStaff() {
  const staff = await getStaff();
  if (!staff) redirect(LOGIN_PATH);
  if (!staff.profile?.active) redirect(`${SIGN_OUT_PATH}?reason=disabled`);
  if (staff.session !== "ok") redirect(`${SIGN_OUT_PATH}?reason=${sessionReason(staff.session)}`);
  return { ...staff, profile: staff.profile };
}

/** Like requireStaff(), but posters are sent to the dashboard with a toast. */
export async function requireAdmin() {
  const staff = await requireStaff();
  if (staff.profile.role !== "admin") redirect(`${DASHBOARD_PATH}?${DENIED_PARAM}=1`);
  return staff;
}

/**
 * For route handlers (JSON APIs): same checks as requireStaff() without
 * redirects. Returns the staff member, or an HTTP status to send.
 */
type Staff = NonNullable<Awaited<ReturnType<typeof getStaff>>>;
type CheckedStaff = Staff & { profile: NonNullable<Staff["profile"]> };

export async function checkStaff(
  role?: "admin",
): Promise<{ error: 401 | 403 } | { staff: CheckedStaff }> {
  const staff = await getStaff();
  if (!staff || !staff.profile?.active || staff.session !== "ok") {
    return { error: 401 };
  }
  if (role === "admin" && staff.profile.role !== "admin") return { error: 403 };
  return { staff: { ...staff, profile: staff.profile } };
}

function sessionReason(status: SessionStatus) {
  return status === "idle" ? "idle" : status === "expired" ? "expired" : "ended";
}
