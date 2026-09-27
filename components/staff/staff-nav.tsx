"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_ITEMS } from "@/components/staff/nav-items";
import { cn } from "@/lib/utils";

// Admin-only items stay visible but greyed out for posters. This is only UI;
// access is enforced on the server (requireAdmin) and by RLS.
function useItems(isAdmin: boolean) {
  const pathname = usePathname();
  return NAV_ITEMS.map((item) => ({
    ...item,
    active: item.isActive(pathname),
    locked: !!item.adminOnly && !isAdmin,
  }));
}

/** Fixed bottom tab bar, phones only. */
export function BottomTabs({ isAdmin }: { isAdmin: boolean }) {
  const items = useItems(isAdmin);
  return (
    <nav
      aria-label="Staff"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex">
        {items.map(({ href, label, icon: Icon, active, locked }) => {
          const className =
            "flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium";
          return (
            <li key={href} className="flex-1">
              {locked ? (
                <span
                  role="link"
                  aria-disabled="true"
                  aria-label={`${label} (admin only)`}
                  title="Admin only"
                  className={cn(className, "cursor-not-allowed text-muted-foreground/40")}
                >
                  <span className="relative">
                    <Icon className="size-5" aria-hidden />
                    <Lock className="absolute -right-1.5 -bottom-1 size-3" aria-hidden />
                  </span>
                  {label}
                </span>
              ) : (
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(className, active ? "text-primary" : "text-muted-foreground")}
                >
                  <Icon className="size-5" aria-hidden />
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Left sidebar, tablet/desktop only. */
export function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const items = useItems(isAdmin);
  return (
    <nav aria-label="Staff" className="hidden w-56 shrink-0 border-r p-3 md:block">
      <ul className="space-y-1">
        {items.map(({ href, label, icon: Icon, active, locked }) => {
          const className = "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium";
          return (
            <li key={href}>
              {locked ? (
                <span
                  role="link"
                  aria-disabled="true"
                  aria-label={`${label} (admin only)`}
                  title="Admin only"
                  className={cn(className, "cursor-not-allowed text-muted-foreground/40")}
                >
                  <Icon className="size-4" aria-hidden />
                  {label}
                  <Lock className="ml-auto size-3.5" aria-hidden />
                </span>
              ) : (
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    className,
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
