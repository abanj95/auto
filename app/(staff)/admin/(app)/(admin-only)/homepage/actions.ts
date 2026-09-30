"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/security/audit";
import type { TablesUpdate } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";
import {
  BRAND_IMAGE_KEYS,
  BRAND_IMAGES,
  isStaticImage,
  SITE_BUCKET,
  type BrandImageKey,
} from "@/lib/site-images";
import {
  brandImageSchema,
  carouselSettingsSchema,
  slideSchema,
  type CarouselSettingsValues,
  type SlideFormValues,
} from "@/lib/validation/homepage";

// Admin only: every action calls requireAdmin(); RLS is the final guard.

export type HomepageResult =
  { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

type Supabase = Awaited<ReturnType<typeof createClient>>;

const uuid = z.uuid();
const BRAND_COLUMNS =
  "logo_path, logo_dark_path, favicon_path, about_image_path, og_default_image_path";
const MAX_SLIDES = 20;

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

function dbError(error: PostgrestError) {
  if (error.code === "42501") return fail("You don't have permission to do that.");
  console.error("homepage action failed", error);
  return fail("Something went wrong saving. Please try again.");
}

function zodFail(error: z.ZodError): HomepageResult {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) fieldErrors[issue.path.join(".")] ??= issue.message;
  return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
}

/** The hero, logo, favicon and share image appear on every page. */
function revalidateSite() {
  revalidatePath("/", "layout");
}

function logChange(
  userId: string,
  change: string,
  details: Record<string, string | number | boolean | null> = {},
) {
  return audit({
    action: "homepage_changed",
    userId,
    targetType: "homepage",
    details: { change, ...details },
  });
}

/**
 * Delete storage files that no slide or setting uses any more. Static files
 * ("/hero.jpg") are part of the site and never deleted. Best effort: a
 * leftover file is harmless, so failures are only logged.
 */
async function removeUnusedFiles(supabase: Supabase, paths: (string | null | undefined)[]) {
  const candidates = [...new Set(paths)].filter((p): p is string => !!p && !isStaticImage(p));
  if (candidates.length === 0) return;
  // Paths are uuid-based ([\w/.-]), so they're safe inside a PostgREST in.() list.
  const list = candidates.map((p) => `"${p}"`).join(",");

  const [{ data: slides }, { data: settings }] = await Promise.all([
    supabase
      .from("hero_slides")
      .select("image_path, mobile_image_path")
      .or(`image_path.in.(${list}),mobile_image_path.in.(${list})`),
    supabase.from("site_settings").select(BRAND_COLUMNS).single(),
  ]);
  const used = new Set<string | null>(slides?.flatMap((s) => [s.image_path, s.mobile_image_path]));
  if (settings) for (const key of BRAND_IMAGE_KEYS) used.add(settings[key]);

  const unused = candidates.filter((p) => !used.has(p));
  if (unused.length === 0) return;
  const { error } = await supabase.storage.from(SITE_BUCKET).remove(unused);
  if (error) console.error("removeUnusedFiles failed", error);
}

// ------------------------------------------------------------------ slides

export async function createSlide(values: SlideFormValues): Promise<HomepageResult> {
  const { userId } = await requireAdmin();
  const parsed = slideSchema.safeParse(values);
  if (!parsed.success) return zodFail(parsed.error);
  const supabase = await createClient();

  const { data: rows, error: countError } = await supabase
    .from("hero_slides")
    .select("sort_order")
    .order("sort_order", { ascending: false });
  if (countError) return dbError(countError);
  if (rows.length >= MAX_SLIDES) return fail(`You can have up to ${MAX_SLIDES} slides.`);

  const { error } = await supabase
    .from("hero_slides")
    .insert({ ...parsed.data, sort_order: (rows[0]?.sort_order ?? -1) + 1 });
  if (error) return dbError(error);

  await logChange(userId, "slide_added", { headline: parsed.data.headline });
  revalidateSite();
  return { ok: true };
}

export async function updateSlide(id: string, values: SlideFormValues): Promise<HomepageResult> {
  const { userId } = await requireAdmin();
  if (!uuid.safeParse(id).success) return fail("Slide not found.");
  const parsed = slideSchema.safeParse(values);
  if (!parsed.success) return zodFail(parsed.error);
  const supabase = await createClient();

  const { data: before } = await supabase
    .from("hero_slides")
    .select("image_path, mobile_image_path")
    .eq("id", id)
    .maybeSingle();
  if (!before) return fail("Slide not found. It may have been deleted.");

  const { error } = await supabase.from("hero_slides").update(parsed.data).eq("id", id);
  if (error) return dbError(error);

  await removeUnusedFiles(
    supabase,
    [before.image_path, before.mobile_image_path].filter(
      (p) => p !== parsed.data.image_path && p !== parsed.data.mobile_image_path,
    ),
  );
  await logChange(userId, "slide_edited", { slide: id, headline: parsed.data.headline });
  revalidateSite();
  return { ok: true };
}

export async function setSlideActive(id: string, active: boolean): Promise<HomepageResult> {
  const { userId } = await requireAdmin();
  if (!uuid.safeParse(id).success || typeof active !== "boolean") return fail("Slide not found.");
  const supabase = await createClient();
  const { error } = await supabase.from("hero_slides").update({ active }).eq("id", id);
  if (error) return dbError(error);
  await logChange(userId, "slide_shown_hidden", { slide: id, active });
  revalidateSite();
  return { ok: true };
}

export async function deleteSlide(id: string): Promise<HomepageResult> {
  const { userId } = await requireAdmin();
  if (!uuid.safeParse(id).success) return fail("Slide not found.");
  const supabase = await createClient();

  const { data: slide, error } = await supabase
    .from("hero_slides")
    .delete()
    .eq("id", id)
    .select("image_path, mobile_image_path")
    .maybeSingle();
  if (error) return dbError(error);

  if (slide) await removeUnusedFiles(supabase, [slide.image_path, slide.mobile_image_path]);
  await logChange(userId, "slide_deleted", { slide: id });
  revalidateSite();
  return { ok: true };
}

/** Save the order shown on screen (first = shown first). */
export async function reorderSlides(orderedIds: string[]): Promise<HomepageResult> {
  const { userId } = await requireAdmin();
  if (!z.array(uuid).max(MAX_SLIDES).safeParse(orderedIds).success) {
    return fail("Couldn't save the slide order.");
  }
  const supabase = await createClient();
  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("hero_slides").update({ sort_order: index }).eq("id", id),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return dbError(failed.error);

  await logChange(userId, "slides_reordered", {});
  revalidateSite();
  return { ok: true };
}

/** An image was uploaded but the slide dialog was cancelled: delete it if unused. */
export async function discardUpload(path: string): Promise<HomepageResult> {
  await requireAdmin();
  if (
    !z
      .string()
      .regex(/^(slides|logos|icons|photos)\/[\w-]+\.\w+$/)
      .safeParse(path).success
  ) {
    return { ok: true };
  }
  await removeUnusedFiles(await createClient(), [path]);
  return { ok: true };
}

// ------------------------------------------------------------------ settings

export async function saveCarouselSettings(
  values: CarouselSettingsValues,
): Promise<HomepageResult> {
  const { userId } = await requireAdmin();
  const parsed = carouselSettingsSchema.safeParse(values);
  if (!parsed.success) return zodFail(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.from("site_settings").update(parsed.data).eq("id", true);
  if (error) return dbError(error);
  await logChange(userId, "carousel_settings", {
    autoplay: parsed.data.hero_autoplay,
    interval: parsed.data.hero_interval_seconds,
  });
  revalidateSite();
  return { ok: true };
}

/** Set (after the browser uploaded it) or remove (path null) a brand image. */
export async function setBrandImage(
  key: BrandImageKey,
  path: string | null,
): Promise<HomepageResult> {
  const { userId } = await requireAdmin();
  const parsed = brandImageSchema.safeParse({ key, path });
  const column = parsed.data?.key as BrandImageKey;
  if (!parsed.success || (path && !path.startsWith(`${BRAND_IMAGES[column].folder}/`))) {
    return fail("That image couldn't be saved.");
  }
  const supabase = await createClient();

  const { data: before, error: readError } = await supabase
    .from("site_settings")
    .select(BRAND_COLUMNS)
    .single();
  if (readError) return dbError(readError);

  const patch: TablesUpdate<"site_settings"> = { [column]: parsed.data.path };
  const { error } = await supabase.from("site_settings").update(patch).eq("id", true);
  if (error) return dbError(error);

  if (before[column] !== parsed.data.path) await removeUnusedFiles(supabase, [before[column]]);
  await logChange(userId, "brand_image", { image: column, removed: parsed.data.path === null });
  revalidateSite();
  return { ok: true };
}
