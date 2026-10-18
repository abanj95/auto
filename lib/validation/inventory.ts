import { z } from "zod";

import { Constants } from "@/lib/database.types";

export const PER_PAGE_OPTIONS = [12, 24, 48] as const;
export const DEFAULT_PER_PAGE = 24;
export const VIEWS = ["list", "grid"] as const;
export type View = (typeof VIEWS)[number];

export const SORTS = {
  newest: "Newest",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
  mileage_asc: "Mileage: low to high",
  year_desc: "Year: newest first",
} as const;
export type Sort = keyof typeof SORTS;

// Search params can repeat (?a=1&a=2); use the first. Bad values are dropped, never errors.
const first = (v: unknown) => (Array.isArray(v) ? v[0] : v);
const text = z.preprocess(first, z.string().trim().min(1).max(60).optional()).catch(undefined);
const int = z
  .preprocess(first, z.coerce.number().int().positive().max(10_000_000).optional())
  .catch(undefined);
const oneOf = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(first, z.enum(values).optional()).catch(undefined);

export const inventoryFiltersSchema = z.object({
  make: text,
  model: text,
  year_min: int,
  year_max: int,
  price_min: int,
  price_max: int,
  mileage_max: int,
  body: oneOf(Constants.public.Enums.vehicle_body_type),
  drivetrain: oneOf(Constants.public.Enums.vehicle_drivetrain),
  fuel: oneOf(Constants.public.Enums.vehicle_fuel_type),
  sort: z.preprocess(first, z.enum(Object.keys(SORTS) as [Sort, ...Sort[]])).catch("newest"),
  page: z.preprocess(first, z.coerce.number().int().min(1).max(1000)).catch(1),
  per_page: z
    .preprocess(first, z.coerce.number().pipe(z.literal(PER_PAGE_OPTIONS)))
    .catch(DEFAULT_PER_PAGE),
  /** undefined = the default view (and the browser may restore a saved choice). */
  view: oneOf(VIEWS),
});
export type InventoryFilters = z.infer<typeof inventoryFiltersSchema>;

/** Filter keys that count as "a filter is applied" (not sort/page). */
export const FILTER_KEYS = [
  "make",
  "model",
  "year_min",
  "year_max",
  "price_min",
  "price_max",
  "mileage_max",
  "body",
  "drivetrain",
  "fuel",
] as const;

export const PRICE_STEPS = [5000, 10000, 15000, 20000, 25000, 30000, 40000, 50000, 75000];
export const MILEAGE_STEPS = [25000, 50000, 75000, 100000, 125000, 150000, 200000];

/**
 * /inventory URL for these filters with some values changed. Defaults (newest,
 * 24 per page, page 1, no view) are left out so URLs stay short.
 */
export function inventoryHref(
  f: InventoryFilters,
  changes: Partial<Record<keyof InventoryFilters, string | number | undefined>> = {},
) {
  const merged: Record<string, unknown> = { ...f, ...changes };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value === undefined || value === "") continue;
    if (key === "sort" && value === "newest") continue;
    if (key === "page" && Number(value) === 1) continue;
    if (key === "per_page" && Number(value) === DEFAULT_PER_PAGE) continue;
    params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `/inventory?${query}` : "/inventory";
}
