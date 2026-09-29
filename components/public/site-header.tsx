import { Phone } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/public/container";
import { Logo } from "@/components/public/logo";
import { MobileMenu } from "@/components/public/mobile-menu";
import { NAV_LINKS } from "@/components/public/nav-links";
import { Button } from "@/components/ui/button";
import { phoneHref } from "@/lib/format";
import { getSiteSettings } from "@/lib/public-data";

export async function SiteHeader() {
  const { phone } = await getSiteSettings();
  const tel = phone ? phoneHref(phone) : null;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <Container className="flex h-16 items-center gap-2">
        <Logo className="h-6 sm:h-7 md:h-8" />
        <nav aria-label="Main" className="ml-8 hidden gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          {phone && tel && (
            <Button asChild className="h-11 rounded-full px-4 font-semibold">
              <a href={`tel:${tel}`}>
                <Phone aria-hidden />
                <span className="sm:hidden">Call</span>
                <span className="hidden sm:inline">{phone}</span>
              </a>
            </Button>
          )}
          <MobileMenu phone={phone} telHref={tel} />
        </div>
      </Container>
    </header>
  );
}
