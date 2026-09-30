"use server";

import { redirect } from "next/navigation";

import { getStaff, requireStaff } from "@/lib/auth";
import { LOGIN_PATH } from "@/lib/auth-paths";
import { audit } from "@/lib/security/audit";
import { createClient } from "@/lib/supabase/server";

/** Sign out this device (other devices stay signed in). */
export async function signOut() {
  const staff = await getStaff();
  const supabase = await createClient();
  if (staff) {
    await supabase.rpc("end_staff_session", { p_reason: "signout" });
    await audit({ action: "sign_out", userId: staff.userId });
  }
  await supabase.auth.signOut({ scope: "local" });
  redirect(LOGIN_PATH);
}

/**
 * Heartbeat from an active tab (idle timer). requireStaff() records the
 * activity server-side, or redirects if the session already ended.
 */
export async function keepAlive(): Promise<{ ok: true }> {
  await requireStaff();
  return { ok: true };
}
