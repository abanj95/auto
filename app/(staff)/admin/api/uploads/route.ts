import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import sharp, { type OutputInfo } from "sharp";
import { z } from "zod";

import { checkStaff } from "@/lib/auth";
import { sniffImageType } from "@/lib/security/image-check";
import { rateLimit } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { MAX_PHOTOS } from "@/lib/validation/vehicle";

/**
 * POST /admin/api/uploads?kind=…  (raw image bytes in the body)
 *
 * The only way images get into Storage (browsers have no write access):
 * staff only (admins for site images), same-origin, ≤ 4 MB, real JPEG/PNG/WebP
 * by magic bytes (no SVG), re-encoded with sharp (drops metadata and anything
 * hidden in the file), stored under a random name with the secret key.
 */

const MAX_BYTES = 4 * 1024 * 1024; // Under Vercel's 4.5 MB request limit.

type Output = { format: "webp" | "jpeg" | "png"; maxWidth: number; maxHeight: number };
const KINDS: Record<string, { folder: string; admin: boolean; output: Output }> = {
  vehicle: {
    folder: "",
    admin: false,
    output: { format: "webp", maxWidth: 1920, maxHeight: 1920 },
  },
  slide: {
    folder: "slides",
    admin: true,
    output: { format: "webp", maxWidth: 2400, maxHeight: 2400 },
  },
  photo: {
    folder: "photos",
    admin: true,
    output: { format: "webp", maxWidth: 2400, maxHeight: 2400 },
  },
  share: {
    folder: "photos",
    admin: true,
    output: { format: "jpeg", maxWidth: 1200, maxHeight: 1200 },
  },
  logo: { folder: "logos", admin: true, output: { format: "png", maxWidth: 1600, maxHeight: 800 } },
  icon: { folder: "icons", admin: true, output: { format: "png", maxWidth: 512, maxHeight: 512 } },
};

function reply(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(request: NextRequest) {
  // CSRF: cookies are SameSite=Lax, but also insist on a same-origin request.
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).host !== request.nextUrl.host) {
    return reply(403, "Bad origin.");
  }

  const kind = request.nextUrl.searchParams.get("kind") ?? "";
  const config = KINDS[kind];
  if (!config) return reply(400, "Unknown upload type.");

  const auth = await checkStaff(config.admin ? "admin" : undefined);
  if ("error" in auth)
    return reply(auth.error, "You don't have permission to upload. Sign in again.");
  const { staff } = auth;
  if (!(await rateLimit(`upload:user:${staff.userId}`, 200, 10 * 60))) {
    return reply(429, "Too many uploads. Wait a few minutes.");
  }

  const vehicleId = request.nextUrl.searchParams.get("vehicleId");
  const supabase = await createClient();
  if (kind === "vehicle") {
    if (!z.uuid().safeParse(vehicleId).success) return reply(400, "Vehicle not found.");
    // RLS: only visible to (and editable by) staff.
    const { data: vehicle } = await supabase
      .from("vehicles")
      .select("id, vehicle_photos(count)")
      .eq("id", vehicleId!)
      .maybeSingle();
    if (!vehicle) return reply(404, "Vehicle not found.");
    const count = (vehicle.vehicle_photos as unknown as { count: number }[])[0]?.count ?? 0;
    if (count >= MAX_PHOTOS) return reply(400, `A vehicle can have up to ${MAX_PHOTOS} photos.`);
  }

  // Read the body with a hard size limit.
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES) return reply(413, "Image is too large (max 4 MB).");
  const input = new Uint8Array(await request.arrayBuffer());
  if (input.byteLength > MAX_BYTES) return reply(413, "Image is too large (max 4 MB).");
  if (!sniffImageType(input)) {
    return reply(415, "Only JPEG, PNG or WebP images are allowed.");
  }

  let output: { data: Buffer; info: OutputInfo };
  try {
    let image = sharp(input, { limitInputPixels: 50_000_000, failOn: "error" })
      .rotate()
      .resize(config.output.maxWidth, config.output.maxHeight, {
        fit: "inside",
        withoutEnlargement: true,
      });
    image =
      config.output.format === "png"
        ? image.png({ compressionLevel: 9 })
        : config.output.format === "jpeg"
          ? image.jpeg({ quality: 85, mozjpeg: true })
          : image.webp({ quality: 80 });
    output = await image.toBuffer({ resolveWithObject: true });
  } catch {
    return reply(415, "That file isn't a readable image.");
  }

  const ext = config.output.format === "jpeg" ? "jpg" : config.output.format;
  const bucket = kind === "vehicle" ? "vehicle-photos" : "site-images";
  const folder = kind === "vehicle" ? vehicleId! : config.folder;
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from(bucket)
    .upload(path, output.data, { contentType: `image/${config.output.format}`, upsert: false });
  if (uploadError) {
    console.error("storage upload failed", uploadError.message);
    return reply(500, "Upload failed. Please try again.");
  }
  const size = { width: output.info.width, height: output.info.height };

  if (kind !== "vehicle") return NextResponse.json({ ok: true, path, ...size });

  // Record the photo as the signed-in user (RLS), after the others.
  const { data: last } = await supabase
    .from("vehicle_photos")
    .select("sort_order")
    .eq("vehicle_id", vehicleId!)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: photo, error } = await supabase
    .from("vehicle_photos")
    .insert({
      vehicle_id: vehicleId!,
      storage_path: path,
      sort_order: (last?.sort_order ?? -1) + 1,
      ...size,
    })
    .select("id, storage_path, sort_order, width, height, vehicles(slug)")
    .single();
  if (error) {
    await admin.storage.from(bucket).remove([path]);
    console.error("photo row insert failed", error.code);
    return reply(500, "That photo couldn't be saved. Please try again.");
  }
  revalidatePath("/");
  revalidatePath("/inventory");
  if (photo.vehicles?.slug) revalidatePath(`/inventory/${photo.vehicles.slug}`);
  return NextResponse.json({
    ok: true,
    id: photo.id,
    path: photo.storage_path,
    sortOrder: photo.sort_order,
    slug: photo.vehicles?.slug ?? null,
    ...size,
  });
}
