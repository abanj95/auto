import { z } from "zod";

import { PERMISSION_KEYS, type Permission } from "@/lib/permissions";

export const inviteSchema = z.object({
  name: z.string().trim().min(1, "Enter their name.").max(80),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.")),
});
export type InviteInput = z.input<typeof inviteSchema>;

/** Poster access areas (Users page). Unique, known keys only, stored in a fixed order. */
export const permissionsSchema = z
  .array(z.enum(PERMISSION_KEYS as [Permission, ...Permission[]]))
  .max(PERMISSION_KEYS.length)
  .transform((list) => PERMISSION_KEYS.filter((k) => list.includes(k)));
