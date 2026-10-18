import {
  Armchair,
  ArrowDown,
  ArrowLeft,
  CarFront,
  Check,
  CircleDot,
  Cog,
  FileCheck,
  Fuel,
  Gauge,
  Hash,
  Palette,
  ScanBarcode,
  Search,
  Settings2,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/public/container";
import {
  DesktopActions,
  MobileActionBar,
  type VehicleActionsProps,
} from "@/components/public/vehicle-actions";
import { VehicleBadges } from "@/components/public/vehicle-badges";
import { VehicleGallery } from "@/components/public/vehicle-gallery";
import { VehicleGrid } from "@/components/public/vehicle-grid";
import {
  BODY_TYPE_LABELS,
  DRIVETRAIN_LABELS,
  FUEL_LABELS,
  formatMileage,
  formatPrice,
  TITLE_STATUS_LABELS,
  TRANSMISSION_LABELS,
  vehicleTitle,
} from "@/lib/format";
import {
  getSimilarVehicles,
  getSiteSettings,
  getVehicleBySlug,
  type VehicleDetail,
} from "@/lib/public-data";
import { cn } from "@/lib/utils";

function fullTitle(v: VehicleDetail) {
  return [vehicleTitle(v), v.trim].filter(Boolean).join(" ");
}

export async function generateMetadata({
  params,
}: PageProps<"/inventory/[slug]">): Promise<Metadata> {
  const v = await getVehicleBySlug((await params).slug);
  if (!v) return {};
  const title = fullTitle(v);
  const description = [
    v.status === "sold" ? "Sold" : formatPrice(v.price),
    formatMileage(v.mileage),
    v.exterior_color,
  ]
    .filter(Boolean)
    .join(" · ");
  const cover = v.photos[0];
  return {
    title,
    description,
    alternates: { canonical: `/inventory/${v.slug}` },
    openGraph: {
      title,
      description,
      type: "website",
      url: `/inventory/${v.slug}`,
      images: cover ? [{ url: cover.src, width: cover.width, height: cover.height }] : undefined,
    },
  };
}

export default async function VehiclePage({ params }: PageProps<"/inventory/[slug]">) {
  const v = await getVehicleBySlug((await params).slug);
  if (!v) notFound(); // Missing or draft.

  const [settings, similar] = await Promise.all([getSiteSettings(), getSimilarVehicles(v)]);
  const sold = v.status === "sold";
  const title = fullTitle(v);

  const actions: VehicleActionsProps = {
    phone: settings.phone,
    smsPhone: settings.sms_phone,
    smsBody: `Hi, I'm interested in the ${vehicleTitle(v)}, stock ${v.stock_no}`,
    share: {
      title,
      text: `${title}${sold ? "" : ` — ${formatPrice(v.price)}`} at ${settings.dealership_name}`,
      path: `/inventory/${v.slug}`,
    },
    sold,
  };

  const specs: Spec[] = [
    { label: "Stock no.", value: v.stock_no, icon: Hash },
    { label: "VIN", value: v.vin, icon: ScanBarcode, mono: true },
    { label: "Body style", value: v.body_type && BODY_TYPE_LABELS[v.body_type], icon: CarFront },
    { label: "Mileage", value: formatMileage(v.mileage), icon: Gauge },
    { label: "Engine", value: v.engine, icon: Cog },
    { label: "Fuel", value: v.fuel_type && FUEL_LABELS[v.fuel_type], icon: Fuel },
    {
      label: "Transmission",
      value: v.transmission && TRANSMISSION_LABELS[v.transmission],
      icon: Settings2,
    },
    { label: "Drive", value: v.drivetrain && DRIVETRAIN_LABELS[v.drivetrain], icon: CircleDot },
    { label: "Exterior color", value: v.exterior_color, icon: Palette },
    { label: "Interior color", value: v.interior_color, icon: Armchair },
    {
      label: "Title",
      value: v.title_status && TITLE_STATUS_LABELS[v.title_status],
      icon: FileCheck,
    },
  ];
  const paragraphs = v.description?.split(/\n\s*\n|\n/).filter((p) => p.trim()) ?? [];

  const similarSection = similar.length > 0 && (
    <section id="similar" className="scroll-mt-24">
      <h2 className="mb-6 text-2xl font-extrabold tracking-tight">Similar vehicles</h2>
      <VehicleGrid vehicles={similar} />
    </section>
  );

  return (
    <div className="pb-28 md:pb-0">
      <div className="border-b bg-muted/50">
        <Container className="py-3">
          <Link
            href="/inventory"
            className="inline-flex h-10 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            <ArrowLeft className="size-4" aria-hidden /> Back to inventory
          </Link>
        </Container>
      </div>

      <Container className="pt-6 sm:pt-8">
        <div className="space-y-2">
          <VehicleBadges vehicle={v} />
          <h1 className="text-2xl leading-tight font-extrabold tracking-tight uppercase sm:text-3xl">
            {title}
          </h1>
        </div>
      </Container>

      <Container className="mt-5 px-0 sm:px-6 lg:px-8">
        {/* Phones stack: photos, price + actions + specs, then features and description. */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
          <div className="min-w-0">
            <VehicleGallery photos={v.photos} alt={title} sold={sold} />
          </div>

          <aside className="space-y-5 px-4 sm:px-0 lg:row-span-2">
            <div className="overflow-hidden rounded-xl border-2 border-neutral-200">
              <div className="px-5 py-5 text-center">
                {sold ? (
                  <>
                    <p className="text-sm font-semibold tracking-wide text-neutral-600 uppercase">
                      Status
                    </p>
                    <p className="mt-1 text-3xl font-extrabold text-brand">Sold</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold tracking-wide text-neutral-600 uppercase">
                      Price
                    </p>
                    <p className="mt-1 text-4xl font-extrabold tracking-tight text-brand">
                      {formatPrice(v.price)}
                    </p>
                  </>
                )}
              </div>
              <p className="border-t bg-muted/60 px-4 py-3 text-center text-sm text-muted-foreground">
                {sold ? (
                  similar.length > 0 ? (
                    <a
                      href="#similar"
                      className="inline-flex items-center gap-1.5 font-semibold text-primary underline-offset-4 hover:underline"
                    >
                      See similar vehicles <ArrowDown className="size-4" aria-hidden />
                    </a>
                  ) : (
                    "This vehicle has been sold."
                  )
                ) : (
                  settings.price_disclaimer
                )}
              </p>
            </div>

            <DesktopActions {...actions} />

            <dl className="overflow-hidden rounded-xl border text-sm" data-testid="vehicle-specs">
              {specs.map(({ label, value, icon: Icon, mono }, i) => (
                <div
                  key={label}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5",
                    i % 2 === 0 ? "bg-muted/70" : "bg-background",
                  )}
                >
                  <Icon className="size-4 shrink-0 text-brand" aria-hidden />
                  <dt className="shrink-0 font-medium text-neutral-600">{label}</dt>
                  <dd
                    className={cn(
                      "min-w-0 flex-1 text-right font-semibold break-words",
                      mono && "font-mono text-[13px] break-all",
                    )}
                  >
                    {value || "—"}
                  </dd>
                </div>
              ))}
            </dl>

            {!sold && (
              <p className="text-center text-sm text-muted-foreground">
                Not quite right?{" "}
                <Link
                  href="/vehicle-finder"
                  className="inline-flex items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline"
                >
                  <Search className="size-3.5" aria-hidden /> Use the Vehicle Finder
                </Link>
              </p>
            )}
          </aside>

          <div className="min-w-0 space-y-10 px-4 sm:px-0">
            {v.features.length > 0 && (
              <section>
                <h2 className="mb-4 text-xl font-bold">Features</h2>
                <ul className="grid gap-x-6 gap-y-2.5 rounded-xl border bg-muted/30 p-5 sm:grid-cols-2">
                  {v.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-[15px]">
                      <Check
                        className="mt-0.5 size-4 shrink-0 text-brand"
                        strokeWidth={3}
                        aria-hidden
                      />
                      {f}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {paragraphs.length > 0 && (
              <section>
                <h2 className="mb-4 text-xl font-bold">About this vehicle</h2>
                <div className="max-w-prose space-y-4 leading-relaxed text-foreground/90">
                  {paragraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </Container>

      <Container className="mt-12 space-y-12">{similarSection}</Container>

      <div className="h-16" />
      <MobileActionBar {...actions} />
    </div>
  );
}

type Spec = { label: string; value: string | null; icon: LucideIcon; mono?: boolean };
