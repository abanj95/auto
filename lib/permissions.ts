import type { Enums } from "@/lib/database.types";

// Extra areas an admin can give a poster on the Users page (profiles.permissions).
// Admins always have all of them. Enforced by requirePermission() and by RLS
// (private.has_permission, migration 020).

export const PERMISSIONS = {
  requests: {
    label: "Requests",
    description: "See and answer Vehicle Finder requests.",
  },
  homepage: {
    label: "Homepage",
    description: "Hero slides, homepage text, logo and site images.",
  },
  settings: {
    label: "Settings",
    description: "Phone, address, hours, About text, price disclaimer, Terms and Privacy.",
  },
} as const;
export type Permission = keyof typeof PERMISSIONS;
export const PERMISSION_KEYS = Object.keys(PERMISSIONS) as Permission[];

export function hasPermission(
  profile: { role: Enums<"user_role">; permissions: string[] },
  area: Permission,
) {
  return profile.role === "admin" || profile.permissions.includes(area);
}
