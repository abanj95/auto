import "server-only";

import { cache } from "react";

import type { Enums, Tables } from "@/lib/database.types";
import { createPublicClient } from "@/lib/supabase/public";
import { PAGE_SIZE, type InventoryFilters } from "@/lib/validation/inventory";
import { hoursSchema, type Hours } from "@/lib/validation/site-settings";

// All public reads go through here. RLS already hides drafts from the anon
// role; the status filters below narrow further (e.g. inventory hides sold).

const LISTED: Enums<"vehicle_status">[] = ["available", "pending"];
const BUCKET_PATH = "/storage/v1/object/public/vehicle-photos/";

export function photoUrl(storagePath: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}${BUCKET_PATH}${storagePath}`;
}

// ---------------------------------------------------------------- settings

export type SiteSettings = Omit<Tables<"site_settings">, "hours"> & { hours: Hours };

export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  const { data, error } = await createPublicClient().from("site_settings").select("*").single();
  if (error) throw error;
  const hours = hoursSchema.safeParse(data.hours);
  return { ...data, hours: hours.success ? hours.data : [] };
});

export function fullAddress(s: SiteSettings) {
  const cityLine = [s.city, [s.state, s.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return [s.address, cityLine].filter(Boolean).join(", ");
}

/** Maps link: the saved URL, else a search for the street address (if known). */
export function mapUrl(s: SiteSettings) {
  if (s.google_maps_url) return s.google_maps_url;
  if (!s.address) return null;
  const q = `${s.dealership_name}, ${fullAddress(s)}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

// ---------------------------------------------------------------- cards

const CARD_SELECT =
  "id, slug, year, make, model, trim, price, mileage, drivetrain, status, published_at, vehicle_photos(storage_path, width, height, sort_order)";

type CardRow = Pick<
  Tables<"vehicles">,
  | "id"
  | "slug"
  | "year"
  | "make"
  | "model"
  | "trim"
  | "price"
  | "mileage"
  | "drivetrain"
  | "status"
  | "published_at"
> & {
  vehicle_photos: Pick<
    Tables<"vehicle_photos">,
    "storage_path" | "width" | "height" | "sort_order"
  >[];
};

export type VehicleCardData = Omit<CardRow, "vehicle_photos"> & { coverUrl: string | null };

function toCard({ vehicle_photos, ...v }: CardRow): VehicleCardData {
  const cover = [...vehicle_photos].sort((a, b) => a.sort_order - b.sort_order)[0];
  return { ...v, coverUrl: cover ? photoUrl(cover.storage_path) : null };
}

function cardQuery() {
  // Only the cover photo (lowest sort_order) is fetched for cards.
  return createPublicClient()
    .from("vehicles")
    .select(CARD_SELECT, { count: "exact" })
    .order("sort_order", { referencedTable: "vehicle_photos" })
    .limit(1, { referencedTable: "vehicle_photos" });
}

export async function getFeaturedVehicles(limit = 6) {
  const { data, error } = await cardQuery()
    .in("status", LISTED)
    .eq("featured", true)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return (data as CardRow[]).map(toCard);
}

export async function getNewestVehicles(limit = 6) {
  const { data, error } = await cardQuery()
    .eq("status", "available")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return (data as CardRow[]).map(toCard);
}

/** Up to 4 available cars with the same body type or make. */
export async function getSimilarVehicles(v: {
  id: string;
  make: string | null;
  body_type: Enums<"vehicle_body_type"> | null;
}) {
  const quote = (s: string) => `"${s.replace(/["\\]/g, "\\$&")}"`;
  const or = [v.make && `make.eq.${quote(v.make)}`, v.body_type && `body_type.eq.${v.body_type}`]
    .filter(Boolean)
    .join(",");
  if (!or) return [];
  const { data, error } = await cardQuery()
    .eq("status", "available")
    .neq("id", v.id)
    .or(or)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(4);
  if (error) throw error;
  return (data as CardRow[]).map(toCard);
}

// ---------------------------------------------------------------- inventory

export async function searchInventory(f: InventoryFilters) {
  let q = cardQuery().in("status", LISTED);

  if (f.make) q = q.eq("make", f.make);
  if (f.make && f.model) q = q.eq("model", f.model);
  if (f.year_min) q = q.gte("year", f.year_min);
  if (f.year_max) q = q.lte("year", f.year_max);
  if (f.price_min) q = q.gte("price", f.price_min);
  if (f.price_max) q = q.lte("price", f.price_max);
  if (f.mileage_max) q = q.lte("mileage", f.mileage_max);
  if (f.body) q = q.eq("body_type", f.body);
  if (f.drivetrain) q = q.eq("drivetrain", f.drivetrain);
  if (f.fuel) q = q.eq("fuel_type", f.fuel);

  switch (f.sort) {
    case "price_asc":
      q = q.order("price", { ascending: true, nullsFirst: false });
      break;
    case "price_desc":
      q = q.order("price", { ascending: false, nullsFirst: false });
      break;
    case "mileage_asc":
      q = q.order("mileage", { ascending: true, nullsFirst: false });
      break;
    case "year_desc":
      q = q.order("year", { ascending: false });
      break;
    default:
      q = q.order("published_at", { ascending: false, nullsFirst: false });
  }
  // Stable order across pages.
  q = q.order("id");

  const from = (f.page - 1) * PAGE_SIZE;
  const { data, count, error } = await q.range(from, from + PAGE_SIZE - 1);
  // Asking for a page past the end returns a range error; treat as empty.
  if (error && error.code !== "PGRST103") throw error;
  return { vehicles: ((data ?? []) as CardRow[]).map(toCard), total: count ?? 0 };
}

/** Options for the filter dropdowns, built from listed cars only. */
export const getInventoryFacets = cache(async () => {
  const { data, error } = await createPublicClient()
    .from("vehicles")
    .select("make, model, year, body_type")
    .in("status", LISTED);
  if (error) throw error;

  const modelsByMake: Record<string, string[]> = {};
  const years = new Set<number>();
  const bodyCounts: Partial<Record<Enums<"vehicle_body_type">, number>> = {};
  for (const v of data) {
    // Listed cars always have these (DB check); the guard is for the types.
    if (!v.make || !v.model || !v.year) continue;
    const models = (modelsByMake[v.make] ??= []);
    if (!models.includes(v.model)) models.push(v.model);
    years.add(v.year);
    if (v.body_type) bodyCounts[v.body_type] = (bodyCounts[v.body_type] ?? 0) + 1;
  }
  const sortText = (a: string, b: string) => a.localeCompare(b);
  for (const models of Object.values(modelsByMake)) models.sort(sortText);

  return {
    makes: Object.keys(modelsByMake).sort(sortText),
    modelsByMake,
    years: [...years].sort((a, b) => b - a),
    bodyCounts,
  };
});

// ---------------------------------------------------------------- vehicle page

export const getVehicleBySlug = cache(async (slug: string) => {
  const { data, error } = await createPublicClient()
    .from("vehicles")
    .select("*, vehicle_photos(id, storage_path, width, height, sort_order)")
    .eq("slug", slug)
    .order("sort_order", { referencedTable: "vehicle_photos" })
    .maybeSingle();
  if (error) throw error;
  if (!data) return null; // Missing, or a draft (RLS hides drafts).

  const { vehicle_photos, ...vehicle } = data;
  const photos = vehicle_photos.map((p) => ({
    id: p.id,
    src: photoUrl(p.storage_path),
    width: p.width ?? 1600,
    height: p.height ?? 1200,
  }));
  return { ...vehicle, photos };
});
export type VehicleDetail = NonNullable<Awaited<ReturnType<typeof getVehicleBySlug>>>;
