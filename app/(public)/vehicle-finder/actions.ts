"use server";

import { after } from "next/server";

import { notifyNewRequest } from "@/lib/notify";
import { getSiteSettings } from "@/lib/public-data";
import { hashIp } from "@/lib/security/ip-hash";
import { rateLimit } from "@/lib/security/rate-limit";
import { requestInfo } from "@/lib/security/request-info";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  vehicleRequestSchema,
  type VehicleRequestFormValues,
} from "@/lib/validation/vehicle-request";

export type FinderResult =
  { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

const PER_IP_PER_HOUR = 3;

/**
 * Public Vehicle Finder submission. Visitors have no access to vehicle_requests,
 * so the row is inserted with the secret key, and only after the honeypot, the
 * per-IP rate limit, Turnstile and Zod validation have all passed.
 */
export async function submitVehicleRequest(
  values: VehicleRequestFormValues,
  extra: { website: string; captchaToken: string },
): Promise<FinderResult> {
  // Honeypot: a hidden field people never see. Pretend it worked.
  if (extra.website) return { ok: true };

  const { ip } = await requestInfo();
  if (!(await rateLimit(`finder:ip:${ip}`, PER_IP_PER_HOUR, 60 * 60))) {
    return {
      ok: false,
      error: "You've sent several requests in the last hour. Please call us or try again later.",
    };
  }
  if (!(await verifyTurnstile(extra.captchaToken, ip))) {
    return { ok: false, error: "Please complete the “I'm human” check and try again." };
  }

  const parsed = vehicleRequestSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[issue.path.join(".")] ??= issue.message;
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
  }

  const { data, error } = await createAdminClient()
    .from("vehicle_requests")
    .insert({ ...parsed.data, ip_hash: hashIp(ip) })
    .select("id")
    .single();
  if (error) {
    console.error("vehicle request insert failed", error.code);
    return { ok: false, error: "Something went wrong. Please try again, or give us a call." };
  }

  // Email after the response is sent, so a slow or failing email never blocks the visitor.
  const { dealership_name } = await getSiteSettings();
  after(() => notifyNewRequest(data.id, parsed.data, dealership_name));
  return { ok: true };
}
