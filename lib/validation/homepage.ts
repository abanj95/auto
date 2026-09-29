import { z } from "zod";

import { BRAND_IMAGE_KEYS } from "@/lib/site-images";

export const TEXT_POSITIONS = { left: "Left", center: "Center" } as const;
export const OVERLAYS = { none: "None", light: "Light", dark: "Dark" } as const;
export type TextPosition = keyof typeof TEXT_POSITIONS;
export type Overlay = keyof typeof OVERLAYS;

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use ${max} characters or fewer.`)
    .transform((v) => v || null);

/**
 * Date-time from the form. The browser sends ISO strings (converted from the
 * local <input type="datetime-local"> value before submit); empty → null.
 */
const dateTime = z.string().transform((raw, ctx) => {
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    ctx.addIssue({ code: "custom", message: "Enter a valid date and time." });
    return z.NEVER;
  }
  return date.toISOString();
});

/** A slides/ file in the site-images bucket, or a static file shipped with the site. */
const SLIDE_IMAGE = /^(slides\/[\w-]+\.(webp|jpg)|\/[\w./-]+)$/;

export const slideSchema = z
  .object({
    image_path: z.string().regex(SLIDE_IMAGE, "Add an image."),
    image_width: z.number().int().positive(),
    image_height: z.number().int().positive(),
    headline: text(100),
    subheadline: text(200),
    button_label: text(30),
    button_link: z
      .string()
      .trim()
      .max(300, "Use 300 characters or fewer.")
      .transform((v) => v || null)
      .refine(
        (v) => v === null || (/^\/([^/\\]|$)/.test(v) && !/\s/.test(v)),
        "Use a page on this site starting with /, e.g. /inventory?body=suv",
      ),
    text_position: z.enum(Object.keys(TEXT_POSITIONS) as [TextPosition, ...TextPosition[]]),
    overlay_strength: z.enum(Object.keys(OVERLAYS) as [Overlay, ...Overlay[]]),
    active: z.boolean(),
    starts_at: dateTime,
    ends_at: dateTime,
  })
  .superRefine((s, ctx) => {
    if (s.button_label && !s.button_link)
      ctx.addIssue({
        code: "custom",
        path: ["button_link"],
        message: "Add a link for the button.",
      });
    if (s.button_link && !s.button_label)
      ctx.addIssue({ code: "custom", path: ["button_label"], message: "Add the button text." });
    if (s.starts_at && s.ends_at && s.ends_at <= s.starts_at)
      ctx.addIssue({ code: "custom", path: ["ends_at"], message: "End must be after the start." });
  });
export type SlideFormValues = z.input<typeof slideSchema>;
export type SlideValues = z.output<typeof slideSchema>;

export const carouselSettingsSchema = z.object({
  hero_autoplay: z.boolean(),
  hero_interval_seconds: z.coerce
    .number()
    .int("Use whole seconds.")
    .min(3, "Use 3 to 20 seconds.")
    .max(20, "Use 3 to 20 seconds."),
});
export type CarouselSettingsValues = z.input<typeof carouselSettingsSchema>;

/** Brand image uploads: logos may be SVG; photos are compressed first. */
export const brandImageSchema = z.object({
  key: z.enum(BRAND_IMAGE_KEYS as [string, ...string[]]),
  path: z
    .string()
    .regex(
      /^(logos\/[\w-]+\.(png|svg|webp)|icons\/[\w-]+\.png|photos\/[\w-]+\.(webp|jpg))$/,
      "Unsupported image.",
    )
    .nullable(),
});
