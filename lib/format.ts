import type { Enums } from "@/lib/database.types";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const num = new Intl.NumberFormat("en-US");

export function formatPrice(price: number | null) {
  return price == null ? "Call for price" : usd.format(price);
}

export function formatMileage(mileage: number | null) {
  return mileage == null ? null : `${num.format(mileage)} mi`;
}

export function vehicleTitle(v: { year: number; make: string; model: string }) {
  return `${v.year} ${v.make} ${v.model}`;
}

export const BODY_TYPE_LABELS: Record<Enums<"vehicle_body_type">, string> = {
  sedan: "Sedan",
  suv: "SUV",
  truck: "Truck",
  coupe: "Coupe",
  hatchback: "Hatchback",
  van: "Van",
  wagon: "Wagon",
  convertible: "Convertible",
  other: "Other",
};

export const DRIVETRAIN_LABELS: Record<Enums<"vehicle_drivetrain">, string> = {
  fwd: "FWD",
  rwd: "RWD",
  awd: "AWD",
  "4wd": "4WD",
};

export const TRANSMISSION_LABELS: Record<Enums<"vehicle_transmission">, string> = {
  automatic: "Automatic",
  manual: "Manual",
  cvt: "CVT",
};

export const FUEL_LABELS: Record<Enums<"vehicle_fuel_type">, string> = {
  gas: "Gas",
  diesel: "Diesel",
  hybrid: "Hybrid",
  electric: "Electric",
  other: "Other",
};

export const TITLE_STATUS_LABELS: Record<Enums<"vehicle_title_status">, string> = {
  clean: "Clean",
  rebuilt: "Rebuilt",
  salvage: "Salvage",
  other: "Other",
};

/** "(215) 618-2789" -> "+12156182789" for tel:/sms: links. */
export function phoneHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 ? `+1${digits}` : `+${digits}`;
}

/** sms: link with a prefilled body. "?&" works on both iOS and Android. */
export function smsHref(phone: string, body?: string) {
  const base = `sms:${phoneHref(phone)}`;
  return body ? `${base}?&body=${encodeURIComponent(body)}` : base;
}
