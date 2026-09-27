import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { VehicleForm } from "@/components/staff/vehicle-form/vehicle-form";
import { requireStaff } from "@/lib/auth";
import { vehicleTitle } from "@/lib/format";
import { photoUrl } from "@/lib/public-data";
import { createClient } from "@/lib/supabase/server";
import { groupDigits, type VehicleFormValues } from "@/lib/validation/vehicle";

export default async function EditVehiclePage({ params }: PageProps<"/admin/vehicles/[id]">) {
  const { profile } = await requireStaff();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const { data: v } = await supabase
    .from("vehicles")
    .select("*, vehicle_photos(id, storage_path, sort_order)")
    .eq("id", id)
    .order("sort_order", { referencedTable: "vehicle_photos" })
    .maybeSingle();
  if (!v) notFound();

  const values: VehicleFormValues = {
    vin: v.vin ?? "",
    year: v.year?.toString() ?? "",
    make: v.make ?? "",
    model: v.model ?? "",
    trim: v.trim ?? "",
    body_type: v.body_type ?? "",
    mileage: v.mileage == null ? "" : groupDigits(String(v.mileage)),
    price: v.price == null ? "" : groupDigits(String(v.price)),
    exterior_color: v.exterior_color ?? "",
    interior_color: v.interior_color ?? "",
    engine: v.engine ?? "",
    transmission: v.transmission ?? "",
    drivetrain: v.drivetrain ?? "",
    fuel_type: v.fuel_type ?? "",
    title_status: v.title_status ?? "",
    features: v.features,
    description: v.description ?? "",
    featured: v.featured,
  };

  return (
    <VehicleForm
      // Remount when switching between vehicles.
      key={v.id}
      vehicle={{ id: v.id, status: v.status, slug: v.slug, stock_no: v.stock_no }}
      values={values}
      photos={v.vehicle_photos.map((p) => ({ id: p.id, src: photoUrl(p.storage_path) }))}
      isAdmin={profile.role === "admin"}
    />
  );
}

export async function generateMetadata({
  params,
}: PageProps<"/admin/vehicles/[id]">): Promise<Metadata> {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return {};
  const supabase = await createClient();
  const { data } = await supabase
    .from("vehicles")
    .select("year, make, model")
    .eq("id", id)
    .maybeSingle();
  return { title: data ? `Edit ${vehicleTitle(data)}` : "Edit vehicle" };
}
