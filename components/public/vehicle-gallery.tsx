"use client";

import { Car, ChevronLeft, ChevronRight, Expand } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import Counter from "yet-another-react-lightbox/plugins/counter";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/counter.css";

import { cn } from "@/lib/utils";

export type GalleryPhoto = { id: string; src: string; width: number; height: number };

const MAIN_SIZES = "(min-width: 1280px) 780px, (min-width: 1024px) 60vw, 100vw";

/**
 * Swipeable main image (native scroll-snap), arrows + thumbnails on desktop,
 * tap to open a full-screen lightbox with pinch/scroll zoom. Only the first
 * photo loads eagerly.
 */
export function VehicleGallery({
  photos,
  alt,
  sold,
}: {
  photos: GalleryPhoto[];
  alt: string;
  sold?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  function goTo(i: number) {
    const track = trackRef.current;
    if (!track) return;
    const next = Math.max(0, Math.min(photos.length - 1, i));
    track.scrollTo({ left: next * track.clientWidth, behavior: "smooth" });
  }

  function onScroll() {
    const track = trackRef.current;
    if (track) setIndex(Math.round(track.scrollLeft / track.clientWidth));
  }

  if (photos.length === 0) {
    return (
      <div className="relative flex aspect-[4/3] items-center justify-center bg-muted text-muted-foreground sm:rounded-xl">
        <Car className="size-16" aria-hidden />
        {sold && <SoldBanner />}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="group relative overflow-hidden bg-muted sm:rounded-xl">
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
          aria-roledescription="carousel"
          aria-label={`${alt} photos`}
        >
          {photos.map((photo, i) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => {
                setIndex(i);
                setLightboxOpen(true);
              }}
              className="relative aspect-[4/3] w-full shrink-0 cursor-zoom-in snap-center"
              aria-label={`Open photo ${i + 1} of ${photos.length} full screen`}
            >
              <Image
                src={photo.src}
                alt={i === 0 ? alt : `${alt} — photo ${i + 1}`}
                fill
                sizes={MAIN_SIZES}
                priority={i === 0}
                loading={i === 0 ? undefined : "lazy"}
                className={cn("object-cover", sold && "grayscale-[60%]")}
              />
            </button>
          ))}
        </div>

        {sold && <SoldBanner />}

        {photos.length > 1 && (
          <>
            <ArrowButton side="left" disabled={index === 0} onClick={() => goTo(index - 1)} />
            <ArrowButton
              side="right"
              disabled={index === photos.length - 1}
              onClick={() => goTo(index + 1)}
            />
          </>
        )}
        <div className="pointer-events-none absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white">
          <Expand className="size-3.5" aria-hidden />
          {index + 1} / {photos.length}
        </div>
      </div>

      {photos.length > 1 && (
        <div className="no-scrollbar hidden gap-2 overflow-x-auto md:flex">
          {photos.map((photo, i) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === index}
              className={cn(
                "relative aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-lg ring-2 transition",
                i === index ? "ring-primary" : "opacity-70 ring-transparent hover:opacity-100",
              )}
            >
              <Image src={photo.src} alt="" fill sizes="96px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={index}
        slides={photos.map((p, i) => ({
          src: p.src,
          width: p.width,
          height: p.height,
          alt: `${alt} — photo ${i + 1}`,
        }))}
        plugins={[Zoom, Counter]}
        zoom={{ maxZoomPixelRatio: 3, scrollToZoom: true }}
        controller={{ closeOnBackdropClick: true, closeOnPullDown: true }}
        on={{
          // Keep the page gallery in sync with where the lightbox was closed.
          view: ({ index: i }) => {
            if (i !== index) {
              setIndex(i);
              const track = trackRef.current;
              if (track) track.scrollTo({ left: i * track.clientWidth });
            }
          },
        }}
      />
    </div>
  );
}

function ArrowButton({
  side,
  disabled,
  onClick,
}: {
  side: "left" | "right";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={side === "left" ? "Previous photo" : "Next photo"}
      className={cn(
        "absolute top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-md transition hover:bg-white disabled:opacity-0 md:flex",
        side === "left" ? "left-3" : "right-3",
      )}
    >
      <Icon className="size-6" aria-hidden />
    </button>
  );
}

function SoldBanner() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25">
      <span className="-rotate-6 rounded-lg border-4 border-white bg-brand px-8 py-2 text-5xl font-black tracking-widest text-white shadow-2xl sm:text-6xl">
        SOLD
      </span>
    </div>
  );
}
