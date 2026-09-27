import type { Metadata } from "next";

import { ContactCard } from "@/components/public/contact-card";
import { Container } from "@/components/public/container";
import { getSiteSettings } from "@/lib/public-data";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Contact",
  description: "Call, text or visit us.",
};

export default async function ContactPage() {
  const settings = await getSiteSettings();

  return (
    <Container className="max-w-3xl py-10 sm:py-14">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Contact us</h1>
      <p className="mt-3 text-lg text-muted-foreground">
        Questions about a vehicle? Call or text — we&apos;re happy to help.
      </p>
      <div className="mt-8">
        <ContactCard settings={settings} />
      </div>
    </Container>
  );
}
