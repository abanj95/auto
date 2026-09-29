import type { Tables } from "@/lib/database.types";
import { MIN_SLIDE_WIDTH } from "@/lib/site-images";

export type SlideStatus = "live" | "hidden" | "scheduled" | "ended";

export type AdminSlide = Tables<"hero_slides"> & { src: string; status: SlideStatus };

/** Editor warning for small or portrait slide images, or null. */
export function slideImageWarning(width: number, height: number) {
  if (width <= height) {
    return "This image isn't landscape. Most of it will be cropped on wide screens.";
  }
  if (width < MIN_SLIDE_WIDTH) {
    return `This image is only ${width}px wide and may look blurry on large screens. Use one at least ${MIN_SLIDE_WIDTH}px wide.`;
  }
  return null;
}

/** Where a slide stands right now (the public site shows only "live" ones). */
export function slideStatus(
  slide: Pick<Tables<"hero_slides">, "active" | "starts_at" | "ends_at">,
): SlideStatus {
  const now = Date.now();
  if (!slide.active) return "hidden";
  if (slide.starts_at && Date.parse(slide.starts_at) > now) return "scheduled";
  if (slide.ends_at && Date.parse(slide.ends_at) <= now) return "ended";
  return "live";
}
