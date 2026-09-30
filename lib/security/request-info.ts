import "server-only";

import { headers } from "next/headers";

/** Client IP and user agent of the current request (Vercel sets x-forwarded-for / x-real-ip). */
export async function requestInfo() {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = (h.get("x-real-ip") ?? forwarded ?? "unknown").slice(0, 64);
  const userAgent = (h.get("user-agent") ?? "").slice(0, 400);
  return { ip, userAgent };
}
