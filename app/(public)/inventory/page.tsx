import { ChevronLeft, ChevronRight, Phone, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/public/container";
import { FiltersSheetButton, FiltersSidebar } from "@/components/public/inventory-filters";
import { SortSelect } from "@/components/public/sort-select";
import { VehicleGrid } from "@/components/public/vehicle-grid";
import { Button } from "@/components/ui/button";
import { phoneHref } from "@/lib/format";
import { getInventoryFacets, getSiteSettings, searchInventory } from "@/lib/public-data";
import {
  FILTER_KEYS,
  inventoryFiltersSchema,
  PAGE_SIZE,
  type InventoryFilters as Filters,
} from "@/lib/validation/inventory";

export const metadata: Metadata = {
  title: "Inventory",
  description: "Browse our used cars, trucks and SUVs. Filter by make, price, mileage and more.",
};

export default async function InventoryPage({ searchParams }: PageProps<"/inventory">) {
  const filters = inventoryFiltersSchema.parse(await searchParams);
  const [{ vehicles, total }, facets, settings] = await Promise.all([
    searchInventory(filters),
    getInventoryFacets(),
    getSiteSettings(),
  ]);
  const activeCount = FILTER_KEYS.filter((k) => filters[k] !== undefined).length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filterProps = { filters, facets, activeCount };
  // Remount the forms after navigation so they show the new URL's values.
  const formKey = JSON.stringify(filters);

  return (
    <Container className="py-8 sm:py-10">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Inventory</h1>

      <div className="mt-6 flex gap-10">
        <FiltersSidebar key={formKey} {...filterProps} />

        <div className="min-w-0 flex-1">
          {/* Phones: [Filters] count [Clear] / sort on its own row. sm+: one row. */}
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <FiltersSheetButton key={formKey} {...filterProps} />
            <p
              className="mr-auto px-1 text-sm font-medium text-muted-foreground"
              aria-live="polite"
            >
              <span data-testid="result-count">{total}</span> {total === 1 ? "vehicle" : "vehicles"}
            </p>
            {activeCount > 0 && (
              <Button asChild variant="ghost" className="h-11">
                <Link href="/inventory">Clear filters</Link>
              </Button>
            )}
            <div className="w-full sm:w-auto">
              <SortSelect value={filters.sort} />
            </div>
          </div>

          {vehicles.length > 0 ? (
            <>
              <VehicleGrid vehicles={vehicles} priorityCount={2} />
              <Pagination filters={filters} page={filters.page} totalPages={totalPages} />
            </>
          ) : (
            <div className="flex flex-col items-center rounded-2xl border border-dashed px-6 py-16 text-center">
              <SearchX className="size-10 text-muted-foreground" aria-hidden />
              <h2 className="mt-4 text-xl font-bold">No vehicles match your search</h2>
              <p className="mt-2 max-w-sm text-muted-foreground">
                Try removing a filter or two. Or give us a call — our inventory changes fast and we
                may have something coming in.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {settings.phone && (
                  <Button asChild className="h-11">
                    <a href={`tel:${phoneHref(settings.phone)}`}>
                      <Phone aria-hidden /> {settings.phone}
                    </a>
                  </Button>
                )}
                {activeCount > 0 && (
                  <Button asChild variant="outline" className="h-11">
                    <Link href="/inventory">Clear filters</Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}

function Pagination({
  filters,
  page,
  totalPages,
}: {
  filters: Filters;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  const hrefFor = (p: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined || key === "page") continue;
      if (key === "sort" && value === "newest") continue;
      params.set(key, String(value));
    }
    if (p > 1) params.set("page", String(p));
    const query = params.toString();
    return query ? `/inventory?${query}` : "/inventory";
  };

  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-3">
      <Button asChild variant="outline" className="h-11" aria-disabled={page <= 1}>
        {page > 1 ? (
          <Link href={hrefFor(page - 1)}>
            <ChevronLeft aria-hidden /> Previous
          </Link>
        ) : (
          <span className="pointer-events-none opacity-50">
            <ChevronLeft aria-hidden /> Previous
          </span>
        )}
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <Button asChild variant="outline" className="h-11">
        {page < totalPages ? (
          <Link href={hrefFor(page + 1)}>
            Next <ChevronRight aria-hidden />
          </Link>
        ) : (
          <span className="pointer-events-none opacity-50">
            Next <ChevronRight aria-hidden />
          </span>
        )}
      </Button>
    </nav>
  );
}
