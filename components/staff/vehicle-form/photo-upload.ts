import imageCompression from "browser-image-compression";

import { createClient } from "@/lib/supabase/client";

const BUCKET = "vehicle-photos";
const MAX_SIDE = 1920;
const QUALITY = 0.8;
// Self-hosted copy for the compression web worker (the default loads it from a CDN).
const WORKER_LIB_URL = "/vendor/browser-image-compression-2.0.2.js";

export type PreparedPhoto = { blob: Blob; ext: "webp" | "jpg"; width: number; height: number };

/**
 * Resize to 1920px on the longest side and re-encode as WebP (JPEG where the
 * browser can't encode WebP, e.g. Safari). Re-encoding through a canvas drops
 * all EXIF data, including GPS location.
 */
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  let blob: Blob = await imageCompression(file, {
    maxWidthOrHeight: MAX_SIDE,
    fileType: "image/webp",
    initialQuality: QUALITY,
    useWebWorker: true,
    libURL: WORKER_LIB_URL,
    preserveExif: false,
  });

  if (blob.type !== "image/webp") {
    // Browser couldn't make WebP (it silently produced PNG): use JPEG instead.
    blob = await imageCompression(file, {
      maxWidthOrHeight: MAX_SIDE,
      fileType: "image/jpeg",
      initialQuality: QUALITY,
      useWebWorker: true,
      libURL: WORKER_LIB_URL,
      preserveExif: false,
    });
  }

  // The library can hand back the original file untouched (keeping its EXIF).
  // Guarantee a fresh canvas encode in that case.
  if (blob === file || (blob.size === file.size && blob.type === file.type)) {
    blob = await reencode(file, blob.type === "image/webp" ? "image/webp" : "image/jpeg");
  }

  const bitmap = await createImageBitmap(blob);
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return { blob, ext: blob.type === "image/webp" ? "webp" : "jpg", ...size };
}

async function reencode(file: Blob, type: string): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, QUALITY));
  if (!out) throw new Error("Couldn't process this photo.");
  return out.type === type ? out : reencode(file, "image/jpeg");
}

/**
 * Upload straight to Supabase Storage with the signed-in user's session
 * (RLS decides). XHR instead of supabase-js so we get upload progress.
 */
export async function uploadPhoto(
  path: string,
  blob: Blob,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  const { data } = await createClient().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Your session has expired. Sign in again.");

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
    xhr.setRequestHeader("Content-Type", blob.type);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(uploadErrorMessage(xhr.status, xhr.responseText)));
    xhr.onerror = () => reject(new Error("Upload failed — check your connection and tap Retry."));
    signal?.addEventListener("abort", () => xhr.abort());
    xhr.send(blob);
  });
}

function uploadErrorMessage(status: number, body: string) {
  if (status === 413 || body.includes("maximum allowed size"))
    return "Photo is too large (max 5 MB).";
  if (status === 401 || status === 403)
    return "You don't have permission to upload. Sign in again.";
  return "Upload failed. Tap Retry.";
}

/** Best-effort cleanup when a file uploaded but its database row couldn't be saved. */
export async function removeUploadedFile(path: string) {
  await createClient().storage.from(BUCKET).remove([path]);
}
