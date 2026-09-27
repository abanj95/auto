import { NextResponse, type NextRequest } from "next/server";

import { purgeSoldVehicles } from "@/lib/purge-sold";

/**
 * Daily job (vercel.json cron): permanently delete cars sold more than 31 days
 * ago. Vercel sends `Authorization: Bearer $CRON_SECRET`; anything else is rejected.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await purgeSoldVehicles();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("purge-sold failed", error);
    return NextResponse.json({ ok: false, error: "Purge failed" }, { status: 500 });
  }
}
