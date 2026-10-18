import { cn } from "@/lib/utils";
import { REQUEST_STATUS_LABELS, type RequestStatus } from "@/lib/validation/vehicle-request";

const STYLES: Record<RequestStatus, string> = {
  new: "bg-primary text-primary-foreground",
  contacted: "bg-sky-100 text-sky-900",
  found: "bg-emerald-100 text-emerald-900",
  closed: "bg-muted text-muted-foreground",
};

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", STYLES[status])}>
      {REQUEST_STATUS_LABELS[status]}
    </span>
  );
}
