import "server-only";

import { createHmac } from "node:crypto";

/**
 * Keyed hash of an IP address, so stored rows never contain the raw IP but
 * repeat submissions from one address can still be spotted. Keyed with a
 * server-only secret (IP_HASH_SECRET, else CRON_SECRET), so the hash can't be
 * reversed by trying every IP.
 */
export function hashIp(ip: string) {
  const key = process.env.IP_HASH_SECRET || process.env.CRON_SECRET;
  if (!key || ip === "unknown") return null;
  return createHmac("sha256", key).update(`ip:${ip}`).digest("hex");
}
