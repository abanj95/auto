import { z } from "zod";

import { Constants } from "@/lib/database.types";

export const PAGE_SIZE = 24;

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
