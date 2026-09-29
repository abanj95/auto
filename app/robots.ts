import type { MetadataRoute } from "next";

import { ALLOW_INDEXING } from "@/lib/indexing";

export default function robots(): MetadataRoute.Robots {
  if (!ALLOW_INDEXING) return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/", disallow: "/admin" } };
}
