import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";
import type { Overlay, TextPosition } from "@/lib/validation/homepage";

export type HeroSlideData = {
  src: string;
  headline: string | null;
  subheadline: string | null;
  button_label: string | null;
  button_link: string | null;
  text_position: TextPosition;
  overlay_strength: Overlay;
};

/** Hero heights, shared by the carousel, the fallback hero and the admin previews. */
export const HERO_HEIGHT = "h-[480px] sm:h-[540px] lg:h-[600px]";

// Readability layer behind the text. Left-aligned text gets a gradient from the
// text side; centered text an even tint.
const OVERLAY: Record<Overlay, Record<TextPosition, string>> = {
  none: { left: "", center: "" },
  light: {
    left: "bg-gradient-to-t from-black/60 via-black/25 to-black/10 @2xl:bg-gradient-to-r @2xl:from-black/60 @2xl:via-black/30 @2xl:to-transparent",
    center: "bg-black/30",
  },
  dark: {
    left: "bg-gradient-to-t from-black/85 via-black/45 to-black/30 @2xl:bg-gradient-to-r @2xl:from-black/85 @2xl:via-black/55 @2xl:to-black/10",
    center: "bg-black/55",
  },
};

/**
 * One hero slide. Layout uses container queries (@2xl ≈ sm, @5xl = lg) rather
 * than the viewport, so the admin preview (a scaled-down box) looks exactly
 * like the live page.
 */
export function HeroSlide({
  slide,
  eyebrow,
  heading = "h2",
  preload = false,
  loading,
  sizes = "100vw",
  preview = false,
  className,
}: {
  slide: HeroSlideData;
  /** Small line above the headline, e.g. "McRowin Auto · Lansdale". */
  eyebrow?: string;
  /** The first slide's headline is the page's h1. */
  heading?: "h1" | "h2" | "p";
  preload?: boolean;
  loading?: "eager" | "lazy";
  sizes?: string;
  /** Admin preview: the button is not a link; local blob: images aren't optimized. */
  preview?: boolean;
  className?: string;
}) {
  const Heading = heading;
  const centered = slide.text_position === "center";
  const hasButton = slide.button_label && slide.button_link;
  const buttonClass =
    "mt-7 inline-flex h-12 items-center rounded-full bg-primary px-6 text-base font-semibold text-primary-foreground shadow-lg transition hover:bg-primary/90";

  return (
    <div className={cn("@container relative isolate overflow-hidden bg-neutral-900", className)}>
      <Image
        src={slide.src}
        alt=""
        fill
        preload={preload}
        loading={loading}
        sizes={sizes}
        unoptimized={preview || slide.src.endsWith(".svg")}
        className="-z-10 object-cover object-[70%_center]"
      />
      <div
        className={cn(
          "absolute inset-0 -z-10",
          OVERLAY[slide.overlay_strength][slide.text_position],
        )}
      />
      <div
        className={cn(
          "mx-auto flex h-full w-full max-w-7xl flex-col justify-center px-4 pb-24 text-white text-shadow-md @2xl:px-6 @2xl:pb-20 @5xl:px-8",
          centered && "items-center text-center",
        )}
      >
        {eyebrow && (
          <p className="text-sm font-semibold tracking-widest text-white/80 uppercase">{eyebrow}</p>
        )}
        {slide.headline && (
          <Heading
            className={cn(
              "mt-3 max-w-2xl text-4xl leading-[1.05] font-extrabold tracking-tight @2xl:text-5xl @5xl:text-6xl",
              centered && "max-w-3xl",
            )}
          >
            {slide.headline}
          </Heading>
        )}
        {slide.subheadline && (
          <p className="mt-4 max-w-lg text-lg text-white/85">{slide.subheadline}</p>
        )}
        {hasButton &&
          (preview ? (
            <span className={buttonClass}>{slide.button_label}</span>
          ) : (
            <Link href={slide.button_link!} className={buttonClass}>
              {slide.button_label}
            </Link>
          ))}
      </div>
    </div>
  );
}
