import Link from "next/link";

import { getSiteSettings } from "@/lib/public-data";
import { siteImageUrl } from "@/lib/site-images";
import { cn } from "@/lib/utils";

type Props = {
  /** "light" = for dark backgrounds (footer): uses the dark-background logo. */
  tone?: "dark" | "light";
  href?: string;
  /** Sets the logo height, e.g. "h-7". */
  className?: string;
};

/**
 * Logo from site settings (/admin/homepage), linked to the home page. Falls
 * back to the dealership name as text when no logo is set for this tone.
 */
export async function Logo({ tone = "dark", href = "/", className }: Props) {
  const s = await getSiteSettings();
  const src = siteImageUrl(tone === "light" ? s.logo_dark_path : s.logo_path);
  const [first, ...rest] = s.dealership_name.split(" ");

  return (
    <Link href={href} className={cn("inline-flex h-8 shrink-0 items-center", className)}>
      {src ? (
        // Plain <img>: any size, sized by height.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={s.dealership_name} className="h-full w-auto max-w-[70vw]" />
      ) : (
        <span
          className={cn(
            "text-xl font-extrabold tracking-tight whitespace-nowrap",
            tone === "light" ? "text-white" : "text-foreground",
          )}
        >
          <span className="text-brand">{first}</span> {rest.join(" ")}
        </span>
      )}
    </Link>
  );
}
