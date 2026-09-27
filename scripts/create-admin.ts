/**
 * One-time setup: create (or update) the admin user and set role = 'admin'.
 *
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=... [ADMIN_NAME="Your Name"] pnpm tsx scripts/create-admin.ts
 *
 * The variables can also live in .env.local — remove them afterwards.
 * Uses SUPABASE_SECRET_KEY, which bypasses RLS. Local script only: never import
 * this from app code (ESLint blocks it).
 */
import { createClient } from "@supabase/supabase-js";

import type { Database } from "../lib/database.types";

async function main() {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // Fine if the variables come from the shell instead.
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const fullName = process.env.ADMIN_NAME?.trim() || null;

  if (!url || !secretKey) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.");
  if (!email || !password) throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD.");
  if (password.length < 8) throw new Error("ADMIN_PASSWORD must be at least 8 characters.");

  const supabase = createClient<Database>(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const existing = await findUserByEmail(supabase, email);
  let userId: string;

  if (existing) {
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      ...(fullName ? { user_metadata: { ...existing.user_metadata, full_name: fullName } } : {}),
    });
    if (error) throw error;
    userId = existing.id;
    console.log(`Updated existing user ${email}.`);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: fullName ? { full_name: fullName } : {},
    });
    if (error) throw error;
    userId = data.user.id;
    console.log(`Created user ${email}.`);
  }

  // The auth trigger normally creates the profile; upsert covers older users.
  const { error: profileError } = await supabase.from("profiles").upsert({
    id: userId,
    role: "admin",
    active: true,
    ...(fullName ? { full_name: fullName } : {}),
  });
  if (profileError) throw profileError;

  console.log(`${email} is now an active admin.`);
}

async function findUserByEmail(supabase: ReturnType<typeof createClient<Database>>, email: string) {
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === email);
    if (match || data.users.length < 1000) return match ?? null;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
