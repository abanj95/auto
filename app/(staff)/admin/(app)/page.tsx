import { CirclePlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { DeniedToast } from "@/components/staff/denied-toast";
import { STAFF_ROW_SELECT, VehicleRow } from "@/components/staff/vehicle-row";
import { Button } from "@/components/ui/button";
import { DENIED_PARAM, requireStaff } from "@/lib/auth";
import { daysAgoIso } from "@/lib/sold-retention";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: PageProps<"/admin">) {
  const { profile } = await requireStaff();
  const denied = (await searchParams)[DENIED_PARAM] === "1";
  const supabase = await createClient();

  const count = (status: "available" | "pending" | "draft") =>
    supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("status", status);
  const [available, pending, draft, sold, recent] = await Promise.all([
    count("available"),
    count("pending"),
    count("draft"),
    supabase
      .from("vehicles")
      .select("id", { count: "exact", head: true })
      .eq("status", "sold")
      .gte("sold_at", daysAgoIso(30)),
    supabase
      .from("vehicles")
      .select(STAFF_ROW_SELECT)
      .order("sort_order", { referencedTable: "vehicle_photos" })
      .limit(1, { referencedTable: "vehicle_photos" })
      .order("updated_at", { ascending: false })
      .limit(5),
  ]);
  if (recent.error) throw recent.error;

  const tiles = [
    {
      label: "Available",
      value: available.count,
      href: "/admin/vehicles?status=available",
      tone: "text-emerald-700",
    },
    {
      label: "Pending",
      value: pending.count,
      href: "/admin/vehicles?status=pending",
      tone: "text-amber-700",
    },
    {
      label: "Drafts",
      value: draft.count,
      href: "/admin/vehicles?status=draft",
      tone: "text-foreground",
    },
    {
      label: "Sold · 30 days",
      value: sold.count,
      href: "/admin/vehicles?status=sold",
      tone: "text-red-700",
    },
  ];
  const firstName = profile.full_name?.split(" ")[0];

  return (
    <div className="space-y-6">
      {denied && <DeniedToast />}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {firstName ? `Hi, ${firstName}` : "Dashboard"}
          </h1>
          <p className="text-muted-foreground">
            Signed in as {profile.role === "admin" ? "an admin" : "a poster"}.
          </p>
        </div>
      </div>

      <Button asChild size="lg" className="h-14 w-full text-base font-semibold sm:w-auto sm:px-8">
        <Link href="/admin/vehicles/new">
          <CirclePlus className="size-5" aria-hidden /> Add vehicle
        </Link>
      </Button>

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <li key={t.label}>
            <Link
              href={t.href}
              className="block rounded-xl border bg-card p-4 transition hover:border-primary/40 hover:shadow-sm"
            >
              <p
                className={cn("text-3xl font-extrabold tabular-nums", t.tone)}
                data-testid={`count-${t.label}`}
              >
                {t.value ?? 0}
              </p>
              <p className="mt-1 text-sm font-medium text-muted-foreground">{t.label}</p>
            </Link>
          </li>
        ))}
      </ul>

      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <h2 className="text-lg font-bold">Recently updated</h2>
          <Link
            href="/admin/vehicles"
            className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            All vehicles
          </Link>
        </div>
        {recent.data.length ? (
          <ul className="divide-y rounded-xl border bg-card">
            {recent.data.map((v) => (
              <VehicleRow key={v.id} vehicle={v} />
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
            No vehicles yet.
          </p>
        )}
      </section>
    </div>
  );
}
