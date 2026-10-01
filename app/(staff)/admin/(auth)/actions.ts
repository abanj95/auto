"use server";

import type { AuthError } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { DISABLED_MESSAGE } from "@/lib/auth";
import {
  AUTH_CONFIRM_PATH,
  DASHBOARD_PATH,
  RESET_PASSWORD_PATH,
  safeAdminPath,
  siteUrl,
} from "@/lib/auth-paths";
import { audit, isNewDevice } from "@/lib/security/audit";
import {
  emailKey,
  LOCKOUT_FAILURES,
  loginLockedSeconds,
  rateLimit,
  recordLoginFailure,
  recordLoginSuccess,
} from "@/lib/security/rate-limit";
import { requestInfo } from "@/lib/security/request-info";
import { createClient } from "@/lib/supabase/server";
import {
  emailOnlySchema,
  loginSchema,
  resetPasswordSchema,
  type EmailOnlyInput,
  type LoginInput,
  type ResetPasswordInput,
} from "@/lib/validation/auth";

export type ActionResult = { ok: true; message: string } | { ok: false; error: string };

// Same replies whether or not an account exists, so these forms can't be used
// to discover staff email addresses.
const INVALID_LOGIN = "Invalid email or password.";
const EMAIL_SENT = "If that email exists, we sent a link. Check your inbox.";
const INVALID_INPUT: ActionResult = { ok: false, error: "Please check the form and try again." };
const RATE_LIMITED: ActionResult = {
  ok: false,
  error: "Too many attempts. Please wait a few minutes and try again.",
};
const LOCKED: ActionResult = {
  ok: false,
  error: "Too many failed sign-ins. Try again in 15 minutes, or reset your password.",
};
const CAPTCHA_MISSING: ActionResult = {
  ok: false,
  error: "Please complete the security check and try again.",
};

const CAPTCHA_ON = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

function isRateLimited(error: AuthError) {
  return error.status === 429 || error.code === "over_email_send_rate_limit";
}

function isCaptchaError(error: AuthError) {
  return error.code === "captcha_failed" || /captcha/i.test(error.message);
}

// ------------------------------------------------------------------ password sign-in

export async function signInWithPassword(
  input: LoginInput,
  next?: string,
  captchaToken?: string,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return INVALID_INPUT;
  if (CAPTCHA_ON && !captchaToken) return CAPTCHA_MISSING;
  const { email } = parsed.data;
  const { ip } = await requestInfo();

  // 20 attempts per IP per 15 minutes, and per-account lockout after 5 failures.
  if (!(await rateLimit(`login:ip:${ip}`, 20, 15 * 60))) return RATE_LIMITED;
  if ((await loginLockedSeconds(email)) > 0) {
    await audit({ action: "sign_in_locked", details: { email_hash: emailKey(email) } });
    return LOCKED;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    ...parsed.data,
    options: captchaToken ? { captchaToken } : undefined,
  });
  if (error) {
    if (isRateLimited(error)) return RATE_LIMITED;
    if (isCaptchaError(error)) return CAPTCHA_MISSING;
    // Deactivated users are banned in Supabase Auth, and Supabase reports the
    // ban before checking the password, so any other message would reveal
    // which emails are (former) staff accounts. Keep it generic.
    const failures = await recordLoginFailure(email);
    await audit({
      action: "sign_in_failed",
      details: { email, failures },
      alert: failures >= LOCKOUT_FAILURES,
    });
    return failures >= LOCKOUT_FAILURES ? LOCKED : { ok: false, error: INVALID_LOGIN };
  }

  await recordLoginSuccess(email);
  const { data: profile } = await supabase
    .from("profiles")
    .select("active, role")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!profile?.active) {
    await supabase.auth.signOut({ scope: "local" });
    return { ok: false, error: DISABLED_MESSAGE };
  }

  const newDevice = profile.role === "admin" && (await isNewDevice(data.user.id));
  await audit({
    action: "sign_in",
    userId: data.user.id,
    details: { method: "password", role: profile.role, new_device: newDevice },
    alert: newDevice,
  });

  redirect(safeAdminPath(next));
}

// ------------------------------------------------------------------ email links

async function emailLimitsOk(email: string) {
  const { ip } = await requestInfo();
  return (
    (await rateLimit(`email-link:ip:${ip}`, 5, 15 * 60)) &&
    (await rateLimit(`email-link:email:${emailKey(email)}`, 3, 60 * 60))
  );
}

export async function sendMagicLink(
  input: EmailOnlyInput,
  next?: string,
  captchaToken?: string,
): Promise<ActionResult> {
  const parsed = emailOnlySchema.safeParse(input);
  if (!parsed.success) return INVALID_INPUT;
  if (CAPTCHA_ON && !captchaToken) return CAPTCHA_MISSING;
  if (!(await emailLimitsOk(parsed.data.email))) return RATE_LIMITED;

  const supabase = await createClient();
  const redirectTo = `${siteUrl()}${AUTH_CONFIRM_PATH}?next=${encodeURIComponent(safeAdminPath(next))}`;
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    // Never create accounts from the login page.
    options: { shouldCreateUser: false, emailRedirectTo: redirectTo, captchaToken },
  });
  if (error && isRateLimited(error)) return RATE_LIMITED;
  if (error && isCaptchaError(error)) return CAPTCHA_MISSING;

  return { ok: true, message: EMAIL_SENT };
}

export async function requestPasswordReset(
  input: EmailOnlyInput,
  captchaToken?: string,
): Promise<ActionResult> {
  const parsed = emailOnlySchema.safeParse(input);
  if (!parsed.success) return INVALID_INPUT;
  if (CAPTCHA_ON && !captchaToken) return CAPTCHA_MISSING;
  if (!(await emailLimitsOk(parsed.data.email))) return RATE_LIMITED;

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl()}${AUTH_CONFIRM_PATH}?next=${encodeURIComponent(RESET_PASSWORD_PATH)}`,
    captchaToken,
  });
  if (error && isRateLimited(error)) return RATE_LIMITED;
  if (error && isCaptchaError(error)) return CAPTCHA_MISSING;

  return { ok: true, message: EMAIL_SENT };
}

// ------------------------------------------------------------------ set password

/** From an invite (welcome) or reset link. Signs out every other session. */
export async function updatePassword(input: ResetPasswordInput): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return INVALID_INPUT;

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) {
    return { ok: false, error: "Your link has expired. Request a new one." };
  }
  if (!(await rateLimit(`password:user:${userId}`, 10, 60 * 60))) return RATE_LIMITED;

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") {
      return { ok: false, error: "Choose a password you haven't used before." };
    }
    if (error.code === "weak_password") {
      return {
        ok: false,
        error: "That password is too weak or has appeared in a data breach. Try another.",
      };
    }
    return { ok: false, error: "Couldn't update your password. Please try again." };
  }

  // Anyone else signed in as this user (e.g. with a stolen session) is signed out.
  await supabase.auth.signOut({ scope: "others" });
  await supabase.rpc("end_other_staff_sessions");
  await audit({ action: "password_changed", userId, targetType: "user", targetId: userId });

  redirect(DASHBOARD_PATH);
}
