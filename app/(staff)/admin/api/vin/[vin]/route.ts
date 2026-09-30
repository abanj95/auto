import { NextResponse } from "next/server";

import { checkStaff } from "@/lib/auth";
import { rateLimit } from "@/lib/security/rate-limit";
import { decodeVin } from "@/lib/nhtsa";
import { normalizeVin } from "@/lib/validation/vehicle";

/** GET /admin/api/vin/{vin} → { ok, data } — staff only. Prefill data from NHTSA. */
export async function GET(_request: Request, ctx: RouteContext<"/admin/api/vin/[vin]">) {
  const auth = await checkStaff();
  if ("error" in auth) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: auth.error });
  }
  // 60 lookups per 10 minutes per user (each one calls NHTSA).
  if (!(await rateLimit(`vin:user:${auth.staff.userId}`, 60, 10 * 60))) {
    return NextResponse.json(
      { ok: false, error: "Too many VIN lookups. Wait a few minutes." },
      { status: 429 },
    );
  }

  const vin = normalizeVin((await ctx.params).vin);
  if (vin.length !== 17) {
    return NextResponse.json(
      { ok: false, error: "A VIN has 17 letters and numbers." },
      { status: 400 },
    );
  }

  try {
    const data = await decodeVin(vin);
    if (!data) {
      return NextResponse.json({
        ok: false,
        error: "No details found for this VIN — fill them in below.",
      });
    }
    return NextResponse.json({ ok: true, data });
  } catch {
    return NextResponse.json({
      ok: false,
      error: "Couldn't look up this VIN right now — fill in the details below.",
    });
  }
}
