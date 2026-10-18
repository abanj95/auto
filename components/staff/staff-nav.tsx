"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_ITEMS } from "@/components/staff/nav-items";
import { cn } from "@/lib/utils";

// Items a poster can't use stay visible but greyed out. This is only UI;
// access is enforced on the server (requireAdmin / requirePermission) and by RLS.
function useItems(access: Access) {
  const pathname = usePathname();
  return NAV_ITEMS.map((item) => ({
    ...item,
    active: item.isActive(pathname),
    locked:
      !access.isAdmin &&
      (!!item.adminOnly || (!!item.permission && !access.permissions.includes(item.permission))),
  }));
}

type Access = { isAdmin: boolean; permissions: string[] };

/** Small count on a nav item, e.g. new Vehicle Finder requests. */
function CountBadge({ count, className }: { count?: number; className?: string }) {
  if (!count) return null;
  return (
    <span
      className={cn(
        "min-w-5 rounded-full bg-primary px-1.5 text-center text-[11px] leading-5 font-bold text-primary-foreground",
        className,
      )}
    >
      {count > 99 ? "99+" : count}
      <span className="sr-only"> new</span>
    </span>
  );
}

type Badges = Record<string, number>;

/** Fixed bottom tab bar, phones only. */
export function BottomTabs({ access, badges = {} }: { access: Access; badges?: Badges }) {
  const items = useItems(access).filter((item) => !item.desktopOnly);
  return (
    <nav
      aria-label="Staff"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex">
        {items.map(({ href, label, icon: Icon, active, locked, adminOnly }) => {
          const className =
            "flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium";
          return (
            <li key={href} className="flex-1">
              {locked ? (
                <span
                  role="link"
                  aria-disabled="true"
                  aria-label={`${label} (${adminOnly ? "admin only" : "no access"})`}
                  title={adminOnly ? "Admin only" : "Ask an admin for access"}
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
                  <span className="relative">
                    <Icon className="size-5" aria-hidden />
                    <CountBadge count={badges[href]} className="absolute -top-2 left-3" />
                  </span>
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
export function Sidebar({ access, badges = {} }: { access: Access; badges?: Badges }) {
  const items = useItems(access);
  return (
    <nav aria-label="Staff" className="hidden w-56 shrink-0 border-r p-3 md:block">
      <ul className="space-y-1">
        {items.map(({ href, label, icon: Icon, active, locked, adminOnly }) => {
          const className = "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium";
          return (
            <li key={href}>
              {locked ? (
                <span
                  role="link"
                  aria-disabled="true"
                  aria-label={`${label} (${adminOnly ? "admin only" : "no access"})`}
                  title={adminOnly ? "Admin only" : "Ask an admin for access"}
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
                  <CountBadge count={badges[href]} className="ml-auto" />
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
