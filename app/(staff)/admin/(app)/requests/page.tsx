import { ChevronRight, Inbox } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { RequestStatusBadge } from "@/components/staff/requests/request-status-badge";
import { requirePermission } from "@/lib/auth";
import { lastSeen } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import {
  REQUEST_STATUS_LABELS,
  REQUEST_STATUSES,
  requestTitle,
  type RequestStatus,
} from "@/lib/validation/vehicle-request";

export const metadata: Metadata = { title: "Requests" };

export default async function RequestsPage({ searchParams }: PageProps<"/admin/requests">) {
  await requirePermission("requests");
  const params = await searchParams;
  const status = REQUEST_STATUSES.find((s) => s === params.status);

  const supabase = await createClient();
  let query = supabase
    .from("vehicle_requests")
    .select("id, first_name, last_name, year_from, year_to, make, model, status, created_at")
    .order("created_at", { ascending: false })
    .limit(300);
  if (status) query = query.eq("status", status);

  const [{ data: requests, error }, { data: allStatuses }] = await Promise.all([
    query,
    supabase.from("vehicle_requests").select("status"),
  ]);
  if (error) throw error;

  const counts = Object.fromEntries(REQUEST_STATUSES.map((s) => [s, 0])) as Record<
    RequestStatus,
    number
  >;
  for (const row of allStatuses ?? []) counts[row.status]++;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Vehicle Finder requests</h1>
        <p className="text-sm text-muted-foreground">
          Buyers asking us to find a car. Closed requests are deleted after 12 months.
        </p>
      </div>

      <nav
        aria-label="Filter by status"
        className="-mx-4 no-scrollbar flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0"
      >
        {[undefined, ...REQUEST_STATUSES].map((s) => {
          const active = s === status;
          return (
            <Link
              key={s ?? "all"}
              href={s ? `/admin/requests?status=${s}` : "/admin/requests"}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-background hover:bg-muted",
              )}
            >
              {s ? REQUEST_STATUS_LABELS[s] : "All"}
              <span className={cn("text-xs", active ? "opacity-80" : "text-muted-foreground")}>
                {s ? counts[s] : (allStatuses?.length ?? 0)}
              </span>
            </Link>
          );
        })}
      </nav>

      {requests.length === 0 ? (
        <div className="rounded-xl border border-dashed px-6 py-14 text-center">
          <Inbox className="mx-auto size-10 text-muted-foreground" aria-hidden />
          <p className="mt-3 font-semibold">{status ? "No requests here." : "No requests yet."}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            New requests from the Vehicle Finder page show up here.
          </p>
        </div>
      ) : (
        <ul className="divide-y rounded-xl border bg-card" data-testid="request-list">
          {requests.map((r) => (
            <li key={r.id}>
              <Link
                href={`/admin/requests/${r.id}`}
                className="flex min-h-16 items-center gap-3 p-4 hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate font-semibold">
                    {r.first_name} {r.last_name}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{requestTitle(r)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <RequestStatusBadge status={r.status} />
                  <span className="text-xs text-muted-foreground">{lastSeen(r.created_at)}</span>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
