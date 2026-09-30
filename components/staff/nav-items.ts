import { Activity, Car, CirclePlus, House, Settings, Users, type LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  /** Sidebar only (the phone tab bar has room for five); reachable from Users on phones. */
  desktopOnly?: boolean;
  /** Extra check so /admin/vehicles doesn't also highlight on /admin/vehicles/new. */
  isActive: (pathname: string) => boolean;
};

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/admin/vehicles",
    label: "Vehicles",
    icon: Car,
    isActive: (p) => p.startsWith("/admin/vehicles") && p !== "/admin/vehicles/new",
  },
  {
    href: "/admin/vehicles/new",
    label: "Add",
    icon: CirclePlus,
    isActive: (p) => p === "/admin/vehicles/new",
  },
  {
    href: "/admin/homepage",
    label: "Homepage",
    icon: House,
    adminOnly: true,
    isActive: (p) => p.startsWith("/admin/homepage"),
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: Settings,
    adminOnly: true,
    isActive: (p) => p.startsWith("/admin/settings"),
  },
  {
    href: "/admin/users",
    label: "Users",
    icon: Users,
    adminOnly: true,
    isActive: (p) => p.startsWith("/admin/users"),
  },
  {
    href: "/admin/activity",
    label: "Activity",
    icon: Activity,
    adminOnly: true,
    desktopOnly: true,
    isActive: (p) => p.startsWith("/admin/activity"),
  },
];
