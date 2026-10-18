"use client";

import { LayoutGrid, List } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import { DEFAULT_PER_PAGE, PER_PAGE_OPTIONS, VIEWS, type View } from "@/lib/validation/inventory";

const VIEW_KEY = "inventory-view";

function readSavedView(): View | null {
  try {
    const v = localStorage.getItem(VIEW_KEY);
    return VIEWS.includes(v as View) ? (v as View) : null;
  } catch {
    return null; // Storage blocked (private mode, settings).
  }
}

function saveView(view: View) {
  try {
    localStorage.setItem(VIEW_KEY, view);
  } catch {}
}

/** Per page: 12 / 24 / 48 (resets to page 1). */
export function PerPageSelect({ value }: { value: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(next: string) {
    const params = new URLSearchParams(searchParams);
    params.delete("page");
    if (Number(next) === DEFAULT_PER_PAGE) params.delete("per_page");
    else params.set("per_page", next);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <label className="flex items-center gap-2">
      <span className="text-sm whitespace-nowrap text-muted-foreground">Per page</span>
      <NativeSelect
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Vehicles per page"
        className="w-20"
      >
        {PER_PAGE_OPTIONS.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </NativeSelect>
    </label>
  );
}

/** List / Grid toggle. The choice goes in the URL (?view=) and in localStorage. */
export function ViewToggle({ view, hrefs }: { view: View; hrefs: Record<View, string> }) {
  const options = [
    { value: "list" as const, label: "List", icon: List },
    { value: "grid" as const, label: "Grid", icon: LayoutGrid },
  ];
  return (
    <div role="group" aria-label="View" className="flex rounded-md border p-0.5">
      {options.map(({ value, label, icon: Icon }) => (
        <Link
          key={value}
          href={hrefs[value]}
          scroll={false}
          onClick={() => saveView(value)}
          aria-pressed={view === value}
          aria-label={`${label} view`}
          className={cn(
            "flex h-9 items-center gap-1.5 rounded px-3 text-sm font-semibold transition-colors",
            view === value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Icon className="size-4" aria-hidden />
          <span className="hidden sm:inline">{label}</span>
        </Link>
      ))}
    </div>
  );
}

/**
 * No ?view in the URL: switch to the view this browser chose last time (if it
 * differs from the default). Shared links with ?view= always win.
 */
export function RestoreSavedView({ hasView, current }: { hasView: boolean; current: View }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (hasView) return;
    const saved = readSavedView();
    if (!saved || saved === current) return;
    const params = new URLSearchParams(searchParams);
    params.set("view", saved);
    router.replace(`${pathname}?${params}`, { scroll: false });
  }, [hasView, current, pathname, router, searchParams]);

  return null;
}
