import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { LOGIN_PATH } from "@/lib/auth-paths";
import { createClient } from "@/lib/supabase/server";

/**
 * Signs out and returns to the login page. Pages redirect here when a profile
 * is missing or inactive, because Server Components can't change cookies.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const disabled = request.nextUrl.searchParams.get("reason") === "disabled";
  redirect(disabled ? `${LOGIN_PATH}?error=disabled` : LOGIN_PATH);
}
