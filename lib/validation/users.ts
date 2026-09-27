import { z } from "zod";

export const inviteSchema = z.object({
  name: z.string().trim().min(1, "Enter their name.").max(80),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.")),
});
export type InviteInput = z.input<typeof inviteSchema>;
