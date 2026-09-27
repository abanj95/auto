"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_ITEMS } from "@/components/staff/nav-items";
import { cn } from "@/lib/utils";

// Hiding links is only for convenience; access is enforced on the server.
function useItems(isAdmin: boolean) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => isAdmin || !item.adminOnly);
  return items.map((item) => ({ ...item, active: item.isActive(pathname) }));
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
        {items.map(({ href, label, icon: Icon, active }) => (
          <li key={href} className="flex-1">
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </Link>
          </li>
        ))}
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
        {items.map(({ href, label, icon: Icon, active }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
