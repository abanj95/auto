import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const nextConfig: NextConfig = {
  images: {
    // Vehicle photos and site images (hero, About photo) from the public Supabase buckets only.
    remotePatterns: supabaseUrl
      ? ["vehicle-photos", "site-images"].map(
          (bucket) =>
            new URL(`${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/**`),
        )
      : [],
  },
  // Lets phones on the same Wi-Fi load the dev server (http://192.168.x.x:3000).
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local"],
};

export default nextConfig;
