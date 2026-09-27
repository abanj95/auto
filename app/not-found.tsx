import { SearchX } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/public/container";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Container className="flex flex-col items-center py-20 text-center sm:py-28">
          <SearchX className="size-12 text-muted-foreground" aria-hidden />
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl">
            We couldn&apos;t find that page
          </h1>
          <p className="mt-3 max-w-md text-muted-foreground">
            The vehicle may have been removed, or the link might be wrong. Take a look at
            what&apos;s on the lot right now.
          </p>
          <Button asChild size="lg" className="mt-8 h-12 text-base font-semibold">
            <Link href="/inventory">Browse inventory</Link>
          </Button>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
