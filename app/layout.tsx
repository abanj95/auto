import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "McRowin Auto",
    template: "%s | McRowin Auto",
  },
  description: "Quality used cars from McRowin Auto.",
  // Phone numbers are already real tel:/sms: links. Stop mobile browsers from
  // rewriting them (and other text) into their own links, which changes the
  // HTML before React hydrates it.
  formatDetection: { telephone: false, address: false, email: false, date: false },
};

export const viewport: Viewport = {
  themeColor: "#b91c1c",
  colorScheme: "light",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: Chrome on iOS adds __gcrremoteframetoken to <html>
    // before React loads. Only affects this element's own attributes.
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
