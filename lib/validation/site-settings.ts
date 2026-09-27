import { z } from "zod";

// ------------------------------------------------------------------ hours

export const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Day = (typeof DAYS)[number];
export const DAY_NAMES: Record<Day, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};
const DAY_SHORT: Record<Day, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** site_settings.hours: one entry per weekday, Monday first. */
export const hoursSchema = z
  .array(
    z
      .object({
        day: z.enum(DAYS),
        closed: z.boolean(),
        open: z.string(),
        close: z.string(),
      })
      .superRefine((d, ctx) => {
        if (d.closed) return;
        if (!TIME.test(d.open))
          ctx.addIssue({ code: "custom", path: ["open"], message: "Pick an opening time." });
        if (!TIME.test(d.close))
          ctx.addIssue({ code: "custom", path: ["close"], message: "Pick a closing time." });
        if (TIME.test(d.open) && TIME.test(d.close) && d.close <= d.open) {
          ctx.addIssue({
            code: "custom",
            path: ["close"],
            message: "Closing time must be after opening.",
          });
        }
      }),
  )
  .length(7)
  .refine((rows) => rows.every((r, i) => r.day === DAYS[i]), "Hours must list Monday to Sunday.");
export type Hours = z.infer<typeof hoursSchema>;

export const DEFAULT_HOURS: Hours = DAYS.map((day) => ({
  day,
  closed: day === "sun",
  open: day === "sat" ? "10:00" : "09:00",
  close: day === "sat" ? "16:00" : "18:00",
}));

function to12h(time: string) {
  const [h, m] = time.split(":").map(Number);
  const suffix = h < 12 ? "AM" : "PM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** Group matching consecutive days: [{ days: "Mon–Fri", hours: "9:00 AM – 6:00 PM" }, …]. */
export function formatHours(hours: Hours): { days: string; hours: string }[] {
  const rows: { from: Day; to: Day; hours: string }[] = [];
  for (const d of hours) {
    const text = d.closed ? "Closed" : `${to12h(d.open)} – ${to12h(d.close)}`;
    const last = rows.at(-1);
    if (last && last.hours === text) last.to = d.day;
    else rows.push({ from: d.day, to: d.day, hours: text });
  }
  return rows.map((r) => ({
    days: r.from === r.to ? DAY_SHORT[r.from] : `${DAY_SHORT[r.from]}–${DAY_SHORT[r.to]}`,
    hours: r.hours,
  }));
}

// ------------------------------------------------------------------ settings form

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use ${max} characters or fewer.`)
    .transform((v) => v || null);

/** US phone: any formatting in, "(215) 618-2789" out. Empty → null. */
const phone = z.string().transform((raw, ctx) => {
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  if (digits.length !== 10) {
    ctx.addIssue({ code: "custom", message: "Enter a 10-digit phone number." });
    return z.NEVER;
  }
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
});

/** https URL on one of the allowed hosts. Empty → null. */
const linkTo = (hosts: RegExp, message: string) =>
  z.string().transform((raw, ctx) => {
    const value = raw.trim();
    if (!value) return null;
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" || !hosts.test(url.hostname + url.pathname)) throw new Error();
      return url.toString();
    } catch {
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    }
  });

export const siteSettingsSchema = z.object({
  dealership_name: z.string().trim().min(1, "Enter the dealership name.").max(80),
  phone,
  sms_phone: phone,
  email: z
    .string()
    .trim()
    .transform((v) => v || null)
    .pipe(z.email("Enter a valid email address.").nullable()),
  address: optional(120),
  city: optional(60),
  state: z
    .string()
    .trim()
    .toUpperCase()
    .transform((v) => v || null)
    .refine((v) => v === null || /^[A-Z]{2}$/.test(v), "Use the 2-letter state code, e.g. PA."),
  zip: z
    .string()
    .trim()
    .transform((v) => v || null)
    .refine((v) => v === null || /^\d{5}(-\d{4})?$/.test(v), "Enter a 5-digit ZIP code."),
  hours: hoursSchema,
  about_text: optional(4000),
  price_disclaimer: z.string().trim().min(1, "Enter a price disclaimer.").max(300),
  facebook_url: linkTo(
    /^(www\.|m\.)?(facebook|fb)\.com\//,
    "Paste the full Facebook page link, e.g. https://www.facebook.com/mcrowinauto",
  ),
  google_maps_url: linkTo(
    /^((www\.)?google\.[a-z.]+\/maps|maps\.google\.[a-z.]+\/|maps\.app\.goo\.gl\/|goo\.gl\/maps)/,
    "Paste a Google Maps link (https://maps.app.goo.gl/… or https://www.google.com/maps/…).",
  ),
});
export type SiteSettingsFormValues = z.input<typeof siteSettingsSchema>;
