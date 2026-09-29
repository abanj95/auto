import type { Enums } from "@/lib/database.types";
import { cn } from "@/lib/utils";

const NEW_ARRIVAL_DAYS = 7;

export function isNewArrival(publishedAt: string | null) {
  if (!publishedAt) return false;
  return Date.now() - new Date(publishedAt).getTime() < NEW_ARRIVAL_DAYS * 24 * 60 * 60 * 1000;
}

export function VehicleBadges({
  vehicle,
  className,
}: {
  vehicle: { status: Enums<"vehicle_status">; published_at: string | null; is_demo?: boolean };
  className?: string;
}) {
  const pending = vehicle.status === "pending";
  const isNew = vehicle.status === "available" && isNewArrival(vehicle.published_at);
  const demo = !!vehicle.is_demo;
  if (!pending && !isNew && !demo) return null;

  return (
    <div className={cn("flex gap-1.5", className)}>
      {isNew && (
        <span className="rounded-full bg-brand px-2.5 py-1 text-xs font-bold text-brand-foreground shadow">
          New arrival
        </span>
      )}
      {demo && (
        <span className="rounded-full bg-neutral-900/85 px-2.5 py-1 text-xs font-bold text-white shadow">
          Demo listing
        </span>
      )}
      {pending && (
        <span className="rounded-full bg-amber-400 px-2.5 py-1 text-xs font-bold text-amber-950 shadow">
          Sale pending
        </span>
      )}
    </div>
  );
}
