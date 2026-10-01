import { readFileSync } from "node:fs";

import { expect, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Test staff accounts, created with the secret key. Sign-in uses one-time
// magic-link tokens (no password form, so Turnstile and the login rate limit
// don't interfere).

export const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const secretKey = process.env.SUPABASE_SECRET_KEY;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const hasSupabase = !!(url && secretKey && publishableKey);

/** Shared signed-in sessions from global-setup.ts (git-ignored). */
export const AUTH_DIR = "tests/e2e/.auth";
export const STATE = { admin: `${AUTH_DIR}/admin.json`, poster: `${AUTH_DIR}/poster.json` };

/** The shared admin / poster created by global-setup.ts. */
export function sharedStaff(role: "admin" | "poster"): TestStaff {
  return JSON.parse(readFileSync(`${AUTH_DIR}/users.json`, "utf8"))[role];
}

export const admin = createClient(url ?? "http://127.0.0.1", secretKey ?? "x", {
  auth: { persistSession: false, autoRefreshToken: false },
});

export type TestStaff = {
  userId: string;
  email: string;
  password: string;
  role: "admin" | "poster";
};

// ------------------------------------------------------------------ users

/** Fresh client signed in as the user (via a one-time magic-link token). */
async function signedInClient(email: string) {
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  const client = createClient(url!, publishableKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: verifyError } = await client.auth.verifyOtp({
    type: "magiclink",
    token_hash: data.properties.hashed_token,
  });
  if (verifyError) throw verifyError;
  return client;
}

/** Create a staff user. */
export async function createStaff(
  role: "admin" | "poster",
  name = `E2E ${role}`,
): Promise<TestStaff> {
  const email = `e2e-${role}-${crypto.randomUUID()}@example.com`;
  const password = `pw-${crypto.randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (error) throw error;
  const userId = data.user.id;
  if (role === "admin") {
    const { error: roleError } = await admin.from("profiles").update({ role }).eq("id", userId);
    if (roleError) throw roleError;
  }

  return { userId, email, password, role };
}

export async function deleteStaff(user: TestStaff | undefined) {
  if (user) await admin.auth.admin.deleteUser(user.userId);
}

/** API client with a live staff session (what the app has after sign-in). */
export async function staffClient(user: TestStaff): Promise<SupabaseClient> {
  const client = await signedInClient(user.email);
  const { data: status } = await client.rpc("touch_staff_session");
  expect(status).toBe("ok");
  return client;
}

/** API client that signed in but never started a staff session (no app request). */
export async function unregisteredClient(user: TestStaff) {
  return signedInClient(user.email);
}

/** Sign in through the browser: one-time link → `next`. */
export async function signIn(page: Page, user: TestStaff, next = "/admin") {
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: user.email,
  });
  if (error) throw error;
  const params = new URLSearchParams({
    token_hash: data.properties.hashed_token,
    type: "magiclink",
    next,
  });
  await page.goto(`/admin/auth/confirm?${params}`);
  await expect(page).toHaveURL(new RegExp(`${next.replace(/[?]/g, "\\?")}$`));
}
