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

/** "2019 Toyota Camry". Drafts may be missing parts; listed cars never are (DB check). */
export function vehicleTitle(v: {
  year: number | null;
  make: string | null;
  model: string | null;
}) {
  return [v.year, v.make, v.model].filter(Boolean).join(" ") || "Untitled vehicle";
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

const DAY_MS = 24 * 60 * 60 * 1000;

/** "Listed 12 days" / "Created today" for the staff vehicle list. */
export function listingAge(publishedAt: string | null, createdAt: string) {
  const since = new Date(publishedAt ?? createdAt).getTime();
  const days = Math.max(0, Math.floor((Date.now() - since) / DAY_MS));
  const span = days === 0 ? "today" : `${days} day${days === 1 ? "" : "s"}`;
  return publishedAt ? `Listed ${span}` : `Created ${days === 0 ? "today" : `${span} ago`}`;
}

/** "never" / "just now" / "3 hours ago" / "5 days ago" / "Mar 4, 2026". */
export function lastSeen(iso: string | null) {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60000);
  if (minutes < 2) return "just now";
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

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
