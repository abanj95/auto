import { z } from "zod";

/** site_settings.hours: [{ "days": "Mon–Fri", "hours": "9:00 AM – 6:00 PM" }, …] */
export const hoursSchema = z.array(
  z.object({ days: z.string().trim().min(1), hours: z.string().trim().min(1) }),
);
export type Hours = z.infer<typeof hoursSchema>;
