import { preparePhoto, uploadImage } from "@/components/staff/vehicle-form/photo-upload";

const MAX_BYTES = 4 * 1024 * 1024; // Server upload limit.

export type UploadMode =
  /** Hero slides and the About photo: WebP, 2400px. */
  | "photo"
  /** Share image: JPEG (widest support), 1200px. */
  | "share"
  /** Logos and favicon: sent as-is (PNG/WebP/JPEG); the server stores PNG. No SVG. */
  | "original";

export type UploadedImage = { path: string; width: number; height: number };

const ORIGINAL_TYPES = new Set(["image/png", "image/webp", "image/jpeg"]);

/**
 * Compress in the browser (unless "original"), then upload through the server,
 * which checks the real file type and re-encodes it (see /admin/api/uploads).
 */
export async function uploadSiteImage(
  file: File,
  folder: "slides" | "logos" | "icons" | "photos",
  mode: UploadMode,
  onProgress: (fraction: number) => void = () => {},
): Promise<UploadedImage> {
  let blob: Blob = file;
  if (mode === "original") {
    if (!ORIGINAL_TYPES.has(file.type)) {
      throw new Error(
        folder === "icons"
          ? "Use a PNG image for the favicon."
          : "Use a PNG or WebP image for the logo (SVG isn't allowed).",
      );
    }
    if (file.size > MAX_BYTES) throw new Error("Image is too large (max 4 MB).");
  } else {
    ({ blob } = await preparePhoto(file, {
      maxSide: mode === "share" ? 1200 : 2400,
      format: mode === "share" ? "jpeg" : "webp",
    }));
  }

  const kind =
    folder === "slides"
      ? "slide"
      : folder === "logos"
        ? "logo"
        : folder === "icons"
          ? "icon"
          : mode === "share"
            ? "share"
            : "photo";
  return uploadImage<UploadedImage>({ kind }, blob, onProgress);
}
