import { mkdirSync, writeFileSync } from "node:fs";

import { chromium, type FullConfig } from "@playwright/test";

import { AUTH_DIR, createStaff, hasSupabase, signIn, type TestStaff } from "./helpers/staff";

// One admin and one poster for the whole run, signed in once.
// Supabase Auth rate-limits token verifications per IP, so tests reuse
// these browser sessions instead of signing in again. Tests that end a
// session on purpose create their own user.
export default async function globalSetup(config: FullConfig) {
  if (!hasSupabase) return;
  process.loadEnvFile?.(".env.local");
  const baseURL = config.projects[0].use.baseURL!;
  mkdirSync(AUTH_DIR, { recursive: true });
  const users: Record<string, TestStaff> = {
    admin: await createStaff("admin", "E2E Admin"),
    poster: await createStaff("poster", "E2E Poster"),
  };
  writeFileSync(`${AUTH_DIR}/users.json`, JSON.stringify(users));

  const browser = await chromium.launch();
  for (const [role, user] of Object.entries(users)) {
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    await signIn(page, user);
    await context.storageState({ path: `${AUTH_DIR}/${role}.json` });
    await context.close();
  }
  await browser.close();
}
