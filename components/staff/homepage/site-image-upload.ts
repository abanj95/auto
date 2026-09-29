import { preparePhoto, uploadPhoto } from "@/components/staff/vehicle-form/photo-upload";
import { SITE_BUCKET } from "@/lib/site-images";

const MAX_BYTES = 8 * 1024 * 1024; // Bucket limit.

export type UploadMode =
  /** Hero slides and the About photo: WebP (JPEG on Safari), 2400px. */
  | "photo"
  /** Share image: JPEG (widest support), 1200px. */
  | "share"
  /** Logos and favicon: uploaded as-is (PNG/SVG keep transparency and sharpness). */
  | "original";

export type UploadedImage = { path: string; width: number; height: number };

const ORIGINAL_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/svg+xml": "svg",
  "image/webp": "webp",
};

/** Compress (unless "original") and upload to the site-images bucket under `folder`. */
export async function uploadSiteImage(
  file: File,
  folder: "slides" | "logos" | "icons" | "photos",
  mode: UploadMode,
  onProgress: (fraction: number) => void = () => {},
): Promise<UploadedImage> {
  let blob: Blob;
  let ext: string;
  let width = 0;
  let height = 0;

  if (mode === "original") {
    ext = ORIGINAL_TYPES[file.type];
    if (!ext || (ext === "svg" && folder !== "logos") || (folder === "icons" && ext !== "png")) {
      throw new Error(
        folder === "icons"
          ? "Use a PNG image for the favicon."
          : "Use a PNG or SVG image for the logo.",
      );
    }
    if (file.size > MAX_BYTES) throw new Error("Image is too large (max 8 MB).");
    blob = file;
    if (ext !== "svg") ({ width, height } = await imageSize(file));
  } else {
    const prepared = await preparePhoto(file, {
      maxSide: mode === "share" ? 1200 : 2400,
      format: mode === "share" ? "jpeg" : "webp",
    });
    ({ blob, ext, width, height } = prepared);
  }

  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  await uploadPhoto(path, blob, onProgress, undefined, SITE_BUCKET);
  return { path, width, height };
}

async function imageSize(file: Blob) {
  const bitmap = await createImageBitmap(file);
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return size;
}
