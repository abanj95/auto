import { Car, CirclePlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { DeniedToast } from "@/components/staff/denied-toast";
import { Button } from "@/components/ui/button";
import { DENIED_PARAM, requireStaff } from "@/lib/auth";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: PageProps<"/admin">) {
  const { profile } = await requireStaff();
  const denied = (await searchParams)[DENIED_PARAM] === "1";
  const firstName = profile.full_name?.split(" ")[0];

  return (
    <div className="space-y-6">
      {denied && <DeniedToast />}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {firstName ? `Hi, ${firstName}` : "Dashboard"}
        </h1>
        <p className="text-muted-foreground">
          Signed in as {profile.role === "admin" ? "an admin" : "a poster"}.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Button asChild size="lg" className="h-12">
          <Link href="/admin/vehicles/new">
            <CirclePlus aria-hidden /> Add a vehicle
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-12">
          <Link href="/admin/vehicles">
            <Car aria-hidden /> View vehicles
          </Link>
        </Button>
      </div>
    </div>
  );
}
