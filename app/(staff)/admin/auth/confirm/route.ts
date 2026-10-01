import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { LOGIN_PATH, safeAdminPath } from "@/lib/auth-paths";
import { audit, isNewDevice } from "@/lib/security/audit";
import { createClient } from "@/lib/supabase/server";

/**
 * Landing point for email links (magic link, password reset).
 * - token_hash: works on any device; needs the custom email templates.
 * - code: Supabase's default templates (PKCE); only works in the same browser.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = safeAdminPath(searchParams.get("next"));

  const supabase = await createClient();
  let userId: string | undefined;

  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) userId = data.user?.id;
  } else if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) userId = data.user?.id;
  }
  if (!userId) redirect(`${LOGIN_PATH}?error=link`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  const newDevice = profile?.role === "admin" && (await isNewDevice(userId));
  await audit({
    action: "sign_in",
    userId,
    details: {
      method: "email_link",
      type: type ?? "code",
      role: profile?.role,
      new_device: newDevice,
    },
    alert: newDevice,
  });

  redirect(next);
}
