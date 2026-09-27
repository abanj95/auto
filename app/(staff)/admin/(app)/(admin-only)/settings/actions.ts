"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { siteSettingsSchema, type SiteSettingsFormValues } from "@/lib/validation/site-settings";

export type SettingsResult =
  { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Admin only. Saves the single site_settings row and refreshes every public page. */
export async function saveSiteSettings(values: SiteSettingsFormValues): Promise<SettingsResult> {
  await requireAdmin();

  const parsed = siteSettingsSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[issue.path.join(".")] ??= issue.message;
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("site_settings").update(parsed.data).eq("id", true);
  if (error) {
    console.error("saveSiteSettings failed", error);
    return { ok: false, error: "Couldn't save the settings. Please try again." };
  }

  // Header, footer, contact details and hours appear on every public page.
  revalidatePath("/", "layout");
  return { ok: true };
}
