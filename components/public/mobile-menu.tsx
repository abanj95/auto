"use client";

import { Menu, Phone } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { NAV_LINKS } from "@/components/public/nav-links";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function MobileMenu({ phone, telHref }: { phone: string | null; telHref: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="size-11 md:hidden" aria-label="Open menu">
          <Menu className="size-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-4/5 max-w-xs">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col px-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="border-b py-4 text-lg font-semibold"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        {phone && telHref && (
          <div className="px-4">
            <Button asChild size="lg" className="h-12 w-full text-base">
              <a href={`tel:${telHref}`}>
                <Phone aria-hidden /> Call {phone}
              </a>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
