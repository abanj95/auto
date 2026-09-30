import imageCompression from "browser-image-compression";

const MAX_SIDE = 1920;
const QUALITY = 0.8;
// Self-hosted copy for the compression web worker (the default loads it from a CDN).
const WORKER_LIB_URL = "/vendor/browser-image-compression-2.0.2.js";

export type PreparedPhoto = { blob: Blob; ext: "webp" | "jpg"; width: number; height: number };

export type PrepareOptions = {
  /** Longest side in px (default 1920). */
  maxSide?: number;
  /** "jpeg" skips WebP (e.g. share images, which some sites can't read as WebP). */
  format?: "webp" | "jpeg";
};

/**
 * Resize to 1920px (or `maxSide`) on the longest side and re-encode as WebP
 * (JPEG where the browser can't encode WebP, e.g. Safari). Re-encoding through
 * a canvas drops all EXIF data, including GPS location.
 */
export async function preparePhoto(
  file: File,
  { maxSide = MAX_SIDE, format = "webp" }: PrepareOptions = {},
): Promise<PreparedPhoto> {
  let blob: Blob = await imageCompression(file, {
    maxWidthOrHeight: maxSide,
    fileType: `image/${format}`,
    initialQuality: QUALITY,
    useWebWorker: true,
    libURL: WORKER_LIB_URL,
    preserveExif: false,
  });

  if (format === "webp" && blob.type !== "image/webp") {
    // Browser couldn't make WebP (it silently produced PNG): use JPEG instead.
    blob = await imageCompression(file, {
      maxWidthOrHeight: maxSide,
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
    blob = await reencode(file, blob.type === "image/webp" ? "image/webp" : "image/jpeg", maxSide);
  }

  const bitmap = await createImageBitmap(blob);
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return { blob, ext: blob.type === "image/webp" ? "webp" : "jpg", ...size };
}

async function reencode(file: Blob, type: string, maxSide: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, QUALITY));
  if (!out) throw new Error("Couldn't process this photo.");
  return out.type === type ? out : reencode(file, "image/jpeg", maxSide);
}

/**
 * Upload to our server (POST /admin/api/uploads), which checks the real file
 * type, re-encodes it and stores it. XHR (not fetch) for upload progress.
 */
export async function uploadImage<T>(
  query: Record<string, string>,
  blob: Blob,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/admin/api/uploads?${new URLSearchParams(query)}`);
    xhr.setRequestHeader("Content-Type", blob.type || "application/octet-stream");
    xhr.responseType = "json";
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      const body = xhr.response as ({ ok: true } & T) | { ok: false; error?: string } | null;
      if (xhr.status >= 200 && xhr.status < 300 && body?.ok) resolve(body as T);
      else
        reject(
          new Error(
            uploadErrorMessage(xhr.status, body && "error" in body ? body.error : undefined),
          ),
        );
    };
    xhr.onerror = () => reject(new Error("Upload failed — check your connection and tap Retry."));
    signal?.addEventListener("abort", () => xhr.abort());
    xhr.send(blob);
  });
}

function uploadErrorMessage(status: number, serverMessage?: string) {
  if (serverMessage) return serverMessage;
  if (status === 413) return "Image is too large.";
  if (status === 401 || status === 403)
    return "You don't have permission to upload. Sign in again.";
  return "Upload failed. Tap Retry.";
}
