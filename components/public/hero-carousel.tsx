"use client";

import Autoplay from "embla-carousel-autoplay";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { HERO_HEIGHT, HeroSlide, type HeroSlideData } from "@/components/public/hero-slide";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** true until the browser says otherwise, so the server never starts autoplay. */
function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => true,
  );
}

/**
 * Home page hero. Swipe on phones, arrows from md up, dots. Autoplay pauses
 * on hover, focus and when the tab is hidden (Embla Autoplay), and is off
 * when the visitor prefers reduced motion.
 */
export function HeroCarousel({
  slides,
  eyebrow,
  autoplay,
  intervalSeconds,
}: {
  slides: HeroSlideData[];
  eyebrow: string;
  autoplay: boolean;
  intervalSeconds: number;
}) {
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);
  // Slides whose image may load now: the first at once, neighbours after hydration.
  const [eager, setEager] = useState<Set<number>>(() => new Set([0]));
  const reducedMotion = useReducedMotion();
  const multiple = slides.length > 1;

  const plugins = useMemo(
    () =>
      autoplay && multiple && !reducedMotion
        ? [
            Autoplay({
              delay: intervalSeconds * 1000,
              stopOnMouseEnter: true,
              stopOnFocusIn: true,
              stopOnInteraction: false,
            }),
          ]
        : [],
    [autoplay, multiple, reducedMotion, intervalSeconds],
  );

  const onSelect = useCallback((embla: NonNullable<CarouselApi>) => {
    const index = embla.selectedScrollSnap();
    const count = embla.scrollSnapList().length;
    setSelected(index);
    setEager((prev) => {
      const next = new Set(prev)
        .add(index)
        .add((index + 1) % count)
        .add((index - 1 + count) % count);
      return next.size === prev.size ? prev : next;
    });
  }, []);

  useEffect(() => {
    if (!api) return;
    // After first paint: mark the neighbours of slide 1 for loading.
    const frame = requestAnimationFrame(() => onSelect(api));
    api.on("select", onSelect);
    return () => {
      cancelAnimationFrame(frame);
      api.off("select", onSelect);
    };
  }, [api, onSelect]);

  return (
    <Carousel
      setApi={setApi}
      opts={{ loop: multiple, active: multiple }}
      plugins={plugins}
      aria-label="Highlights"
      className="w-full"
    >
      <CarouselContent className="ml-0">
        {slides.map((slide, i) => (
          <CarouselItem
            key={i}
            className="pl-0"
            aria-label={`${i + 1} of ${slides.length}`}
            aria-hidden={i !== selected || undefined}
            inert={i !== selected || undefined}
          >
            <HeroSlide
              slide={slide}
              eyebrow={eyebrow}
              heading={i === 0 ? "h1" : "h2"}
              priority={i === 0}
              loading={eager.has(i) ? "eager" : "lazy"}
              className={HERO_HEIGHT}
            />
          </CarouselItem>
        ))}
      </CarouselContent>

      {multiple && (
        <>
          <div className="absolute inset-x-0 bottom-[5.5rem] flex justify-center sm:bottom-16">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => api?.scrollTo(i)}
                aria-label={`Show slide ${i + 1}`}
                aria-current={i === selected || undefined}
                className="group flex size-6 items-center justify-center"
              >
                <span
                  className={cn(
                    "block h-2 rounded-full bg-white/60 shadow transition-all group-hover:bg-white",
                    i === selected ? "w-5 bg-white" : "w-2",
                  )}
                />
              </button>
            ))}
          </div>
          <div className="absolute right-6 bottom-16 hidden gap-2 md:flex lg:right-8">
            <ArrowButton label="Previous slide" onClick={() => api?.scrollPrev()}>
              <ChevronLeft className="size-5" aria-hidden />
            </ArrowButton>
            <ArrowButton label="Next slide" onClick={() => api?.scrollNext()}>
              <ChevronRight className="size-5" aria-hidden />
            </ArrowButton>
          </div>
        </>
      )}
    </Carousel>
  );
}

function ArrowButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-11 items-center justify-center rounded-full bg-black/45 text-white ring-1 ring-white/25 backdrop-blur transition hover:bg-black/65 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
    >
      {children}
    </button>
  );
}
