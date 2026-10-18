import { z } from "zod";

import { Constants, type Enums } from "@/lib/database.types";

// Vehicle Finder form. Every field is a string in the form (native inputs and
// selects); the schema turns them into the values stored in vehicle_requests.

export const COMMON_MAKES = [
  "Acura",
  "Audi",
  "BMW",
  "Buick",
  "Cadillac",
  "Chevrolet",
  "Chrysler",
  "Dodge",
  "Ford",
  "GMC",
  "Honda",
  "Hyundai",
  "Infiniti",
  "Jeep",
  "Kia",
  "Land Rover",
  "Lexus",
  "Lincoln",
  "Mazda",
  "Mercedes-Benz",
  "Mitsubishi",
  "Nissan",
  "Ram",
  "Subaru",
  "Tesla",
  "Toyota",
  "Volkswagen",
  "Volvo",
] as const;

export const BEST_TIMES = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  any: "Any time",
} as const;
export const CONTACT_METHODS = { call: "Call", text: "Text", email: "Email" } as const;
/** "" = any mileage. */
export const MAX_MILEAGE_OPTIONS = [30000, 60000, 90000, 120000] as const;

export const REQUEST_STATUSES = Constants.public.Enums.vehicle_request_status;
export type RequestStatus = Enums<"vehicle_request_status">;
export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  new: "New",
  contacted: "Contacted",
  found: "Found",
  closed: "Closed",
};

export const NOTES_MAX = 1000;
const THIS_YEAR = new Date().getFullYear();

const required = (label: string, max: number) =>
  z.string().trim().min(1, `Enter your ${label}.`).max(max, `Use ${max} characters or fewer.`);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use ${max} characters or fewer.`)
    .transform((v) => v || null);

/** US phone: any formatting in, "(215) 618-2789" out. */
const phone = (requiredMessage?: string) =>
  z.string().transform((raw, ctx) => {
    let digits = raw.replace(/\D/g, "");
    if (!digits) {
      if (requiredMessage) {
        ctx.addIssue({ code: "custom", message: requiredMessage });
        return z.NEVER;
      }
      return null;
    }
    if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
    if (digits.length !== 10) {
      ctx.addIssue({ code: "custom", message: "Enter a 10-digit phone number." });
      return z.NEVER;
    }
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  });

/** Whole dollars / years from a text or select value; "" → null. */
const wholeNumber = (min: number, max: number, message: string) =>
  z.string().transform((raw, ctx) => {
    const value = raw.replace(/[$,\s]/g, "");
    if (!value) return null;
    const n = Number(value);
    if (!Number.isInteger(n) || n < min || n > max) {
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    }
    return n;
  });

const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.union([z.literal(""), z.enum(values)]).transform((v) => (v === "" ? null : (v as T[number])));

export const vehicleRequestSchema = z
  .object({
    first_name: required("first name", 60),
    last_name: required("last name", 60),
    phone: phone("Enter your phone number.").pipe(z.string()),
    email: z.string().trim().max(254).pipe(z.email("Enter a valid email address.")),
    phone2: phone(),
    best_time: optionalEnum(Object.keys(BEST_TIMES) as [keyof typeof BEST_TIMES]),
    preferred_contact: optionalEnum(Object.keys(CONTACT_METHODS) as [keyof typeof CONTACT_METHODS]),
    year_from: wholeNumber(1950, THIS_YEAR + 1, "Pick a year."),
    year_to: wholeNumber(1950, THIS_YEAR + 1, "Pick a year."),
    make: optionalText(40),
    model: optionalText(60),
    engine: optionalText(60),
    max_mileage: wholeNumber(1, 1_000_000, "Pick a mileage."),
    budget_min: wholeNumber(0, 10_000_000, "Enter a whole dollar amount."),
    budget_max: wholeNumber(0, 10_000_000, "Enter a whole dollar amount."),
    body_type: optionalEnum(Constants.public.Enums.vehicle_body_type),
    notes: optionalText(NOTES_MAX),
    consent: z.boolean().refine((v) => v, "Please agree so we can contact you."),
  })
  .superRefine((v, ctx) => {
    if (v.year_from && v.year_to && v.year_from > v.year_to)
      ctx.addIssue({ code: "custom", path: ["year_to"], message: "Must be after “year from”." });
    if (v.budget_min !== null && v.budget_max !== null && v.budget_min > v.budget_max)
      ctx.addIssue({
        code: "custom",
        path: ["budget_max"],
        message: "Must be more than the minimum.",
      });
  });

export type VehicleRequestFormValues = z.input<typeof vehicleRequestSchema>;
export type VehicleRequestInput = z.output<typeof vehicleRequestSchema>;

export const EMPTY_VEHICLE_REQUEST: VehicleRequestFormValues = {
  first_name: "",
  last_name: "",
  phone: "",
  email: "",
  phone2: "",
  best_time: "",
  preferred_contact: "",
  year_from: "",
  year_to: "",
  make: "",
  model: "",
  engine: "",
  max_mileage: "",
  budget_min: "",
  budget_max: "",
  body_type: "",
  notes: "",
  consent: false,
};

// ------------------------------------------------------------------ admin

/** "2018–2022 Toyota RAV4", "Any Honda", "Any vehicle". */
export function requestTitle(r: {
  year_from: number | null;
  year_to: number | null;
  make: string | null;
  model: string | null;
}) {
  const years =
    r.year_from && r.year_to
      ? r.year_from === r.year_to
        ? `${r.year_from}`
        : `${r.year_from}–${r.year_to}`
      : r.year_from
        ? `${r.year_from}+`
        : r.year_to
          ? `Up to ${r.year_to}`
          : "Any";
  return `${years} ${[r.make, r.model].filter(Boolean).join(" ") || "vehicle"}`;
}

export const requestStatusSchema = z.enum(REQUEST_STATUSES);
export const adminNotesSchema = z
  .string()
  .trim()
  .max(4000, "Use 4000 characters or fewer.")
  .transform((v) => v || null);
