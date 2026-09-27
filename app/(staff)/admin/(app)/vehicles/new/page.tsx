import type { Metadata } from "next";

import { VehicleForm } from "@/components/staff/vehicle-form/vehicle-form";
import { requireStaff } from "@/lib/auth";
import { EMPTY_VEHICLE_FORM } from "@/lib/validation/vehicle";

export const metadata: Metadata = { title: "Add a vehicle" };

export default async function NewVehiclePage() {
  const { profile } = await requireStaff();
  return (
    <VehicleForm
      vehicle={null}
      values={EMPTY_VEHICLE_FORM}
      photos={[]}
      isAdmin={profile.role === "admin"}
    />
  );
}
