import Image, { getImageProps } from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";
import type { FocalPoint, Overlay, TextPosition } from "@/lib/validation/homepage";

export type HeroSlideData = {
  src: string;
  /** Portrait image for phones (below 768px); null = crop `src` around the focal point. */
  mobileSrc: string | null;
  focal_point: FocalPoint;
  headline: string | null;
  subheadline: string | null;
  button_label: string | null;
  button_link: string | null;
  text_position: TextPosition;
  overlay_strength: Overlay;
};

/** Hero heights, shared by the carousel, the fallback hero and the admin previews. */
export const HERO_HEIGHT = "h-[480px] sm:h-[540px] lg:h-[600px]";

/** Below this width the mobile image is used (matches Tailwind's md). */
const MOBILE_QUERY = "(max-width: 767px)";

const FOCAL: Record<FocalPoint, string> = {
  left: "object-[25%_center]",
  center: "object-center",
  right: "object-[75%_center]",
};

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
  priority = false,
  loading,
  preview,
  className,
}: {
  slide: HeroSlideData;
  /** Small line above the headline, e.g. "McRowin Auto · Lansdale". */
  eyebrow?: string;
  /** The first slide's headline is the page's h1. */
  heading?: "h1" | "h2" | "p";
  /** First slide: load at once with high priority. */
  priority?: boolean;
  loading?: "eager" | "lazy";
  /**
   * Admin preview at a fixed size: "desktop" or "phone" picks the image
   * explicitly; the button is not a link; images aren't optimized.
   */
  preview?: "desktop" | "phone";
  className?: string;
}) {
  const Heading = heading;
  const centered = slide.text_position === "center";
  const hasButton = slide.button_label && slide.button_link;
  const buttonClass =
    "mt-7 inline-flex h-12 w-fit items-center rounded-full bg-primary px-6 text-base font-semibold text-primary-foreground shadow-lg transition hover:bg-primary/90";
  const imageClass = cn("absolute inset-0 -z-10 size-full object-cover", FOCAL[slide.focal_point]);

  let image: React.ReactNode;
  if (preview) {
    const src = preview === "phone" && slide.mobileSrc ? slide.mobileSrc : slide.src;
    const useMobile = preview === "phone" && slide.mobileSrc;
    image = (
      <Image
        src={src}
        alt=""
        fill
        unoptimized
        className={cn(imageClass, useMobile && "object-center")}
      />
    );
  } else if (slide.mobileSrc) {
    // Art direction: portrait image on phones, landscape from md up.
    const common = {
      alt: "",
      fill: true,
      sizes: "100vw",
      fetchPriority: priority ? "high" : undefined,
    } as const;
    const {
      props: { srcSet: mobile },
    } = getImageProps({ ...common, src: slide.mobileSrc });
    const { props: desktop } = getImageProps({
      ...common,
      src: slide.src,
      loading: priority ? "eager" : loading,
    });
    image = (
      <picture>
        <source media={MOBILE_QUERY} srcSet={mobile} sizes="100vw" />
        {/* eslint-disable-next-line jsx-a11y/alt-text -- alt comes from getImageProps */}
        <img {...desktop} className={imageClass} />
      </picture>
    );
  } else {
    image = (
      <Image
        src={slide.src}
        alt=""
        fill
        preload={priority}
        loading={loading}
        sizes="100vw"
        unoptimized={slide.src.endsWith(".svg")}
        className={imageClass}
      />
    );
  }

  return (
    <div className={cn("@container relative isolate overflow-hidden bg-neutral-900", className)}>
      {image}
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
          ) : slide.button_link!.startsWith("tel:") ? (
            <a href={slide.button_link!} className={buttonClass}>
              {slide.button_label}
            </a>
          ) : (
            <Link href={slide.button_link!} className={buttonClass}>
              {slide.button_label}
            </Link>
          ))}
      </div>
    </div>
  );
}
