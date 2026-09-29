/**
 * Shared by scripts/seed-demo.ts and scripts/remove-demo.ts. Local scripts
 * only: they use SUPABASE_SECRET_KEY, which bypasses RLS. Never import from
 * app code (ESLint blocks it).
 */
import { createClient } from "@supabase/supabase-js";

import type { Database } from "../lib/database.types";

export type Admin = ReturnType<typeof adminClient>;

export function adminClient() {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // Fine if the variables come from the shell instead.
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.");
  console.log(`Supabase project: ${url}`);
  return createClient<Database>(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Delete every is_demo vehicle: storage files first, then the row (photo rows cascade). */
export async function removeDemoVehicles(supabase: Admin) {
  const { data: vehicles, error } = await supabase
    .from("vehicles")
    .select("id, stock_no, year, make, model, vehicle_photos(storage_path)")
    .eq("is_demo", true);
  if (error) throw error;

  for (const v of vehicles) {
    const paths = v.vehicle_photos.map((p) => p.storage_path);
    if (paths.length) {
      const { error: storageError } = await supabase.storage.from("vehicle-photos").remove(paths);
      if (storageError) throw storageError;
    }
    const { error: deleteError } = await supabase.from("vehicles").delete().eq("id", v.id);
    if (deleteError) throw deleteError;
    console.log(`Removed ${v.stock_no} ${v.year} ${v.make} ${v.model} (${paths.length} photos)`);
  }
  return vehicles.length;
}
