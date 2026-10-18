import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/** Vehicle Finder requests are deleted this long after they're closed (see the privacy policy). */
export const REQUEST_RETENTION_MONTHS = 12;

/** Delete requests closed more than 12 months ago. Trusted server job — uses the secret key. */
export async function purgeClosedRequests() {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - REQUEST_RETENTION_MONTHS);
  const { data, error } = await createAdminClient()
    .from("vehicle_requests")
    .delete()
    .eq("status", "closed")
    .lt("closed_at", cutoff.toISOString())
    .select("id");
  if (error) throw error;
  return { requestsDeleted: data.length };
}
