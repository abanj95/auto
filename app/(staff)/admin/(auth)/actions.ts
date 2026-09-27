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

// Same reply whether or not the account exists, so the form can't be used to
// discover staff email addresses.
const EMAIL_SENT = "If that email belongs to a staff account, we've sent a link. Check your inbox.";
const INVALID_INPUT: ActionResult = { ok: false, error: "Please check the form and try again." };

function isRateLimited(error: AuthError) {
  return error.status === 429 || error.code === "over_email_send_rate_limit";
}

const RATE_LIMITED: ActionResult = {
  ok: false,
  error: "Too many attempts. Please wait a few minutes and try again.",
};

export async function signInWithPassword(input: LoginInput, next?: string): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return INVALID_INPUT;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (isRateLimited(error)) return RATE_LIMITED;
    return { ok: false, error: "Incorrect email or password." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("active")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!profile?.active) {
    await supabase.auth.signOut();
    return { ok: false, error: DISABLED_MESSAGE };
  }

  redirect(safeAdminPath(next));
}

export async function sendMagicLink(input: EmailOnlyInput, next?: string): Promise<ActionResult> {
  const parsed = emailOnlySchema.safeParse(input);
  if (!parsed.success) return INVALID_INPUT;

  const supabase = await createClient();
  const redirectTo = `${siteUrl()}${AUTH_CONFIRM_PATH}?next=${encodeURIComponent(safeAdminPath(next))}`;
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    // Never create accounts from the login page.
    options: { shouldCreateUser: false, emailRedirectTo: redirectTo },
  });
  if (error && isRateLimited(error)) return RATE_LIMITED;

  return { ok: true, message: EMAIL_SENT };
}

export async function requestPasswordReset(input: EmailOnlyInput): Promise<ActionResult> {
  const parsed = emailOnlySchema.safeParse(input);
  if (!parsed.success) return INVALID_INPUT;

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl()}${AUTH_CONFIRM_PATH}?next=${encodeURIComponent(RESET_PASSWORD_PATH)}`,
  });
  if (error && isRateLimited(error)) return RATE_LIMITED;

  return { ok: true, message: EMAIL_SENT };
}

export async function updatePassword(input: ResetPasswordInput): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return INVALID_INPUT;

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    return { ok: false, error: "Your reset link has expired. Request a new one." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") {
      return { ok: false, error: "Choose a password you haven't used before." };
    }
    if (error.code === "weak_password") {
      return { ok: false, error: "That password is too weak. Try a longer one." };
    }
    return { ok: false, error: "Couldn't update your password. Please try again." };
  }

  redirect(DASHBOARD_PATH);
}
