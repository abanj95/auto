import type { Metadata } from "next";
import Link from "next/link";

import { ContactCard } from "@/components/public/contact-card";
import { Container } from "@/components/public/container";
import { Button } from "@/components/ui/button";
import { getSiteSettings } from "@/lib/public-data";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings();
  return {
    title: "About",
    description: `About ${s.dealership_name}${s.city ? ` in ${s.city}` : ""}.`,
  };
}

export default async function AboutPage() {
  const settings = await getSiteSettings();
  const paragraphs = settings.about_text?.split(/\n\s*\n/).filter((p) => p.trim()) ?? [];

  return (
    <Container className="grid gap-10 py-10 sm:py-14 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-14">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          About {settings.dealership_name}
        </h1>
        <div className="mt-6 max-w-prose space-y-5 text-lg leading-relaxed text-foreground/85">
          {paragraphs.length > 0 ? (
            paragraphs.map((p, i) => <p key={i}>{p}</p>)
          ) : (
            <p>Quality pre-owned vehicles at honest, all-in prices.</p>
          )}
        </div>
        <Button asChild size="lg" className="mt-8 h-12 text-base font-semibold">
          <Link href="/inventory">Browse inventory</Link>
        </Button>
      </div>
      <ContactCard settings={settings} />
    </Container>
  );
}
