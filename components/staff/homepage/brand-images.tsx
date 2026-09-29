"use client";

import { ImageOff, ImagePlus, Loader2, TriangleAlert, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import {
  discardUpload,
  setBrandImage,
} from "@/app/(staff)/admin/(app)/(admin-only)/homepage/actions";
import { ConfirmDialog } from "@/components/staff/confirm-dialog";
import { uploadSiteImage } from "@/components/staff/homepage/site-image-upload";
import { Button } from "@/components/ui/button";
import {
  BRAND_IMAGE_KEYS,
  BRAND_IMAGES,
  siteImageUrl,
  type BrandImageKey,
} from "@/lib/site-images";
import { cn } from "@/lib/utils";

/** Logo, dark logo, favicon, About photo and share image: each with Replace and Remove. */
export function BrandImages({ paths }: { paths: Record<BrandImageKey, string | null> }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Brand images</h2>
        <p className="text-sm text-muted-foreground">
          Changes show on the public site within a few seconds.
        </p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {BRAND_IMAGE_KEYS.map((key) => (
          <BrandImageCard key={key} imageKey={key} path={paths[key]} />
        ))}
      </ul>
    </section>
  );
}

function BrandImageCard({ imageKey, path }: { imageKey: BrandImageKey; path: string | null }) {
  const info = BRAND_IMAGES[imageKey];
  const [busy, setBusy] = useState<"upload" | "remove" | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const src = siteImageUrl(path);
  const dark = imageKey === "logo_dark_path";
  const isPhoto = info.mode !== "original";

  async function onPick(file: File | undefined) {
    if (!file) return;
    setBusy("upload");
    try {
      const uploaded = await uploadSiteImage(file, info.folder, info.mode);
      const result = await setBrandImage(imageKey, uploaded.path);
      if (!result.ok) {
        void discardUpload(uploaded.path);
        toast.error(result.error);
        return;
      }
      setWarning(sizeWarning(imageKey, uploaded.width, uploaded.height));
      toast.success(`${info.label} updated.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy("remove");
    try {
      const result = await setBrandImage(imageKey, null);
      if (result.ok) {
        setWarning(null);
        toast.success(`${info.label} removed.`);
      } else toast.error(result.error);
    } finally {
      setBusy(null);
    }
  }

  return (
    <li className="flex flex-col rounded-xl border bg-card p-4" data-testid={`brand-${imageKey}`}>
      <h3 className="font-medium">{info.label}</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">{info.help}</p>

      <div
        className={cn(
          "mt-3 flex aspect-[16/9] items-center justify-center overflow-hidden rounded-lg",
          dark ? "bg-neutral-950" : "bg-muted/60",
          !isPhoto && "p-4",
        )}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- any format incl. SVG
          <img
            src={src}
            alt=""
            className={cn(
              isPhoto ? "size-full object-cover" : "max-h-full max-w-full object-contain",
            )}
          />
        ) : (
          <span className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
            <ImageOff className="size-6" aria-hidden />
            {imageKey.startsWith("logo") ? "Text logo is used" : "Not set"}
          </span>
        )}
      </div>

      {warning && (
        <p className="mt-2 flex gap-1.5 text-xs text-amber-800">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {warning}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={
          isPhoto
            ? "image/*"
            : imageKey === "favicon_path"
              ? "image/png"
              : "image/png,image/svg+xml,image/webp"
        }
        className="sr-only"
        tabIndex={-1}
        aria-label={`${info.label} file`}
        onChange={(e) => {
          void onPick(e.target.files?.[0]);
          e.target.value = "";
        }}
        suppressHydrationWarning
      />
      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-11 flex-1"
          disabled={busy !== null}
          onClick={() => inputRef.current?.click()}
        >
          {busy === "upload" ? (
            <Loader2 className="animate-spin" aria-hidden />
          ) : src ? (
            <Upload aria-hidden />
          ) : (
            <ImagePlus aria-hidden />
          )}
          {src ? "Replace" : "Upload"}
        </Button>
        {src && (
          <Button
            type="button"
            variant="ghost"
            className="h-11 text-destructive hover:text-destructive"
            disabled={busy !== null}
            onClick={() => setConfirmRemove(true)}
          >
            {busy === "remove" && <Loader2 className="animate-spin" aria-hidden />}
            Remove
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title={`Remove the ${info.label.toLowerCase()}?`}
        description={
          imageKey.startsWith("logo")
            ? "The site will show the dealership name as text instead."
            : "The site will go back to its default."
        }
        confirmLabel="Remove"
        onConfirm={() => {
          setConfirmRemove(false);
          void remove();
        }}
      />
    </li>
  );
}

function sizeWarning(key: BrandImageKey, width: number, height: number) {
  if (!width) return null; // SVG: scales to any size.
  if (key === "favicon_path" && (width !== height || width < 192)) {
    return "Favicons look best square and at least 192 × 192.";
  }
  if (key === "og_default_image_path" && (width < 1200 || width <= height)) {
    return "Share images look best landscape, 1200 × 630.";
  }
  if (key === "about_image_path" && width < 1200) {
    return "This photo is small and may look blurry on large screens.";
  }
  return null;
}
