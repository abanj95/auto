"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Input } from "@/components/ui/input";

/** Search box that updates ?q= on submit (keeps the status filter). */
export function VehicleSearch({ initial }: { initial: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(initial);

  function go(q: string) {
    const next = new URLSearchParams(params);
    if (q.trim()) next.set("q", q.trim());
    else next.delete("q");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        go(value);
      }}
      className="relative"
      suppressHydrationWarning // Chrome on iOS adds autofill attributes.
    >
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        enterKeyHint="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Stock #, VIN, make or model"
        aria-label="Search vehicles"
        className="h-11 pr-10 pl-9 text-base"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            setValue("");
            go("");
          }}
          className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center text-muted-foreground"
          aria-label="Clear search"
        >
          <X className="size-4" />
        </button>
      )}
    </form>
  );
}
