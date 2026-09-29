import Image from "next/image";
import Link from "next/link";

import logoFullLight from "@/public/brand/logo-full-light.png";
import logoFull from "@/public/brand/logo-full.png";
import logoWordmarkLight from "@/public/brand/logo-wordmark-light.png";
import logoWordmark from "@/public/brand/logo-wordmark.png";
import { cn } from "@/lib/utils";

type Props = {
  /** "light" = white lettering, for dark backgrounds (footer). */
  tone?: "dark" | "light";
  /**
   * "wordmark" = MCROWIN AUTO only; "full" adds "| Verified Quality";
   * "responsive" = wordmark on phones, full from md up.
   */
  variant?: "wordmark" | "full" | "responsive";
  href?: string;
  className?: string;
};

/** McRowin Auto logo (from the previous site), linked to the home page. */
export function Logo({ tone = "dark", variant = "responsive", href = "/", className }: Props) {
  const full = tone === "light" ? logoFullLight : logoFull;
  const wordmark = tone === "light" ? logoWordmarkLight : logoWordmark;
  const img = (src: typeof full, extra?: string) => (
    <Image src={src} alt="McRowin Auto" loading="eager" className={cn("h-full w-auto", extra)} />
  );

  return (
    <Link href={href} className={cn("inline-flex h-8 shrink-0 items-center", className)}>
      {variant === "full" && img(full)}
      {variant === "wordmark" && img(wordmark)}
      {variant === "responsive" && (
        <>
          {img(wordmark, "md:hidden")}
          {img(full, "hidden md:block")}
        </>
      )}
    </Link>
  );
}
