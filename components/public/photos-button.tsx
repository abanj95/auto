"use client";

import { Images, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { toast } from "sonner";

import type { LightboxPhoto } from "@/components/public/photos-lightbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PhotosLightbox = dynamic(() => import("@/components/public/photos-lightbox"), {
  ssr: false,
});

/** "Photos (N)": opens the full-screen gallery right from the inventory page. */
export function PhotosButton({
  slug,
  count,
  alt,
  className,
}: {
  slug: string;
  count: number;
  alt: string;
  className?: string;
}) {
  const [photos, setPhotos] = useState<LightboxPhoto[] | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function show() {
    if (photos) {
      setOpen(true);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/vehicles/${slug}/photos`);
      const data = (await res.json()) as { photos: LightboxPhoto[] };
      if (!res.ok || data.photos.length === 0) throw new Error();
      setPhotos(data.photos);
      setOpen(true);
    } catch {
      toast.error("Couldn't load the photos. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={show}
        disabled={loading || count === 0}
        className={cn("h-10 w-full", className)}
        aria-label={`View all ${count} photos of the ${alt}`}
      >
        {loading ? <Loader2 className="animate-spin" aria-hidden /> : <Images aria-hidden />}
        Photos ({count})
      </Button>
      {photos && (
        <PhotosLightbox photos={photos} alt={alt} open={open} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
