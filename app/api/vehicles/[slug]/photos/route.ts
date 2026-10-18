import { NextResponse } from "next/server";
import { z } from "zod";

import { getVehiclePhotos } from "@/lib/public-data";

const slugSchema = z.string().regex(/^[a-z0-9-]{1,200}$/);

/**
 * Public, read-only: photo URLs of one listed vehicle, fetched when a visitor
 * taps "Photos (N)" on the inventory page. Uses the cookie-free anon client,
 * so RLS hides drafts exactly as for any visitor.
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/vehicles/[slug]/photos">) {
  const { slug } = await ctx.params;
  if (!slugSchema.safeParse(slug).success) {
    return NextResponse.json({ photos: [] }, { status: 404 });
  }
  try {
    const photos = await getVehiclePhotos(slug);
    return NextResponse.json(
      { photos },
      { headers: { "Cache-Control": "public, max-age=60, s-maxage=60" } },
    );
  } catch (error) {
    console.error("vehicle photos failed", error);
    return NextResponse.json({ photos: [] }, { status: 500 });
  }
}
