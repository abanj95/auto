"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireStaff } from "@/lib/auth";
import { Constants, type Enums, type TablesInsert } from "@/lib/database.types";
import { audit } from "@/lib/security/audit";
import { createClient } from "@/lib/supabase/server";
import {
  MAX_PHOTOS,
  normalizeVin,
  vehicleDraftSchema,
  vehiclePublishSchema,
  type VehicleFormValues,
} from "@/lib/validation/vehicle";

// Every action checks the user itself (requireStaff/requireAdmin); RLS in the
// database is the final guard. Errors are returned as plain-English messages.

export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Partial<Record<keyof VehicleFormValues, string>> };

export type SavedVehicle = {
  id: string;
  status: Enums<"vehicle_status">;
  slug: string;
  stock_no: string;
};

const BUCKET = "vehicle-photos";
const uuid = z.uuid();
const SAVED_COLUMNS = "id, status, slug, stock_no";

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

function dbError(error: PostgrestError): { ok: false; error: string } {
  if (error.code === "23505" && error.message.includes("vin")) {
    return fail("Another vehicle already uses this VIN.");
  }
  if (error.code === "23514" && error.message.includes("listed_requires_details")) {
    return fail("Add the VIN, year, make, model, price and mileage before publishing.");
  }
  if (error.code === "42501") return fail("You don't have permission to do that.");
  console.error("vehicle action failed", error);
  return fail("Something went wrong saving. Please try again.");
}

/** Refresh the public pages (and the staff list) after any change. */
function revalidateVehicle(slug?: string | null) {
  revalidatePath("/");
  revalidatePath("/inventory");
  if (slug) revalidatePath(`/inventory/${slug}`);
  revalidatePath("/admin/vehicles");
}

async function photoCount(supabase: Awaited<ReturnType<typeof createClient>>, vehicleId: string) {
  const { count } = await supabase
    .from("vehicle_photos")
    .select("id", { count: "exact", head: true })
    .eq("vehicle_id", vehicleId);
  return count ?? 0;
}

const NEEDS_PHOTO = "Add at least one photo before publishing.";

// ------------------------------------------------------------------ save

/**
 * Create or update a vehicle.
 * - intent "draft": save without publishing (formats checked only).
 * - intent "publish": require the listing fields + a photo, set status available.
 * - intent "save": save a listed car (listing fields stay required).
 */
export async function saveVehicle(input: {
  id: string | null;
  values: VehicleFormValues;
  intent: "draft" | "publish" | "save";
}): Promise<ActionResult<SavedVehicle>> {
  const staff = await requireStaff();
  const supabase = await createClient();
  const isAdmin = staff.profile.role === "admin";

  let current: (SavedVehicle & { price: number | null }) | null = null;
  if (input.id) {
    if (!uuid.safeParse(input.id).success) return fail("Vehicle not found.");
    const { data } = await supabase
      .from("vehicles")
      .select(`${SAVED_COLUMNS}, price`)
      .eq("id", input.id)
      .maybeSingle();
    if (!data) return fail("Vehicle not found. It may have been deleted.");
    current = data;
  }

  const listed = current !== null && current.status !== "draft";
  const strict = input.intent === "publish" || listed;
  const parsed = (strict ? vehiclePublishSchema : vehicleDraftSchema).safeParse(input.values);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof VehicleFormValues, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof VehicleFormValues;
      fieldErrors[key] ??= issue.message;
    }
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
  }

  const { featured, ...fields } = parsed.data;
  const row: TablesInsert<"vehicles"> = { ...fields };
  if (isAdmin) row.featured = featured; // Posters can't change featured (also enforced in the DB).

  if (input.intent === "publish" && !listed) {
    if (!current || (await photoCount(supabase, current.id)) === 0) return fail(NEEDS_PHOTO);
    row.status = "available";
  }

  const query = current
    ? supabase.from("vehicles").update(row).eq("id", current.id)
    : supabase.from("vehicles").insert(row);
  const { data, error } = await query.select(SAVED_COLUMNS).single();
  if (error) return dbError(error);

  const target = { userId: staff.userId, targetType: "vehicle", targetId: data.id };
  const label = { stock_no: data.stock_no };
  if (!current) await audit({ action: "vehicle_created", ...target, details: label });
  if (row.status === "available") {
    await audit({ action: "vehicle_published", ...target, details: label });
  }
  if (current && "price" in row && row.price !== current.price) {
    await audit({
      action: "vehicle_price_changed",
      ...target,
      details: { ...label, old: current.price, new: row.price ?? null },
    });
  }

  revalidateVehicle(data.slug);
  return { ok: true, data };
}

/** Empty draft, so photos can be uploaded before any details are entered. */
export async function createDraft(): Promise<ActionResult<SavedVehicle>> {
  const staff = await requireStaff();
  const supabase = await createClient();
  const { data, error } = await supabase.from("vehicles").insert({}).select(SAVED_COLUMNS).single();
  if (error) return dbError(error);
  await audit({
    action: "vehicle_created",
    userId: staff.userId,
    targetType: "vehicle",
    targetId: data.id,
    details: { stock_no: data.stock_no, draft: true },
  });
  revalidatePath("/admin/vehicles");
  return { ok: true, data };
}

// ------------------------------------------------------------------ status / delete

export async function setVehicleStatus(
  id: string,
  status: Enums<"vehicle_status">,
): Promise<ActionResult<SavedVehicle>> {
  const staff = await requireStaff();
  if (!uuid.safeParse(id).success) return fail("Vehicle not found.");
  if (!z.enum(Constants.public.Enums.vehicle_status).safeParse(status).success) {
    return fail("Unknown status.");
  }
  const supabase = await createClient();

  if (status !== "draft" && (await photoCount(supabase, id)) === 0) return fail(NEEDS_PHOTO);

  const { data: before } = await supabase
    .from("vehicles")
    .select("status")
    .eq("id", id)
    .maybeSingle();
  const { data, error } = await supabase
    .from("vehicles")
    .update({ status })
    .eq("id", id)
    .select(SAVED_COLUMNS)
    .single();
  if (error) return dbError(error);
  await audit({
    action: "vehicle_status_changed",
    userId: staff.userId,
    targetType: "vehicle",
    targetId: id,
    details: { stock_no: data.stock_no, from: before?.status ?? null, to: status },
  });
  revalidateVehicle(data.slug);
  return { ok: true, data };
}

/** Any active staff member. Deletes the photo files first (the row delete cascades photo rows only). */
export async function deleteVehicle(id: string): Promise<ActionResult> {
  const staff = await requireStaff();
  if (!uuid.safeParse(id).success) return fail("Vehicle not found.");
  const supabase = await createClient();

  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("slug, stock_no, year, make, model, price, status, vehicle_photos(storage_path)")
    .eq("id", id)
    .maybeSingle();
  if (!vehicle) return fail("Vehicle not found. It may already be deleted.");

  const paths = vehicle.vehicle_photos.map((p) => p.storage_path);
  if (paths.length) {
    const { error: storageError } = await supabase.storage.from(BUCKET).remove(paths);
    if (storageError) return fail("Couldn't delete the photos. Please try again.");
  }

  const { error } = await supabase.from("vehicles").delete().eq("id", id);
  if (error) return dbError(error);
  await audit({
    action: "vehicle_deleted",
    userId: staff.userId,
    targetType: "vehicle",
    targetId: id,
    details: {
      stock_no: vehicle.stock_no,
      title: [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" "),
      price: vehicle.price,
      status: vehicle.status,
    },
  });
  revalidateVehicle(vehicle.slug);
  return { ok: true, data: null };
}

/** Another vehicle with this VIN, if any (for a warning on the form). */
export async function findVinDuplicate(
  vin: string,
  excludeId: string | null,
): Promise<{ id: string; stock_no: string; label: string } | null> {
  await requireStaff();
  const normalized = normalizeVin(vin);
  if (normalized.length !== 17) return null;
  const supabase = await createClient();
  let query = supabase
    .from("vehicles")
    .select("id, stock_no, year, make, model")
    .eq("vin", normalized);
  if (excludeId && uuid.safeParse(excludeId).success) query = query.neq("id", excludeId);
  const { data } = await query.maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    stock_no: data.stock_no,
    label: [data.year, data.make, data.model].filter(Boolean).join(" ") || "Untitled draft",
  };
}

// ------------------------------------------------------------------ photos

// Photos are uploaded (and recorded) by POST /admin/api/uploads?kind=vehicle.

export async function deletePhoto(photoId: string): Promise<ActionResult> {
  await requireStaff();
  if (!uuid.safeParse(photoId).success) return fail("Photo not found.");
  const supabase = await createClient();

  const { data: photo } = await supabase
    .from("vehicle_photos")
    .select("storage_path, vehicle_id, vehicles(status, slug)")
    .eq("id", photoId)
    .maybeSingle();
  if (!photo) return { ok: true, data: null }; // Already gone.

  const listed = photo.vehicles && photo.vehicles.status !== "draft";
  if (listed && (await photoCount(supabase, photo.vehicle_id)) <= 1) {
    return fail("A listed vehicle needs at least one photo. Add another photo first.");
  }

  const { error: storageError } = await supabase.storage.from(BUCKET).remove([photo.storage_path]);
  if (storageError) return fail("Couldn't delete the photo. Please try again.");
  const { error } = await supabase.from("vehicle_photos").delete().eq("id", photoId);
  if (error) return dbError(error);

  revalidateVehicle(photo.vehicles?.slug);
  return { ok: true, data: null };
}

/** Save the photo order shown on screen (first = cover). */
export async function reorderPhotos(
  vehicleId: string,
  orderedIds: string[],
): Promise<ActionResult> {
  await requireStaff();
  if (
    !uuid.safeParse(vehicleId).success ||
    !z.array(uuid).max(MAX_PHOTOS).safeParse(orderedIds).success
  ) {
    return fail("Couldn't save the photo order.");
  }
  const supabase = await createClient();

  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from("vehicle_photos")
        .update({ sort_order: index })
        .eq("id", id)
        .eq("vehicle_id", vehicleId),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return dbError(failed.error);

  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("slug")
    .eq("id", vehicleId)
    .maybeSingle();
  revalidateVehicle(vehicle?.slug);
  return { ok: true, data: null };
}
