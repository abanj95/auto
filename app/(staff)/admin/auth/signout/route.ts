import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { LOGIN_PATH } from "@/lib/auth-paths";
import { audit } from "@/lib/security/audit";
import { createClient } from "@/lib/supabase/server";

const FORCED = new Set(["disabled", "idle", "expired", "ended"]);

/**
 * Forced sign-out, used by pages and the proxy when a profile is inactive or a
 * session is idle / past its 12-hour limit (Server Components can't change
 * cookies). Normal sign-out is the POST server action in (app)/actions.ts.
 */
export async function GET(request: NextRequest) {
  const reason = request.nextUrl.searchParams.get("reason") ?? "";
  if (!FORCED.has(reason)) redirect(LOGIN_PATH);

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (userId) {
    await supabase.rpc("end_staff_session", { p_reason: reason });
    await supabase.auth.signOut({ scope: "local" });
    if (reason !== "disabled") {
      await audit({ action: "session_expired", userId, details: { reason } });
    }
  }
  redirect(`${LOGIN_PATH}?error=${reason}`);
}
