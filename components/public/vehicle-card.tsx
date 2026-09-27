import { Car } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { VehicleBadges } from "@/components/public/vehicle-badges";
import { DRIVETRAIN_LABELS, formatMileage, formatPrice, vehicleTitle } from "@/lib/format";
import type { VehicleCardData } from "@/lib/public-data";

/** Phones get a full-width image; tablets half; desktop a third. */
export const CARD_IMAGE_SIZES =
  "(min-width: 1280px) 400px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw";

export function VehicleCard({
  vehicle: v,
  eager,
}: {
  vehicle: VehicleCardData;
  /** Load immediately (cards that may be the largest image on screen). */
  eager?: boolean;
}) {
  const details = [formatMileage(v.mileage), v.drivetrain && DRIVETRAIN_LABELS[v.drivetrain]]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={`/inventory/${v.slug}`}
      className="group block overflow-hidden rounded-xl border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <div className="relative aspect-[4/3] bg-muted">
        {v.coverUrl ? (
          <Image
            src={v.coverUrl}
            alt={`${vehicleTitle(v)} ${v.trim ?? ""}`.trim()}
            fill
            sizes={CARD_IMAGE_SIZES}
            loading={eager ? "eager" : undefined}
            className="object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <Car className="size-12" aria-hidden />
          </div>
        )}
        <VehicleBadges vehicle={v} className="absolute top-3 left-3" />
      </div>
      <div className="space-y-1 p-4">
        <h3 className="text-lg leading-tight font-bold tracking-tight">{vehicleTitle(v)}</h3>
        {v.trim && <p className="truncate text-sm text-muted-foreground">{v.trim}</p>}
        <p className="pt-2 text-2xl font-extrabold tracking-tight">{formatPrice(v.price)}</p>
        {details && <p className="text-sm text-muted-foreground">{details}</p>}
      </div>
    </Link>
  );
}
