import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { DASHBOARD_PATH, LOGIN_PATH, SIGN_OUT_PATH } from "@/lib/auth-paths";
import type { Tables } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

export type StaffProfile = Pick<Tables<"profiles">, "id" | "full_name" | "role" | "active">;

export const DISABLED_MESSAGE = "Your account is disabled.";
export const DENIED_PARAM = "denied";

/** Current user + profile, or null when signed out. Cached per request. */
export const getStaff = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, active")
    .eq("id", userId)
    .maybeSingle();

  return { userId, email: data.claims.email, profile };
});

/**
 * Call at the top of every staff page and server action. Layout checks alone
 * are not enough: they don't stop pages or actions from running.
 */
export async function requireStaff() {
  const staff = await getStaff();
  if (!staff) redirect(LOGIN_PATH);
  if (!staff.profile?.active) redirect(`${SIGN_OUT_PATH}?reason=disabled`);
  return { ...staff, profile: staff.profile };
}

/** Like requireStaff(), but posters are sent to the dashboard with a toast. */
export async function requireAdmin() {
  const staff = await requireStaff();
  if (staff.profile.role !== "admin") redirect(`${DASHBOARD_PATH}?${DENIED_PARAM}=1`);
  return staff;
}
