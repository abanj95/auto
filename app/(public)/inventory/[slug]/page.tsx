import { ArrowDown } from "lucide-react";
import type { Metadata } from "next";
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

// Cached and rebuilt at most every 5 minutes (staff saves will also refresh it).
export const revalidate = 300;

// No pages prebuilt at deploy; each vehicle page is rendered on first visit, then cached.
export function generateStaticParams() {
  return [];
}

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

  const specs: [string, string | null][] = [
    ["Body", v.body_type && BODY_TYPE_LABELS[v.body_type]],
    ["Engine", v.engine],
    ["Transmission", v.transmission && TRANSMISSION_LABELS[v.transmission]],
    ["Drivetrain", v.drivetrain && DRIVETRAIN_LABELS[v.drivetrain]],
    ["Fuel", v.fuel_type && FUEL_LABELS[v.fuel_type]],
    ["Exterior", v.exterior_color],
    ["Interior", v.interior_color],
    ["Title", v.title_status && TITLE_STATUS_LABELS[v.title_status]],
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
      <Container className="px-0 sm:px-6 sm:pt-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
          <div className="min-w-0">
            <VehicleGallery photos={v.photos} alt={title} sold={sold} />
          </div>

          {/* Summary + desktop actions */}
          <aside className="px-4 sm:px-0 lg:sticky lg:top-24 lg:self-start">
            <div className="space-y-5 lg:rounded-xl lg:border lg:bg-card lg:p-6 lg:shadow-sm">
              <div className="space-y-2">
                <VehicleBadges vehicle={v} />
                <h1 className="text-3xl leading-tight font-extrabold tracking-tight">
                  {vehicleTitle(v)}
                </h1>
                {v.trim && <p className="text-lg text-muted-foreground">{v.trim}</p>}
              </div>

              {sold ? (
                <div className="space-y-3">
                  <p className="text-2xl font-extrabold text-brand">This vehicle has been sold</p>
                  {similar.length > 0 && (
                    <a
                      href="#similar"
                      className="inline-flex items-center gap-1.5 font-semibold text-primary underline-offset-4 hover:underline"
                    >
                      See similar vehicles <ArrowDown className="size-4" aria-hidden />
                    </a>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-4xl font-extrabold tracking-tight">{formatPrice(v.price)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{settings.price_disclaimer}</p>
                </div>
              )}

              <dl className="grid grid-cols-3 gap-3 border-y py-4 text-sm">
                <KeyFact label="Mileage" value={formatMileage(v.mileage) ?? "—"} />
                <KeyFact label="Stock #" value={v.stock_no} />
                <KeyFact
                  label="VIN"
                  value={v.vin ?? "—"}
                  className="col-span-3 sm:col-span-1 lg:col-span-3"
                  mono
                />
              </dl>

              <DesktopActions {...actions} />
            </div>
          </aside>
        </div>
      </Container>

      <Container className="mt-10 space-y-12 sm:mt-12">
        {sold && similarSection}

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
          <div className="space-y-10">
            <section>
              <h2 className="mb-4 text-xl font-bold">Specifications</h2>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl border p-5 sm:grid-cols-3">
                {specs.map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      {label}
                    </dt>
                    <dd className="mt-0.5 font-medium">{value ?? "—"}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {v.features.length > 0 && (
              <section>
                <h2 className="mb-4 text-xl font-bold">Features</h2>
                <ul className="flex flex-wrap gap-2">
                  {v.features.map((f) => (
                    <li key={f} className="rounded-full bg-muted px-3.5 py-1.5 text-sm font-medium">
                      {f}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {paragraphs.length > 0 && (
              <section>
                <h2 className="mb-4 text-xl font-bold">Description</h2>
                <div className="max-w-prose space-y-4 leading-relaxed text-foreground/90">
                  {paragraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>

        {!sold && similarSection}
      </Container>

      <div className="h-16" />
      <MobileActionBar {...actions} />
    </div>
  );
}

function KeyFact({
  label,
  value,
  className,
  mono,
}: {
  label: string;
  value: string;
  className?: string;
  mono?: boolean;
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className={mono ? "mt-0.5 font-mono text-[13px] break-all" : "mt-0.5 font-semibold"}>
        {value}
      </dd>
    </div>
  );
}
