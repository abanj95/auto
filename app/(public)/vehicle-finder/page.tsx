import type { Metadata } from "next";

import { Container } from "@/components/public/container";
import { VehicleFinderForm } from "@/components/public/vehicle-finder-form";
import { getSiteSettings } from "@/lib/public-data";

export const metadata: Metadata = {
  title: "Vehicle Finder",
  description: "Tell us the car you want and we'll search our sources for you. No obligation.",
};

export default async function VehicleFinderPage() {
  const settings = await getSiteSettings();

  return (
    <Container className="max-w-3xl py-10 sm:py-14">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Vehicle Finder</h1>
      <p className="mt-3 text-lg whitespace-pre-line text-muted-foreground">
        {settings.finder_intro}
      </p>
      <div className="mt-8">
        <VehicleFinderForm dealershipName={settings.dealership_name} phone={settings.phone} />
      </div>
    </Container>
  );
}
