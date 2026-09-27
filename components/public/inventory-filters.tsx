"use client";

import { SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";

import { CleanGetForm } from "@/components/public/clean-get-form";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Constants } from "@/lib/database.types";
import { BODY_TYPE_LABELS, DRIVETRAIN_LABELS, FUEL_LABELS, formatPrice } from "@/lib/format";
import { MILEAGE_STEPS, PRICE_STEPS, type InventoryFilters } from "@/lib/validation/inventory";

type Facets = { makes: string[]; modelsByMake: Record<string, string[]>; years: number[] };

type Props = { filters: InventoryFilters; facets: Facets; activeCount: number };

/** Desktop (lg+): filters in a left sidebar. */
export function FiltersSidebar(props: Props) {
  return (
    <aside className="hidden w-64 shrink-0 lg:block">
      <h2 className="mb-4 text-lg font-bold">Filters</h2>
      <FilterForm {...props} />
    </aside>
  );
}

/** Phones/tablets: a "Filters" button that opens the form in a bottom sheet. */
export function FiltersSheetButton(props: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="h-11 lg:hidden">
          <SlidersHorizontal aria-hidden />
          Filters{props.activeCount > 0 && ` (${props.activeCount})`}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[90dvh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription className="sr-only">Narrow down the vehicle list.</SheetDescription>
        </SheetHeader>
        <div className="overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <FilterForm {...props} onApplied={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function FilterForm({ filters: f, facets, onApplied }: Props & { onApplied?: () => void }) {
  const uid = useId(); // Unique per copy (sidebar + sheet both render this form).
  const id = (name: string) => `${uid}-${name}`;
  const [make, setMake] = useState(f.make ?? "");
  const models = make ? (facets.modelsByMake[make] ?? []) : [];

  return (
    <CleanGetForm action="/inventory" onNavigate={onApplied} className="space-y-4">
      {/* Keep the chosen sort when filtering; page always resets to 1. */}
      {f.sort !== "newest" && (
        <input type="hidden" name="sort" value={f.sort} suppressHydrationWarning />
      )}

      <Field label="Make" htmlFor={id("make")}>
        <NativeSelect
          id={id("make")}
          name="make"
          value={make}
          onChange={(e) => setMake(e.target.value)}
        >
          <option value="">Any make</option>
          {facets.makes.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <Field label="Model" htmlFor={id("model")}>
        <NativeSelect
          key={make /* reset when make changes */}
          id={id("model")}
          name="model"
          defaultValue={make === f.make ? (f.model ?? "") : ""}
          disabled={!make}
        >
          <option value="">{make ? "Any model" : "Choose a make first"}</option>
          {models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Year from" htmlFor={id("year_min")}>
          <NativeSelect id={id("year_min")} name="year_min" defaultValue={f.year_min ?? ""}>
            <option value="">Any</option>
            {[...facets.years].reverse().map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Year to" htmlFor={id("year_max")}>
          <NativeSelect id={id("year_max")} name="year_max" defaultValue={f.year_max ?? ""}>
            <option value="">Any</option>
            {facets.years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Min price" htmlFor={id("price_min")}>
          <NativeSelect id={id("price_min")} name="price_min" defaultValue={f.price_min ?? ""}>
            <option value="">No min</option>
            {PRICE_STEPS.map((p) => (
              <option key={p} value={p}>
                {formatPrice(p)}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Max price" htmlFor={id("price_max")}>
          <NativeSelect id={id("price_max")} name="price_max" defaultValue={f.price_max ?? ""}>
            <option value="">No max</option>
            {PRICE_STEPS.map((p) => (
              <option key={p} value={p}>
                {formatPrice(p)}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>

      <Field label="Max mileage" htmlFor={id("mileage_max")}>
        <NativeSelect id={id("mileage_max")} name="mileage_max" defaultValue={f.mileage_max ?? ""}>
          <option value="">Any mileage</option>
          {MILEAGE_STEPS.map((m) => (
            <option key={m} value={m}>
              Under {m.toLocaleString("en-US")} mi
            </option>
          ))}
        </NativeSelect>
      </Field>

      <Field label="Body type" htmlFor={id("body")}>
        <NativeSelect id={id("body")} name="body" defaultValue={f.body ?? ""}>
          <option value="">Any body type</option>
          {Constants.public.Enums.vehicle_body_type.map((b) => (
            <option key={b} value={b}>
              {BODY_TYPE_LABELS[b]}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Drivetrain" htmlFor={id("drivetrain")}>
          <NativeSelect id={id("drivetrain")} name="drivetrain" defaultValue={f.drivetrain ?? ""}>
            <option value="">Any</option>
            {Constants.public.Enums.vehicle_drivetrain.map((d) => (
              <option key={d} value={d}>
                {DRIVETRAIN_LABELS[d]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Fuel" htmlFor={id("fuel")}>
          <NativeSelect id={id("fuel")} name="fuel" defaultValue={f.fuel ?? ""}>
            <option value="">Any</option>
            {Constants.public.Enums.vehicle_fuel_type.map((x) => (
              <option key={x} value={x}>
                {FUEL_LABELS[x]}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" size="lg" className="h-11 flex-1 font-semibold">
          Show results
        </Button>
        <Button asChild variant="ghost" size="lg" className="h-11">
          <Link href="/inventory" onClick={onApplied}>
            Clear
          </Link>
        </Button>
      </div>
    </CleanGetForm>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-semibold">
        {label}
      </label>
      {children}
    </div>
  );
}
