import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";

import { expect, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Test staff accounts with real two-factor (TOTP), created with the secret key.
// Sign-in uses one-time magic-link tokens (no password form, so Turnstile and
// the login rate limit don't interfere), then the real /admin/mfa page.

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
  totpSecret: string;
  role: "admin" | "poster";
};

// ------------------------------------------------------------------ TOTP (RFC 6238)

function base32Decode(input: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of input.replace(/=+$/, "").toUpperCase()) {
    bits += alphabet.indexOf(c).toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

export function totp(secret: string, at = Date.now()) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 1000 / 30)));
  const hmac = createHmac("sha1", base32Decode(secret)).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return String(code).padStart(6, "0");
}

// ------------------------------------------------------------------ users

/** Fresh aal1 client signed in as the user (via a one-time magic-link token). */
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

/** Create a staff user with an enrolled authenticator app. */
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

  const client = await signedInClient(email);
  const { data: factor, error: enrollError } = await client.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "e2e",
  });
  if (enrollError) throw enrollError;
  const { error: mfaError } = await client.auth.mfa.challengeAndVerify({
    factorId: factor.id,
    code: totp(factor.totp.secret),
  });
  if (mfaError) throw mfaError;
  await client.auth.signOut({ scope: "local" });

  return { userId, email, password, totpSecret: factor.totp.secret, role };
}

export async function deleteStaff(user: TestStaff | undefined) {
  if (user) await admin.auth.admin.deleteUser(user.userId);
}

/** API client at aal2 with a live staff session (what the app has after sign-in). */
export async function staffClient(user: TestStaff): Promise<SupabaseClient> {
  const client = await signedInClient(user.email);
  const { data: factors } = await client.auth.mfa.listFactors();
  const factor = factors!.totp[0];
  const { error } = await client.auth.mfa.challengeAndVerify({
    factorId: factor.id,
    code: totp(user.totpSecret),
  });
  if (error) throw error;
  const { data: status } = await client.rpc("touch_staff_session");
  expect(status).toBe("ok");
  return client;
}

/** API client that signed in but skipped two-factor (aal1). */
export async function aal1Client(user: TestStaff) {
  return signedInClient(user.email);
}

/** Sign in through the browser: one-time link → /admin/mfa → code → `next`. */
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
  await expect(page).toHaveURL(/\/admin\/mfa/);
  await page.waitForLoadState("networkidle"); // Type only after hydration.
  await page.getByLabel("Code").fill(totp(user.totpSecret));
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page).toHaveURL(new RegExp(`${next.replace(/[?]/g, "\\?")}$`));
}
