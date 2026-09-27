import type { Enums } from "@/lib/database.types";
import { cn } from "@/lib/utils";

const STYLES: Record<Enums<"vehicle_status">, string> = {
  draft: "bg-neutral-100 text-neutral-700 ring-neutral-300",
  available: "bg-emerald-50 text-emerald-800 ring-emerald-600/30",
  pending: "bg-amber-50 text-amber-900 ring-amber-500/40",
  sold: "bg-red-50 text-red-800 ring-red-600/30",
};

export const STATUS_LABELS: Record<Enums<"vehicle_status">, string> = {
  draft: "Draft",
  available: "Available",
  pending: "Pending",
  sold: "Sold",
};

export function VehicleStatusBadge({
  status,
  className,
}: {
  status: Enums<"vehicle_status">;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset",
        STYLES[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
