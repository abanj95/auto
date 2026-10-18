import { Car } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { PhotosButton } from "@/components/public/photos-button";
import { VehicleBadges } from "@/components/public/vehicle-badges";
import { Button } from "@/components/ui/button";
import {
  DRIVETRAIN_LABELS,
  formatMileage,
  formatPrice,
  TRANSMISSION_LABELS,
  vehicleTitle,
} from "@/lib/format";
import type { VehicleCardData } from "@/lib/public-data";
import { cn } from "@/lib/utils";

const ROW_IMAGE_SIZES = "(min-width: 1024px) 300px, (min-width: 768px) 260px, 100vw";

/**
 * List view: photo (+ Photos button) | title and spec table | price box and
 * View details. Stacks on phones: photo, title, specs, price, buttons.
 */
export function VehicleListRow({
  vehicle: v,
  eager,
}: {
  vehicle: VehicleCardData;
  eager?: boolean;
}) {
  const href = `/inventory/${v.slug}`;
  const title = [vehicleTitle(v), v.trim].filter(Boolean).join(" ");
  const specs: [string, string | null][] = [
    ["Engine", v.engine],
    ["Mileage", v.mileage !== null ? formatMileage(v.mileage) : null],
    ["Transmission", v.transmission && TRANSMISSION_LABELS[v.transmission]],
    ["Exterior color", v.exterior_color],
    ["Drive", v.drivetrain && DRIVETRAIN_LABELS[v.drivetrain]],
    ["Interior color", v.interior_color],
    ["VIN", v.vin],
    ["Stock no.", v.stock_no],
  ];

  return (
    <article
      className="grid gap-4 py-6 md:grid-cols-[260px_minmax(0,1fr)] md:gap-x-6 lg:grid-cols-[300px_minmax(0,1fr)_220px]"
      data-testid="vehicle-list-row"
    >
      {/* Photo */}
      <div className="space-y-2 md:row-span-2 lg:row-span-1">
        <Link
          href={href}
          className="relative block aspect-[4/3] overflow-hidden rounded-lg bg-muted"
          tabIndex={-1}
          aria-hidden
        >
          {v.coverUrl ? (
            <Image
              src={v.coverUrl}
              alt=""
              fill
              sizes={ROW_IMAGE_SIZES}
              loading={eager ? "eager" : undefined}
              className="object-cover transition duration-300 hover:scale-[1.02]"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <Car className="size-12" aria-hidden />
            </div>
          )}
          <VehicleBadges vehicle={v} className="absolute top-2 left-2" />
        </Link>
        <PhotosButton slug={v.slug} count={v.photoCount} alt={title} />
      </div>

      {/* Title + specs */}
      <div className="min-w-0">
        <h3 className="text-lg leading-tight font-extrabold tracking-tight uppercase sm:text-xl">
          <Link href={href} className="hover:text-brand">
            {title}
          </Link>
        </h3>
        <dl className="mt-3 grid overflow-hidden rounded-md border text-sm md:grid-cols-2">
          {specs.map(([label, value], i) => (
            <div
              key={label}
              className={cn(
                "flex min-w-0 items-baseline justify-between gap-3 px-3 py-2",
                // Zebra by row: one spec per row on phones, two per row from md.
                i % 2 === 0 ? "bg-muted/70" : "bg-transparent",
                Math.floor(i / 2) % 2 === 0 ? "md:bg-muted/70" : "md:bg-transparent",
              )}
            >
              <dt className="shrink-0 font-medium text-neutral-600">{label}</dt>
              <dd
                className="min-w-0 truncate text-right font-semibold text-brand"
                title={value ?? undefined}
              >
                {value || "—"}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Price + details */}
      <div className="flex flex-col gap-3 md:col-start-2 lg:col-start-3 lg:row-start-1">
        <div className="rounded-lg border-2 border-neutral-200 px-4 py-3 text-center">
          <p className="text-xs font-semibold tracking-wide text-neutral-600 uppercase">Price</p>
          <p className="text-3xl font-extrabold tracking-tight text-brand">
            {formatPrice(v.price)}
          </p>
        </div>
        <Button asChild size="lg" className="h-12 w-full font-bold tracking-wide uppercase">
          <Link href={href}>
            View details<span className="sr-only">: {title}</span>
          </Link>
        </Button>
      </div>
    </article>
  );
}
