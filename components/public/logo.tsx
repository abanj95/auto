import Link from "next/link";

import { cn } from "@/lib/utils";

export function Logo({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <Link
      href="/"
      className={cn(
        "text-xl font-extrabold tracking-tight whitespace-nowrap",
        inverted ? "text-white" : "text-foreground",
        className,
      )}
    >
      <span className="text-brand">McRowin</span> Auto
    </Link>
  );
}
