import { Car, CirclePlus, Settings, Users, type LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
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
];
