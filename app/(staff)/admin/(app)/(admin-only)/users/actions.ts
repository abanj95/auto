"use server";

import type { EmailOtpType } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { AUTH_CONFIRM_PATH, RESET_PASSWORD_PATH, siteUrl } from "@/lib/auth-paths";
import type { Enums } from "@/lib/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { inviteSchema, type InviteInput } from "@/lib/validation/users";

// Admin only (requireAdmin in every action). The secret-key client is used only
// for Auth admin calls (invite, links, bans); profile changes go through the
// signed-in admin's RLS client so the database triggers still apply.

export type UserActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string };

const WELCOME_PATH = "/admin/welcome";
const BAN_FOREVER = "876000h"; // ~100 years
const uuid = z.uuid();

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

/** Link into our token-hash confirm route (works on any device, no email needed). */
function confirmLink(tokenHash: string, type: EmailOtpType, next: string) {
  const params = new URLSearchParams({ token_hash: tokenHash, type, next });
  return `${siteUrl()}${AUTH_CONFIRM_PATH}?${params}`;
}

function emailErrorMessage(error: { status?: number; code?: string; message: string }) {
  if (error.status === 429 || error.code === "over_email_send_rate_limit") {
    return "The email limit was reached. Use “Copy link” and text it instead.";
  }
  if (error.code === "email_exists" || /already been registered/i.test(error.message)) {
    return "Someone with this email already has an account.";
  }
  console.error("auth admin error", error);
  return "Couldn't send the email. Use “Copy link” and text it instead.";
}

/** Guard for actions that change another person. */
async function requireOtherUser(userId: string) {
  const { userId: me } = await requireAdmin();
  if (!uuid.safeParse(userId).success) return fail("User not found.");
  if (userId === me) return fail("You can't change your own access. Ask another admin.");
  return null;
}

// ------------------------------------------------------------------ invite

/**
 * Invite a new poster. mode "email" sends Supabase's invite email;
 * mode "link" creates the same one-time link without sending anything.
 * The auth trigger gives the new user a 'poster' profile (name from metadata).
 */
export async function inviteStaff(
  input: InviteInput,
  mode: "email" | "link",
): Promise<UserActionResult<{ link: string | null }>> {
  await requireAdmin();
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { name, email } = parsed.data;
  const admin = createAdminClient();

  if (mode === "email") {
    const { error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: name },
      redirectTo: `${siteUrl()}${AUTH_CONFIRM_PATH}?next=${encodeURIComponent(WELCOME_PATH)}`,
    });
    if (error) return fail(emailErrorMessage(error));
    revalidatePath("/admin/users");
    return { ok: true, data: { link: null } };
  }

  const { data, error } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: { data: { full_name: name } },
  });
  if (error) return fail(emailErrorMessage(error));
  revalidatePath("/admin/users");
  return {
    ok: true,
    data: { link: confirmLink(data.properties.hashed_token, "invite", WELCOME_PATH) },
  };
}

// ------------------------------------------------------------------ links / reset

/**
 * Password reset for an existing user (email or copyable link). For someone
 * who never accepted their invite, the link signs them in to set a password.
 */
export async function sendPasswordReset(
  userId: string,
  mode: "email" | "link",
): Promise<UserActionResult<{ link: string | null }>> {
  await requireAdmin();
  if (!uuid.safeParse(userId).success) return fail("User not found.");
  const admin = createAdminClient();
  const { data: found } = await admin.auth.admin.getUserById(userId);
  const user = found?.user;
  if (!user?.email) return fail("User not found.");

  const accepted = !!user.email_confirmed_at;
  if (mode === "email") {
    const { error } = await admin.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${siteUrl()}${AUTH_CONFIRM_PATH}?next=${encodeURIComponent(RESET_PASSWORD_PATH)}`,
    });
    if (error) return fail(emailErrorMessage(error));
    return { ok: true, data: { link: null } };
  }

  const { data, error } = await admin.auth.admin.generateLink({
    type: accepted ? "recovery" : "magiclink",
    email: user.email,
  });
  if (error) return fail(emailErrorMessage(error));
  const link = accepted
    ? confirmLink(data.properties.hashed_token, "recovery", RESET_PASSWORD_PATH)
    : confirmLink(data.properties.hashed_token, "magiclink", WELCOME_PATH);
  return { ok: true, data: { link } };
}

// ------------------------------------------------------------------ access

/**
 * Deactivate / reactivate. Deactivating sets profiles.active = false (every
 * page, action and RLS check rejects them on their next request) and bans the
 * auth user so they can't sign in again or refresh their session.
 */
export async function setUserActive(userId: string, active: boolean): Promise<UserActionResult> {
  const denied = await requireOtherUser(userId);
  if (denied) return denied;

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ active }).eq("id", userId);
  if (error) {
    console.error("setUserActive failed", error);
    return fail("Couldn't update this user. Please try again.");
  }

  const { error: banError } = await createAdminClient().auth.admin.updateUserById(userId, {
    ban_duration: active ? "none" : BAN_FOREVER,
  });
  if (banError) {
    console.error("ban update failed", banError);
    return fail(
      active
        ? "Reactivated, but their sign-in is still blocked. Try again."
        : "Deactivated (they've lost access), but sign-in blocking failed. Try again.",
    );
  }

  revalidatePath("/admin/users");
  return { ok: true, data: null };
}

export async function setUserRole(
  userId: string,
  role: Enums<"user_role">,
): Promise<UserActionResult> {
  const denied = await requireOtherUser(userId);
  if (denied) return denied;
  if (role !== "admin" && role !== "poster") return fail("Unknown role.");

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) {
    console.error("setUserRole failed", error);
    return fail("Couldn't change the role. Please try again.");
  }
  revalidatePath("/admin/users");
  return { ok: true, data: null };
}
