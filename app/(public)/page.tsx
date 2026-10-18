import { Car, MapPin, Phone, Search, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Container } from "@/components/public/container";
import { HeroCarousel } from "@/components/public/hero-carousel";
import { HERO_HEIGHT } from "@/components/public/hero-slide";
import { SectionHeading } from "@/components/public/section-heading";
import { VehicleGrid } from "@/components/public/vehicle-grid";
import { phoneHref } from "@/lib/format";
import { getFeaturedVehicles, getHeroSlides, getSiteSettings, mapUrl } from "@/lib/public-data";
import { siteImageUrl } from "@/lib/site-images";
import { cn } from "@/lib/utils";

export default async function HomePage() {
  const [settings, slides] = await Promise.all([getSiteSettings(), getHeroSlides()]);
  // One row of featured cars, only when the homepage editor's toggle is on.
  const featured = settings.show_featured_on_home ? await getFeaturedVehicles(4) : [];
  const map = mapUrl(settings);
  const photo = siteImageUrl(settings.about_image_path);
  const paragraphs = settings.about_text?.split(/\n\s*\n/).filter((p) => p.trim()) ?? [];

  const tiles: Tile[] = [
    { label: settings.tile_inventory_label, icon: Car, href: "/inventory" },
    { label: settings.tile_finder_label, icon: Search, href: "/vehicle-finder" },
    ...(map ? [{ label: settings.tile_visit_label, icon: MapPin, href: map, external: true }] : []),
    ...(settings.phone
      ? [{ label: settings.tile_call_label, icon: Phone, href: `tel:${phoneHref(settings.phone)}` }]
      : []),
  ];

  return (
    <>
      {/* Hero: carousel from /admin/homepage, or a plain fallback with no live slides */}
      {slides.length > 0 ? (
        <HeroCarousel
          slides={slides}
          autoplay={settings.hero_autoplay}
          intervalSeconds={settings.hero_interval_seconds}
        />
      ) : (
        <FallbackHero name={settings.dealership_name} />
      )}

      <Container className="py-14 sm:py-16">
        <nav aria-label="Quick links" className="mx-auto max-w-5xl">
          <ul
            className={cn(
              "grid grid-cols-2 gap-x-4 gap-y-12 pt-8 sm:gap-x-6",
              tiles.length === 4 ? "md:grid-cols-4" : "md:grid-cols-3",
            )}
            data-testid="quick-links"
          >
            {tiles.map((tile) => (
              <li key={tile.href}>
                <QuickLinkTile {...tile} />
              </li>
            ))}
          </ul>
        </nav>
      </Container>

      <section className="bg-muted/60">
        <Container
          className={cn(
            "py-14 sm:py-20",
            photo ? "grid items-center gap-8 lg:grid-cols-2 lg:gap-14" : "max-w-3xl text-center",
          )}
        >
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
              Welcome to {settings.dealership_name}
            </h2>
            <p className="mt-2 text-lg font-semibold text-balance text-brand sm:text-xl">
              {settings.home_welcome_subheading}
            </p>
            <div
              className={cn("mt-5 h-1 w-16 rounded-full bg-primary", !photo && "mx-auto")}
              aria-hidden
            />
            <div className="mt-6 space-y-4 text-base leading-relaxed text-foreground/85 sm:text-lg">
              {paragraphs.length > 0 ? (
                paragraphs.map((p, i) => <p key={i}>{p}</p>)
              ) : (
                <p>Quality pre-owned vehicles at honest, all-in prices.</p>
              )}
            </div>
          </div>
          {photo && (
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted shadow-sm">
              <Image
                src={photo}
                alt={settings.dealership_name}
                fill
                sizes="(min-width: 1024px) 600px, 100vw"
                className="object-cover"
              />
            </div>
          )}
        </Container>
      </section>

      {featured.length > 0 && (
        <Container className="py-14 sm:py-16">
          <section>
            <SectionHeading title="Featured vehicles" href="/inventory" />
            <VehicleGrid vehicles={featured} />
          </section>
        </Container>
      )}
    </>
  );
}

type Tile = { label: string; icon: LucideIcon; href: string; external?: boolean };

/** Dark card with a round accent icon badge overlapping its top edge. */
function QuickLinkTile({ label, icon: Icon, href, external }: Tile) {
  const className =
    "group relative flex aspect-[4/3] flex-col items-center justify-center rounded-2xl bg-neutral-900 px-3 pt-8 text-center text-white shadow-md transition hover:-translate-y-1 hover:bg-neutral-800 hover:shadow-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";
  const content = (
    <>
      <span className="absolute -top-8 left-1/2 flex size-16 -translate-x-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background transition group-hover:scale-105">
        <Icon className="size-7" aria-hidden />
      </span>
      <span className="text-lg leading-tight font-bold sm:text-xl">{label}</span>
    </>
  );
  if (external)
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {content}
      </a>
    );
  if (href.startsWith("tel:"))
    return (
      <a href={href} className={className}>
        {content}
      </a>
    );
  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}

/** Shown when no slide is live: the dealership name in the same centered box. */
function FallbackHero({ name }: { name: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center bg-gradient-to-br from-neutral-950 via-neutral-900 to-brand/40 px-4 text-white",
        HERO_HEIGHT,
      )}
      data-testid="fallback-hero"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-black/50 px-5 py-8 text-center sm:px-10 sm:py-10">
        <h1 className="text-3xl leading-[1.1] font-extrabold tracking-tight sm:text-5xl">{name}</h1>
        <p className="mt-3 text-base text-white/85 sm:text-lg">
          Quality pre-owned cars, trucks and SUVs, priced up front.
        </p>
        <Link
          href="/inventory"
          className="mt-6 inline-flex h-12 items-center rounded-full bg-primary px-7 text-base font-semibold text-primary-foreground shadow-lg transition hover:bg-primary/90"
        >
          View inventory
        </Link>
      </div>
    </div>
  );
}
