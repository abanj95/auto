import { VehicleCard } from "@/components/public/vehicle-card";
import type { VehicleCardData } from "@/lib/public-data";

/** 1 column on phones, 2 on tablets, 3 on desktop. */
export function VehicleGrid({
  vehicles,
  eagerCount = 0,
}: {
  vehicles: VehicleCardData[];
  eagerCount?: number;
}) {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {vehicles.map((v, i) => (
        <li key={v.id}>
          <VehicleCard vehicle={v} eager={i < eagerCount} />
        </li>
      ))}
    </ul>
  );
}
