import { Car } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { VehicleActionsMenu } from "@/components/staff/vehicle-actions-menu";
import { VehicleStatusBadge } from "@/components/staff/vehicle-status-badge";
import type { Tables } from "@/lib/database.types";
import { formatPrice, listingAge, vehicleTitle } from "@/lib/format";
import { photoUrl } from "@/lib/public-data";
import { daysUntilPurge } from "@/lib/sold-retention";

/** Columns a VehicleRow needs (select with STAFF_ROW_SELECT). */
export const STAFF_ROW_SELECT =
  "id, slug, stock_no, year, make, model, price, status, published_at, created_at, sold_at, vehicle_photos(storage_path, sort_order)";

export type StaffRowVehicle = Pick<
  Tables<"vehicles">,
  | "id"
  | "slug"
  | "stock_no"
  | "year"
  | "make"
  | "model"
  | "price"
  | "status"
  | "published_at"
  | "created_at"
  | "sold_at"
> & { vehicle_photos: { storage_path: string }[] };

/** One vehicle in the staff list / dashboard: cover, title, price, status, age, ⋯ menu. */
export function VehicleRow({ vehicle: v }: { vehicle: StaffRowVehicle }) {
  const cover = v.vehicle_photos[0];
  const title = vehicleTitle(v);
  const purgeIn = v.status === "sold" && v.sold_at ? daysUntilPurge(v.sold_at) : null;

  return (
    <li className="flex items-center gap-3 p-3">
      <Link href={`/admin/vehicles/${v.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <div className="relative aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-lg bg-muted sm:w-28">
          {cover ? (
            <Image
              src={photoUrl(cover.storage_path)}
              alt=""
              fill
              sizes="112px"
              className="object-cover"
            />
          ) : (
            <Car className="absolute inset-0 m-auto size-6 text-muted-foreground" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate font-semibold">{title}</p>
          <p className="text-sm font-bold">{v.price == null ? "No price" : formatPrice(v.price)}</p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <VehicleStatusBadge status={v.status} />
            <span>{v.stock_no}</span>
            <span>· {listingAge(v.published_at, v.created_at)}</span>
            {purgeIn !== null && (
              <span className="font-medium text-red-700">
                ·{" "}
                {purgeIn === 0
                  ? "Deletes today"
                  : `Deletes in ${purgeIn} day${purgeIn === 1 ? "" : "s"}`}
              </span>
            )}
          </div>
        </div>
      </Link>
      <VehicleActionsMenu vehicle={{ id: v.id, slug: v.slug, status: v.status, label: title }} />
    </li>
  );
}
