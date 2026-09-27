import "server-only";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { daysAgoIso, SOLD_RETENTION_DAYS } from "@/lib/sold-retention";

const BUCKET = "vehicle-photos";

/**
 * Delete sold vehicles older than the retention period: photo files first,
 * then the rows (photo rows cascade). Trusted server job — uses the secret key.
 */
export async function purgeSoldVehicles() {
  const admin = createAdminClient();
  const cutoff = daysAgoIso(SOLD_RETENTION_DAYS);

  const { data: vehicles, error } = await admin
    .from("vehicles")
    .select("id, slug, stock_no, vehicle_photos(storage_path)")
    .eq("status", "sold")
    .lt("sold_at", cutoff)
    .limit(200);
  if (error) throw error;
  if (!vehicles.length) return { deleted: 0, photos: 0, stockNos: [] as string[] };

  const paths = vehicles.flatMap((v) => v.vehicle_photos.map((p) => p.storage_path));
  for (let i = 0; i < paths.length; i += 500) {
    const { error: storageError } = await admin.storage
      .from(BUCKET)
      .remove(paths.slice(i, i + 500));
    if (storageError) throw storageError;
  }

  const { error: deleteError } = await admin
    .from("vehicles")
    .delete()
    .in(
      "id",
      vehicles.map((v) => v.id),
    );
  if (deleteError) throw deleteError;

  revalidatePath("/");
  revalidatePath("/inventory");
  for (const v of vehicles) revalidatePath(`/inventory/${v.slug}`);
  revalidatePath("/admin/vehicles");

  return {
    deleted: vehicles.length,
    photos: paths.length,
    stockNos: vehicles.map((v) => v.stock_no),
  };
}
