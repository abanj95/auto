import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Pages and route handlers only: skip static assets, images and link prefetches.
  matcher: [
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|vendor/|brand/|.*\\.(?:png|jpg|jpeg|gif|webp|avif|ico|js|css|txt|xml|webmanifest)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
