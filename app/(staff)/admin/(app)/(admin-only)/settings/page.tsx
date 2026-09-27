import type { Metadata } from "next";

import { SettingsForm } from "@/components/staff/settings-form";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_HOURS,
  hoursSchema,
  type SiteSettingsFormValues,
} from "@/lib/validation/site-settings";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: s, error } = await supabase.from("site_settings").select("*").single();
  if (error) throw error;

  const hours = hoursSchema.safeParse(s.hours);
  const values: SiteSettingsFormValues = {
    dealership_name: s.dealership_name,
    phone: s.phone ?? "",
    sms_phone: s.sms_phone ?? "",
    email: s.email ?? "",
    address: s.address ?? "",
    city: s.city ?? "",
    state: s.state ?? "",
    zip: s.zip ?? "",
    hours: hours.success ? hours.data : DEFAULT_HOURS,
    about_text: s.about_text ?? "",
    price_disclaimer: s.price_disclaimer,
    facebook_url: s.facebook_url ?? "",
    google_maps_url: s.google_maps_url ?? "",
  };

  return <SettingsForm initial={values} hoursWereSet={hours.success} />;
}
