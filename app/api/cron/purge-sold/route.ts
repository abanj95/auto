import { timingSafeEqual } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { purgeSoldVehicles } from "@/lib/purge-sold";
import { createAdminClient } from "@/lib/supabase/admin";

function authorized(header: string | null, secret: string | undefined) {
  if (!secret || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/**
 * Daily job (vercel.json cron): permanently delete cars sold more than 31 days
 * ago, and clear old rate-limit / session rows. Vercel sends
 * `Authorization: Bearer $CRON_SECRET`; anything else is rejected.
 */
export async function GET(request: NextRequest) {
  if (!authorized(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await purgeSoldVehicles();
    const { error } = await createAdminClient().rpc("cleanup_security_tables");
    if (error) console.error("cleanup_security_tables failed", error.code);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("purge-sold failed", error);
    return NextResponse.json({ ok: false, error: "Purge failed" }, { status: 500 });
  }
}
