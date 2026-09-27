"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { NativeSelect } from "@/components/ui/native-select";
import { SORTS, type Sort } from "@/lib/validation/inventory";

export function SortSelect({ value }: { value: Sort }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(sort: string) {
    const params = new URLSearchParams(searchParams);
    params.delete("page");
    if (sort === "newest") params.delete("sort");
    else params.set("sort", sort);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <label className="flex items-center gap-2">
      <span className="sr-only sm:not-sr-only sm:text-sm sm:whitespace-nowrap sm:text-muted-foreground">
        Sort by
      </span>
      <NativeSelect value={value} onChange={(e) => onChange(e.target.value)} aria-label="Sort by">
        {Object.entries(SORTS).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </NativeSelect>
    </label>
  );
}
