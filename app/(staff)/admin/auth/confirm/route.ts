import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { LOGIN_PATH, safeAdminPath } from "@/lib/auth-paths";
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
  let ok = false;

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  redirect(ok ? next : `${LOGIN_PATH}?error=link`);
}
