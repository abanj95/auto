import { Mail, MapPin, MessageSquare, Phone } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/public/container";
import { HoursList } from "@/components/public/hours-list";
import { Logo } from "@/components/public/logo";
import { NAV_LINKS } from "@/components/public/nav-links";
import { phoneHref, smsHref } from "@/lib/format";
import { fullAddress, getSiteSettings, mapUrl } from "@/lib/public-data";

export async function SiteFooter() {
  const s = await getSiteSettings();
  const address = fullAddress(s);
  const map = mapUrl(s);
  const sms = s.sms_phone || s.phone;

  return (
    <footer className="mt-auto bg-neutral-950 text-neutral-300">
      <Container className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <Logo tone="light" className="h-7" />
          <p className="text-sm text-neutral-400">
            Quality pre-owned vehicles{s.city ? ` in ${s.city}` : ""}. Like new, without the new
            price.
          </p>
        </div>

        <div className="space-y-3 text-sm">
          <h2 className="font-semibold text-white">Visit</h2>
          {address && <p>{address}</p>}
          {map && (
            <a
              href={map}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-white underline-offset-4 hover:underline"
            >
              <MapPin className="size-4" aria-hidden /> Get directions
            </a>
          )}
          <HoursList hours={s.hours} className="text-neutral-400" />
        </div>

        <div className="space-y-3 text-sm">
          <h2 className="font-semibold text-white">Contact</h2>
          {s.phone && (
            <a
              href={`tel:${phoneHref(s.phone)}`}
              className="flex items-center gap-2 hover:text-white"
            >
              <Phone className="size-4" aria-hidden /> {s.phone}
            </a>
          )}
          {sms && (
            <a href={smsHref(sms)} className="flex items-center gap-2 hover:text-white">
              <MessageSquare className="size-4" aria-hidden /> Text us
            </a>
          )}
          {s.email && (
            <a
              href={`mailto:${s.email}`}
              className="flex items-center gap-2 break-all hover:text-white"
            >
              <Mail className="size-4 shrink-0" aria-hidden /> {s.email}
            </a>
          )}
          {s.facebook_url && (
            <a
              href={s.facebook_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block hover:text-white"
            >
              Facebook
            </a>
          )}
        </div>

        <nav aria-label="Footer" className="space-y-3 text-sm">
          <h2 className="font-semibold text-white">Explore</h2>
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="block hover:text-white">
              {link.label}
            </Link>
          ))}
        </nav>
      </Container>
      <Container className="border-t border-white/10 py-6 text-xs text-neutral-500">
        © {new Date().getFullYear()} {s.dealership_name}. All rights reserved.
      </Container>
    </footer>
  );
}
