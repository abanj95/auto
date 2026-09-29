import { LogOut } from "lucide-react";
import { Logo } from "@/components/public/logo";

import { signOut } from "@/app/(staff)/admin/(app)/actions";
import { Button } from "@/components/ui/button";

export function TopBar({ name }: { name: string }) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-background px-4">
      <Logo href="/admin" className="h-6" />
      <span className="ml-auto truncate text-sm text-muted-foreground">{name}</span>
      <form action={signOut} suppressHydrationWarning>
        <Button type="submit" variant="ghost" size="sm" className="h-10">
          <LogOut aria-hidden />
          <span className="sr-only sm:not-sr-only">Sign out</span>
        </Button>
      </form>
    </header>
  );
}
