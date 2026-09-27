import { z } from "zod";

import { Constants } from "@/lib/database.types";

export const MAX_PHOTOS = 40;
export const DESCRIPTION_MAX = 4000;
const MAX_YEAR = new Date().getFullYear() + 2;

/**
 * Uppercase, drop spaces/dashes, and fix letters VINs never use
 * (O→0, Q→0, I→1). No check-digit validation (by decision).
 */
export function normalizeVin(raw: string) {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/[OQ]/g, "0")
    .replace(/I/g, "1");
}

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use ${max} characters or fewer.`)
    .transform((v) => v || null);

/** Form number fields are strings ("19,995"); empty → null. */
const wholeNumber = (min: number, max: number, message: string) =>
  z.string().transform((raw, ctx) => {
    const digits = raw.replace(/[$,\s]/g, "");
    if (!digits) return null;
    const n = Number(digits);
    if (!Number.isInteger(n) || n < min || n > max) {
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    }
    return n;
  });

/** <select> with an empty "Not set" option. */
const choice = <T extends readonly [string, ...string[]]>(values: T) =>
  z.union([z.literal(""), z.enum(values)]).transform((v) => (v === "" ? null : v));

const E = Constants.public.Enums;

/** Saving a draft: formats are checked, nothing is required. */
export const vehicleDraftSchema = z.object({
  vin: z
    .string()
    .transform(normalizeVin)
    .refine((v) => v === "" || v.length === 17, "A VIN has 17 letters and numbers.")
    .transform((v) => v || null),
  year: wholeNumber(1900, MAX_YEAR, `Enter a year between 1900 and ${MAX_YEAR}.`),
  make: text(40),
  model: text(60),
  trim: text(60),
  body_type: choice(E.vehicle_body_type),
  mileage: wholeNumber(0, 2_000_000, "Enter the mileage in miles."),
  price: wholeNumber(0, 10_000_000, "Enter the price in whole dollars."),
  exterior_color: text(40),
  interior_color: text(40),
  engine: text(80),
  transmission: choice(E.vehicle_transmission),
  drivetrain: choice(E.vehicle_drivetrain),
  fuel_type: choice(E.vehicle_fuel_type),
  title_status: choice(E.vehicle_title_status),
  features: z.array(z.string().trim().min(1).max(60)).max(80),
  description: text(DESCRIPTION_MAX),
  featured: z.boolean(),
});

const REQUIRED_TO_PUBLISH = ["vin", "year", "make", "model", "price", "mileage"] as const;

/** Publishing (or saving a listed car): the fields buyers rely on are required. */
export const vehiclePublishSchema = vehicleDraftSchema.superRefine((v, ctx) => {
  for (const key of REQUIRED_TO_PUBLISH) {
    if (v[key] == null)
      ctx.addIssue({ code: "custom", path: [key], message: "Required to publish." });
  }
});

export type VehicleFormValues = z.input<typeof vehicleDraftSchema>;
export type VehicleData = z.output<typeof vehicleDraftSchema>;

export const EMPTY_VEHICLE_FORM: VehicleFormValues = {
  vin: "",
  year: "",
  make: "",
  model: "",
  trim: "",
  body_type: "",
  mileage: "",
  price: "",
  exterior_color: "",
  interior_color: "",
  engine: "",
  transmission: "",
  drivetrain: "",
  fuel_type: "",
  title_status: "",
  features: [],
  description: "",
  featured: false,
};

/** "19995" → "19,995" for display while typing. */
export function groupDigits(raw: string) {
  const digits = raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  return digits ? Number(digits).toLocaleString("en-US") : "";
}
