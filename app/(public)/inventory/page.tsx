import { ChevronLeft, ChevronRight, Phone, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/public/container";
import { FilterBar, FiltersSheetButton } from "@/components/public/inventory-filters";
import { PerPageSelect, RestoreSavedView, ViewToggle } from "@/components/public/results-controls";
import { SortSelect } from "@/components/public/sort-select";
import { VehicleGrid } from "@/components/public/vehicle-grid";
import { VehicleListRow } from "@/components/public/vehicle-list-row";
import { Button } from "@/components/ui/button";
import { phoneHref } from "@/lib/format";
import { getInventoryFacets, getSiteSettings, searchInventory } from "@/lib/public-data";
import { cn } from "@/lib/utils";
import {
  FILTER_KEYS,
  inventoryFiltersSchema,
  inventoryHref,
  type InventoryFilters as Filters,
  type View,
} from "@/lib/validation/inventory";

export const metadata: Metadata = {
  title: "Inventory",
  description: "Browse our used cars, trucks and SUVs. Filter by make, price, mileage and more.",
};

/** Without ?view (and no saved choice in this browser). */
const DEFAULT_VIEW: View = "list";

export default async function InventoryPage({ searchParams }: PageProps<"/inventory">) {
  const filters = inventoryFiltersSchema.parse(await searchParams);
  const [{ vehicles, total }, facets, settings] = await Promise.all([
    searchInventory(filters),
    getInventoryFacets(),
    getSiteSettings(),
  ]);
  const view = filters.view ?? DEFAULT_VIEW;
  const activeCount = FILTER_KEYS.filter((k) => filters[k] !== undefined).length;
  const totalPages = Math.max(1, Math.ceil(total / filters.per_page));
  const filterProps = { filters, facets, activeCount };
  // Remount the forms after navigation so they show the new URL's values.
  const formKey = JSON.stringify(filters);
  const clearHref = inventoryHref(
    filters,
    Object.fromEntries([...FILTER_KEYS, "page"].map((k) => [k, undefined])),
  );

  return (
    <Container className="py-8 sm:py-10">
      <RestoreSavedView hasView={filters.view !== undefined} current={view} />
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Inventory</h1>

      <div className="mt-6 space-y-4">
        <FilterBar key={formKey} {...filterProps} />

        {/* Results bar. Phones: [Filters] count [Clear] / sort + view / per page + pager. */}
        <div
          className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b pb-4"
          data-testid="results-bar"
        >
          <FiltersSheetButton key={formKey} {...filterProps} />
          <p className="mr-auto text-sm font-semibold" aria-live="polite">
            <span data-testid="result-count">{total}</span> {total === 1 ? "vehicle" : "vehicles"}
          </p>
          {activeCount > 0 && (
            <Button asChild variant="ghost" className="h-11 lg:hidden">
              <Link href={clearHref}>Clear filters</Link>
            </Button>
          )}
          <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-2 sm:w-auto">
            <div className="min-w-0 flex-1 sm:flex-none">
              <SortSelect value={filters.sort} />
            </div>
            <ViewToggle
              view={view}
              hrefs={{
                list: inventoryHref(filters, { view: "list" }),
                grid: inventoryHref(filters, { view: "grid" }),
              }}
            />
          </div>
          <div className="flex w-full items-center justify-between gap-3 sm:w-auto">
            <PerPageSelect value={filters.per_page} />
            <Pager filters={filters} page={filters.page} totalPages={totalPages} compact />
          </div>
        </div>

        {vehicles.length > 0 ? (
          <>
            {view === "list" ? (
              <div className="divide-y" data-testid="vehicle-list">
                {vehicles.map((v, i) => (
                  <VehicleListRow key={v.id} vehicle={v} eager={i < 2} />
                ))}
              </div>
            ) : (
              <VehicleGrid vehicles={vehicles} eagerCount={2} />
            )}
            {totalPages > 1 && (
              <div className="flex justify-center pt-6">
                <Pager filters={filters} page={filters.page} totalPages={totalPages} />
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center rounded-2xl border border-dashed px-6 py-16 text-center">
            <SearchX className="size-10 text-muted-foreground" aria-hidden />
            <h2 className="mt-4 text-xl font-bold">No vehicles match your search</h2>
            <p className="mt-2 max-w-sm text-muted-foreground">
              Try removing a filter or two. Or tell us what you want and we&apos;ll find it for you.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button asChild className="h-11">
                <Link href="/vehicle-finder">Use the Vehicle Finder</Link>
              </Button>
              {settings.phone && (
                <Button asChild variant="outline" className="h-11">
                  <a href={`tel:${phoneHref(settings.phone)}`}>
                    <Phone aria-hidden /> {settings.phone}
                  </a>
                </Button>
              )}
              {activeCount > 0 && (
                <Button asChild variant="ghost" className="h-11">
                  <Link href={clearHref}>Clear filters</Link>
                </Button>
              )}
            </div>
          </div>
        )}

        <p
          className="pt-4 text-center text-xs text-muted-foreground"
          data-testid="price-disclaimer"
        >
          {settings.price_disclaimer}
        </p>
      </div>
    </Container>
  );
}

/** ‹ Page X of Y ›. Compact (icon-only buttons) in the results bar. */
function Pager({
  filters,
  page,
  totalPages,
  compact,
}: {
  filters: Filters;
  page: number;
  totalPages: number;
  compact?: boolean;
}) {
  const size = compact ? "h-10" : "h-11";
  const prev = page > 1 ? inventoryHref(filters, { page: page - 1 }) : null;
  const next = page < totalPages ? inventoryHref(filters, { page: page + 1 }) : null;
  const link = (href: string | null, label: string, children: React.ReactNode) => (
    <Button
      asChild
      variant="outline"
      size={compact ? "icon" : "default"}
      className={cn(size, compact && "w-10")}
    >
      {href ? (
        <Link href={href} aria-label={label}>
          {children}
        </Link>
      ) : (
        <span aria-disabled="true" aria-label={label} className="pointer-events-none opacity-40">
          {children}
        </span>
      )}
    </Button>
  );

  return (
    <nav aria-label={compact ? "Pages" : "Pagination"} className="flex items-center gap-2">
      {link(
        prev,
        "Previous page",
        compact ? (
          <ChevronLeft aria-hidden />
        ) : (
          <>
            <ChevronLeft aria-hidden /> Previous
          </>
        ),
      )}
      <span className="text-sm whitespace-nowrap text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      {link(
        next,
        "Next page",
        compact ? (
          <ChevronRight aria-hidden />
        ) : (
          <>
            Next <ChevronRight aria-hidden />
          </>
        ),
      )}
    </nav>
  );
}
