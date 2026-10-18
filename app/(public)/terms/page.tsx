import type { Metadata } from "next";

import { LegalPage } from "@/components/public/legal-page";
import { getSiteSettings } from "@/lib/public-data";

export const metadata: Metadata = { title: "Terms of Use" };

export default async function TermsPage() {
  const s = await getSiteSettings();
  return <LegalPage title="Terms of Use" markdown={s.terms_md} updated={s.terms_updated_at} />;
}
