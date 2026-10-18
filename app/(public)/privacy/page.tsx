import type { Metadata } from "next";

import { LegalPage } from "@/components/public/legal-page";
import { getSiteSettings } from "@/lib/public-data";

export const metadata: Metadata = { title: "Privacy Policy" };

export default async function PrivacyPage() {
  const s = await getSiteSettings();
  return (
    <LegalPage title="Privacy Policy" markdown={s.privacy_md} updated={s.privacy_updated_at} />
  );
}
