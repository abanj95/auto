import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/auth-paths";
import { ALLOW_INDEXING } from "@/lib/indexing";

export default function robots(): MetadataRoute.Robots {
  if (!ALLOW_INDEXING) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/admin" },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
