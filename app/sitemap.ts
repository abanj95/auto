import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/auth-paths";

// Public pages only. Vehicle pages and old-site redirects come with the SEO stage.
const PATHS = ["/", "/inventory", "/vehicle-finder", "/about", "/contact", "/terms", "/privacy"];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return PATHS.map((path) => ({ url: `${base}${path === "/" ? "" : path}` }));
}
