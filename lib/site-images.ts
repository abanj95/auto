// Site images (hero slides, logo, favicon, About photo, share image).
// Used by the public site and the admin homepage editor (client and server).

export const SITE_BUCKET = "site-images";
const BUCKET_PATH = `/storage/v1/object/public/${SITE_BUCKET}/`;

/** A path starting with "/" is a static file shipped with the site (the seed values). */
export function isStaticImage(path: string) {
  return path.startsWith("/");
}

export function siteImageUrl(path: string): string;
export function siteImageUrl(path: string | null | undefined): string | null;
export function siteImageUrl(path: string | null | undefined) {
  if (!path) return null;
  if (isStaticImage(path)) return path;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}${BUCKET_PATH}${path}`;
}

/** Brand images stored in site_settings. */
export const BRAND_IMAGES = {
  logo_path: {
    label: "Logo",
    help: "Shown in the header. PNG with a transparent background (no SVG).",
    folder: "logos",
    mode: "original",
  },
  logo_dark_path: {
    label: "Logo for dark backgrounds",
    help: "Shown in the footer (white or light lettering). PNG with transparency.",
    folder: "logos",
    mode: "original",
  },
  favicon_path: {
    label: "Favicon",
    help: "Browser tab icon. Square PNG, at least 192 × 192.",
    folder: "icons",
    mode: "original",
  },
  about_image_path: {
    label: "About page photo",
    help: "Shown on the About page. A photo of the lot or the team works well.",
    folder: "photos",
    mode: "photo",
  },
  og_default_image_path: {
    label: "Default share image",
    help: "Preview image when a page is shared on Facebook, texts, etc. Landscape, 1200 × 630 ideal.",
    folder: "photos",
    mode: "share",
  },
} as const;

export type BrandImageKey = keyof typeof BRAND_IMAGES;
export const BRAND_IMAGE_KEYS = Object.keys(BRAND_IMAGES) as BrandImageKey[];

/** Slide images narrower than this, or not landscape, get a warning in the editor. */
export const MIN_SLIDE_WIDTH = 1600;
