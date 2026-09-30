import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { connection } from "next/server";

import { siteUrl } from "@/lib/auth-paths";
import { ALLOW_INDEXING } from "@/lib/indexing";
import { getSiteSettings } from "@/lib/public-data";
import { siteImageUrl } from "@/lib/site-images";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

// Favicon and default share image come from site settings (/admin/homepage),
// with public/favicon.ico as the fallback.
export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings();
  const favicon = siteImageUrl(s.favicon_path) ?? "/favicon.ico";
  const shareImage = siteImageUrl(s.og_default_image_path);
  return {
    metadataBase: new URL(siteUrl()),
    title: {
      default: "McRowin Auto",
      template: "%s | McRowin Auto",
    },
    description: "Quality used cars from McRowin Auto.",
    icons: { icon: favicon, apple: s.favicon_path ? favicon : undefined },
    openGraph: shareImage ? { images: [shareImage] } : undefined,
    // Until launch (NEXT_PUBLIC_ALLOW_INDEXING=true), keep every page out of search results.
    robots: ALLOW_INDEXING ? undefined : { index: false, follow: false },
    // Phone numbers are already real tel:/sms: links. Stop mobile browsers from
    // rewriting them (and other text) into their own links, which changes the
    // HTML before React hydrates it.
    formatDetection: { telephone: false, address: false, email: false, date: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#b91c1c",
  colorScheme: "light",
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Every page is rendered per request so it gets the CSP nonce from proxy.ts
  // (Next.js adds it to its scripts). See docs/security-audit.md (M1).
  await connection();
  return (
    // suppressHydrationWarning: Chrome on iOS adds __gcrremoteframetoken to <html>
    // before React loads. Only affects this element's own attributes.
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
