import { Car, Gauge } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { VehicleBadges } from "@/components/public/vehicle-badges";
import { Button } from "@/components/ui/button";
import { formatMileage, formatPrice, vehicleTitle } from "@/lib/format";
import type { VehicleCardData } from "@/lib/public-data";

/** 1 column on phones, 2 on tablets, 3 on laptops, 4 on wide screens. */
export const CARD_IMAGE_SIZES =
  "(min-width: 1280px) 300px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw";

/** Grid view: photo, title (2 lines max), mileage, price box, View details. */
export function VehicleCard({
  vehicle: v,
  eager,
}: {
  vehicle: VehicleCardData;
  /** Load immediately (cards that may be the largest image on screen). */
  eager?: boolean;
}) {
  const href = `/inventory/${v.slug}`;
  const title = [vehicleTitle(v), v.trim].filter(Boolean).join(" ");

  return (
    <article
      className="group flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition hover:shadow-md"
      data-testid="vehicle-card"
    >
      <Link href={href} className="relative block aspect-[4/3] bg-muted" tabIndex={-1} aria-hidden>
        {v.coverUrl ? (
          <Image
            src={v.coverUrl}
            alt=""
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
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="line-clamp-2 min-h-[2.5em] text-base leading-tight font-extrabold tracking-tight uppercase">
          <Link href={href} className="hover:text-brand">
            {title}
          </Link>
        </h3>
        <p className="flex items-center gap-1.5 text-sm text-neutral-600">
          <Gauge className="size-4" aria-hidden />
          {v.mileage !== null ? formatMileage(v.mileage) : "Mileage —"}
        </p>
        <div className="mt-auto rounded-lg border-2 border-neutral-200 px-3 py-2 text-center">
          <p className="text-xs font-semibold tracking-wide text-neutral-600 uppercase">
            Our price
          </p>
          <p className="text-2xl font-extrabold tracking-tight text-brand">
            {formatPrice(v.price)}
          </p>
        </div>
        <Button asChild className="h-11 w-full font-bold tracking-wide uppercase">
          <Link href={href}>
            View details<span className="sr-only">: {title}</span>
          </Link>
        </Button>
      </div>
    </article>
  );
}
