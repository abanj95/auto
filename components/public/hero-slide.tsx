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

// Tint over the whole image (the text also sits in its own dark box).
const OVERLAY: Record<Overlay, string> = {
  none: "",
  light: "bg-black/20",
  dark: "bg-black/40",
};

/**
 * One hero slide: the image, with the headline, one paragraph and one button
 * in a single centered semi-transparent dark box. Layout uses container
 * queries (@2xl ≈ sm, @5xl = lg) rather than the viewport, so the admin
 * preview (a scaled-down box) looks exactly like the live page.
 */
export function HeroSlide({
  slide,
  heading = "h2",
  priority = false,
  loading,
  preview,
  className,
}: {
  slide: HeroSlideData;
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
  const hasButton = slide.button_label && slide.button_link;
  const hasText = slide.headline || slide.subheadline || hasButton;
  const buttonClass =
    "mt-6 inline-flex h-12 w-fit items-center rounded-full bg-primary px-7 text-base font-semibold text-primary-foreground shadow-lg transition hover:bg-primary/90";
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
        className={imageClass}
      />
    );
  }

  return (
    <div className={cn("@container relative isolate overflow-hidden bg-neutral-900", className)}>
      {image}
      <div className={cn("absolute inset-0 -z-10", OVERLAY[slide.overlay_strength])} />
      {hasText && (
        <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-center px-4 @2xl:px-6 @5xl:px-8">
          <div className="flex w-full max-w-2xl flex-col items-center rounded-2xl bg-black/60 px-5 py-7 text-center text-white backdrop-blur-[2px] @2xl:px-10 @2xl:py-10">
            {slide.headline && (
              <Heading className="text-3xl leading-[1.1] font-extrabold tracking-tight @2xl:text-4xl @5xl:text-5xl">
                {slide.headline}
              </Heading>
            )}
            {slide.subheadline && (
              <p className="mt-3 max-w-xl text-base text-white/90 @2xl:mt-4 @2xl:text-lg">
                {slide.subheadline}
              </p>
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
      )}
    </div>
  );
}
