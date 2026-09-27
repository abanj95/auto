import { Car, Plus } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { VehicleActionsMenu } from "@/components/staff/vehicle-actions-menu";
import { VehicleSearch } from "@/components/staff/vehicle-search";
import { STATUS_LABELS, VehicleStatusBadge } from "@/components/staff/vehicle-status-badge";
import { Button } from "@/components/ui/button";
import { requireStaff } from "@/lib/auth";
import { Constants, type Enums } from "@/lib/database.types";
import { formatPrice, listingAge, vehicleTitle } from "@/lib/format";
import { photoUrl } from "@/lib/public-data";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Vehicles" };

const STATUSES = Constants.public.Enums.vehicle_status;

export default async function VehiclesPage({ searchParams }: PageProps<"/admin/vehicles">) {
  const { profile } = await requireStaff();
  const isAdmin = profile.role === "admin";
  const params = await searchParams;
  const status = STATUSES.find((s) => s === params.status);
  // Keep search terms to characters that are safe inside a PostgREST filter.
  const q =
    typeof params.q === "string"
      ? params.q
          .replace(/[^\p{L}\p{N}\s-]/gu, " ")
          .trim()
          .slice(0, 60)
      : "";

  const supabase = await createClient();
  let query = supabase
    .from("vehicles")
    .select(
      "id, slug, stock_no, vin, year, make, model, trim, price, status, published_at, created_at, vehicle_photos(storage_path, sort_order)",
    )
    .order("sort_order", { referencedTable: "vehicle_photos" })
    .limit(1, { referencedTable: "vehicle_photos" })
    .order("created_at", { ascending: false })
    .limit(300);
  if (status) query = query.eq("status", status);
  for (const term of q.split(/\s+/).filter(Boolean)) {
    const like = `*${term}*`;
    query = query.or(
      `stock_no.ilike.${like},vin.ilike.${like},make.ilike.${like},model.ilike.${like}`,
    );
  }

  const [{ data: vehicles, error }, { data: allStatuses }] = await Promise.all([
    query,
    supabase.from("vehicles").select("status"),
  ]);
  if (error) throw error;

  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<
    Enums<"vehicle_status">,
    number
  >;
  for (const row of allStatuses ?? []) counts[row.status]++;
  const total = allStatuses?.length ?? 0;

  const chipHref = (s?: string) => {
    const next = new URLSearchParams();
    if (s) next.set("status", s);
    if (q) next.set("q", q);
    const query = next.toString();
    return query ? `/admin/vehicles?${query}` : "/admin/vehicles";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Vehicles</h1>
        <Button asChild className="hidden h-11 md:inline-flex">
          <Link href="/admin/vehicles/new">
            <Plus aria-hidden /> Add vehicle
          </Link>
        </Button>
      </div>

      <VehicleSearch initial={q} />

      <nav
        aria-label="Filter by status"
        className="-mx-4 no-scrollbar flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0"
      >
        {[undefined, ...STATUSES].map((s) => {
          const active = s === status;
          return (
            <Link
              key={s ?? "all"}
              href={chipHref(s)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-background hover:bg-muted",
              )}
            >
              {s ? STATUS_LABELS[s] : "All"}
              <span className={cn("text-xs", active ? "opacity-80" : "text-muted-foreground")}>
                {s ? counts[s] : total}
              </span>
            </Link>
          );
        })}
      </nav>

      {vehicles.length === 0 ? (
        <div className="rounded-xl border border-dashed px-6 py-14 text-center">
          <Car className="mx-auto size-10 text-muted-foreground" aria-hidden />
          <p className="mt-3 font-semibold">
            {q || status ? "No vehicles match." : "No vehicles yet."}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {q || status
              ? "Try a different search or status."
              : "Tap “Add vehicle” to post your first car."}
          </p>
        </div>
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {vehicles.map((v) => {
            const cover = v.vehicle_photos[0];
            const title = vehicleTitle(v);
            const age = listingAge(v.published_at, v.created_at);
            return (
              <li key={v.id} className="flex items-center gap-3 p-3">
                <Link
                  href={`/admin/vehicles/${v.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
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
                      <Car
                        className="absolute inset-0 m-auto size-6 text-muted-foreground"
                        aria-hidden
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate font-semibold">{title}</p>
                    <p className="text-sm font-bold">
                      {v.price == null ? "No price" : formatPrice(v.price)}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <VehicleStatusBadge status={v.status} />
                      <span>{v.stock_no}</span>
                      <span>· {age}</span>
                    </div>
                  </div>
                </Link>
                <VehicleActionsMenu
                  vehicle={{ id: v.id, slug: v.slug, status: v.status, label: title }}
                  isAdmin={isAdmin}
                />
              </li>
            );
          })}
        </ul>
      )}

      {/* Floating add button above the bottom tabs (phones only). */}
      <Button
        asChild
        size="lg"
        className="fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 h-14 rounded-full px-5 text-base font-semibold shadow-lg md:hidden"
      >
        <Link href="/admin/vehicles/new">
          <Plus className="size-5" aria-hidden /> Add vehicle
        </Link>
      </Button>
    </div>
  );
}
