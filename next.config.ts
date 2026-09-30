import type { NextConfig } from "next";

import { validateEnv } from "./lib/env";

// Fail fast (dev, build, start) on missing or wrong environment variables.
validateEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

// Static security headers for every response. The Content-Security-Policy
// needs a per-request nonce, so it's set in proxy.ts instead.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // No camera anywhere: VINs are typed (there is no VIN scanner).
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), browsing-topics=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // Legacy browsers; CSP frame-ancestors 'none' covers modern ones.
  { key: "X-Frame-Options", value: "DENY" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    // Vehicle photos and site images (hero, About photo) from the public Supabase buckets only.
    remotePatterns: supabaseUrl
      ? ["vehicle-photos", "site-images"].map(
          (bucket) =>
            new URL(`${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/**`),
        )
      : [],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Lets phones on the same Wi-Fi load the dev server (http://192.168.x.x:3000).
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local"],
};

export default nextConfig;
