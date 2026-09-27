/**
 * DEVELOPMENT ONLY. Uploads placeholder images for the sample vehicles in
 * supabase/seed.sql, at the storage_path of each seeded vehicle_photos row.
 *
 *   pnpm db:seed-photos           upload (safe to re-run; overwrites)
 *   pnpm db:seed-photos --remove  delete the files (run before supabase/unseed.sql)
 *
 * Uses SUPABASE_SECRET_KEY from .env.local — a local script, never app code.
 */
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

import type { Database } from "../lib/database.types";

const BUCKET = "vehicle-photos";
const SEED_VEHICLE_IDS = [1, 2, 3, 4, 5, 6].map(
  (n) => `a0000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
);
const BACKGROUNDS = ["#334155", "#475569", "#1f2937", "#3f3f46", "#44403c", "#374151"];

async function main() {
  process.loadEnvFile(".env.local");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local");
  }

  const supabase = createClient<Database>(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: photos, error } = await supabase
    .from("vehicle_photos")
    .select(
      "storage_path, width, height, sort_order, vehicle_id, vehicles(year, make, model, trim)",
    )
    .in("vehicle_id", SEED_VEHICLE_IDS)
    .order("storage_path");
  if (error) throw error;
  if (photos.length === 0) {
    console.log("No seeded photo rows found. Run supabase/seed.sql first.");
    return;
  }

  if (process.argv.includes("--remove")) {
    const { error: removeError } = await supabase.storage
      .from(BUCKET)
      .remove(photos.map((p) => p.storage_path));
    if (removeError) throw removeError;
    console.log(`Removed ${photos.length} placeholder files.`);
    return;
  }

  for (const photo of photos) {
    const v = photo.vehicles;
    const title = v ? [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ") : "Vehicle";
    const width = photo.width ?? 1600;
    const height = photo.height ?? 1200;
    const background = BACKGROUNDS[SEED_VEHICLE_IDS.indexOf(photo.vehicle_id)] ?? "#374151";

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <rect width="100%" height="100%" fill="${background}"/>
        <text x="50%" y="46%" text-anchor="middle" fill="#ffffff" font-family="Helvetica, Arial, sans-serif"
          font-size="${Math.round(width / 18)}" font-weight="700">${escapeXml(title)}</text>
        <text x="50%" y="58%" text-anchor="middle" fill="#cbd5e1" font-family="Helvetica, Arial, sans-serif"
          font-size="${Math.round(width / 32)}">Sample photo ${photo.sort_order + 1}</text>
      </svg>`;
    const image = await sharp(Buffer.from(svg)).webp({ quality: 80 }).toBuffer();

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(photo.storage_path, image, { contentType: "image/webp", upsert: true });
    if (uploadError) throw uploadError;
    console.log(`Uploaded ${photo.storage_path}`);
  }
  console.log(`Done: ${photos.length} placeholder photos.`);
}

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
