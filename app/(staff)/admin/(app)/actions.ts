"use server";

import { redirect } from "next/navigation";

import { LOGIN_PATH } from "@/lib/auth-paths";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(LOGIN_PATH);
}
