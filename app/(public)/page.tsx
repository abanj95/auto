import { Clock, MapPin, Phone } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/public/container";
import { HeroCarousel } from "@/components/public/hero-carousel";
import { HERO_HEIGHT } from "@/components/public/hero-slide";
import { HoursList } from "@/components/public/hours-list";
import { QuickSearch } from "@/components/public/quick-search";
import { SectionHeading } from "@/components/public/section-heading";
import { VehicleGrid } from "@/components/public/vehicle-grid";
import { Button } from "@/components/ui/button";
import { Constants } from "@/lib/database.types";
import { BODY_TYPE_LABELS, phoneHref } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  fullAddress,
  getFeaturedVehicles,
  getHeroSlides,
  getInventoryFacets,
  getNewestVehicles,
  getSiteSettings,
  mapUrl,
} from "@/lib/public-data";

// Rebuilt at most every 5 minutes (staff saves will also refresh it).
export const revalidate = 300;

export default async function HomePage() {
  const [settings, slides, featured, newest, facets] = await Promise.all([
    getSiteSettings(),
    getHeroSlides(),
    getFeaturedVehicles(),
    getNewestVehicles(6),
    getInventoryFacets(),
  ]);
  const bodyTypes = Constants.public.Enums.vehicle_body_type.filter((b) => facets.bodyCounts[b]);
  const address = fullAddress(settings);
  const map = mapUrl(settings);
  const place = settings.city ?? "your area";
  const eyebrow = `${settings.dealership_name} · ${place}`;

  return (
    <>
      {/* Hero: carousel from /admin/homepage, or a plain fallback with no live slides */}
      <section className="relative isolate">
        {slides.length > 0 ? (
          <HeroCarousel
            slides={slides}
            eyebrow={eyebrow}
            autoplay={settings.hero_autoplay}
            intervalSeconds={settings.hero_interval_seconds}
          />
        ) : (
          <FallbackHero name={settings.dealership_name} eyebrow={eyebrow} />
        )}
        <Container className="relative -mt-20 sm:-mt-14">
          <div className="max-w-3xl">
            <QuickSearch makes={facets.makes} />
          </div>
        </Container>
      </section>

      <Container className="space-y-16 py-14 sm:space-y-20 sm:py-20">
        {featured.length > 0 && (
          <section>
            <SectionHeading title="Featured vehicles" href="/inventory" />
            <VehicleGrid vehicles={featured} eagerCount={1} />
          </section>
        )}

        <section>
          <SectionHeading title="Newest arrivals" href="/inventory" linkLabel="See all inventory" />
          {newest.length > 0 ? (
            <VehicleGrid vehicles={newest} />
          ) : (
            <p className="text-muted-foreground">New inventory is on the way. Check back soon.</p>
          )}
        </section>

        {bodyTypes.length > 0 && (
          <section>
            <SectionHeading title="Shop by body type" />
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {bodyTypes.map((b) => (
                <li key={b}>
                  <Link
                    href={`/inventory?body=${b}`}
                    className="flex h-full flex-col justify-between rounded-xl border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                  >
                    <span className="text-lg font-bold">{BODY_TYPE_LABELS[b]}</span>
                    <span className="mt-6 text-sm text-muted-foreground">
                      {facets.bodyCounts[b]} available
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="grid gap-8 overflow-hidden rounded-2xl bg-muted/60 p-6 sm:p-10 lg:grid-cols-2">
          <div className="space-y-4">
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              About {settings.dealership_name}
            </h2>
            <p className="line-clamp-6 text-muted-foreground">
              {settings.about_text?.split(/\n\s*\n/)[0] ??
                "Quality pre-owned vehicles at honest prices."}
            </p>
            <Button asChild variant="outline" className="h-11">
              <Link href="/about">More about us</Link>
            </Button>
          </div>
          <div className="space-y-5 rounded-xl bg-background p-6 shadow-sm">
            <h2 className="text-xl font-bold">Visit us</h2>
            {address && (
              <p className="flex gap-3">
                <MapPin className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                {address}
              </p>
            )}
            <div className="flex gap-3">
              <Clock className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              <HoursList hours={settings.hours} className="flex-1" />
            </div>
            <div className="flex flex-wrap gap-2">
              {settings.phone && (
                <Button asChild className="h-11">
                  <a href={`tel:${phoneHref(settings.phone)}`}>
                    <Phone aria-hidden /> {settings.phone}
                  </a>
                </Button>
              )}
              {map && (
                <Button asChild variant="outline" className="h-11">
                  <a href={map} target="_blank" rel="noopener noreferrer">
                    <MapPin aria-hidden /> Get directions
                  </a>
                </Button>
              )}
            </div>
          </div>
        </section>
      </Container>
    </>
  );
}

/** Shown when no slide is live: the dealership name on a plain dark background. */
function FallbackHero({ name, eyebrow }: { name: string; eyebrow: string }) {
  return (
    <div
      className={cn(
        "bg-gradient-to-br from-neutral-950 via-neutral-900 to-brand/40 text-white",
        HERO_HEIGHT,
      )}
      data-testid="fallback-hero"
    >
      <Container className="flex h-full flex-col justify-center pb-24 sm:pb-20">
        <p className="text-sm font-semibold tracking-widest text-white/70 uppercase">{eyebrow}</p>
        <h1 className="mt-3 max-w-2xl text-4xl leading-[1.05] font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
          {name}
        </h1>
        <p className="mt-4 max-w-lg text-lg text-white/80">
          Quality pre-owned cars, trucks and SUVs, priced up front.
        </p>
      </Container>
    </div>
  );
}
