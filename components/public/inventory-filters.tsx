"use client";

import { RotateCcw, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useId, useRef, useState } from "react";

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
import {
  DEFAULT_PER_PAGE,
  FILTER_KEYS,
  inventoryHref,
  MILEAGE_STEPS,
  PRICE_STEPS,
  type InventoryFilters,
} from "@/lib/validation/inventory";

type Facets = { makes: string[]; modelsByMake: Record<string, string[]>; years: number[] };

type Props = { filters: InventoryFilters; facets: Facets; activeCount: number };

/**
 * Desktop (lg+): one row of the main filters across the top. Each change
 * applies at once (plain GET form underneath, so it also works without
 * JavaScript via the Apply button). Other filters set from the phone sheet
 * (year to, min price, drivetrain, fuel) are kept as hidden fields.
 */
export function FilterBar({ filters: f, facets, activeCount }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [make, setMake] = useState(f.make ?? "");
  const models = make ? (facets.modelsByMake[make] ?? []) : [];
  const submit = () => formRef.current?.requestSubmit();
  const uid = useId();
  const barId = (name: string) => `${uid}-bar-${name}`;

  return (
    <CleanGetForm
      ref={formRef}
      action="/inventory"
      aria-label="Filter vehicles"
      className="hidden items-end gap-3 rounded-xl border bg-card p-3 shadow-sm lg:flex"
      data-testid="filter-bar"
    >
      <KeptFields f={f} skip={["body", "year_min", "make", "model", "mileage_max", "price_max"]} />
      <BarField label="Body type" id={barId("body")}>
        <NativeSelect id={barId("body")} name="body" defaultValue={f.body ?? ""} onChange={submit}>
          <option value="">Any</option>
          {Constants.public.Enums.vehicle_body_type.map((b) => (
            <option key={b} value={b}>
              {BODY_TYPE_LABELS[b]}
            </option>
          ))}
        </NativeSelect>
      </BarField>
      <BarField label="Year" id={barId("year_min")}>
        <NativeSelect
          id={barId("year_min")}
          name="year_min"
          defaultValue={f.year_min ?? ""}
          onChange={submit}
        >
          <option value="">Any</option>
          {facets.years.map((y) => (
            <option key={y} value={y}>
              {y} & newer
            </option>
          ))}
        </NativeSelect>
      </BarField>
      <BarField label="Make" id={barId("make")}>
        <NativeSelect
          id={barId("make")}
          name="make"
          value={make}
          onChange={(e) => {
            setMake(e.target.value);
            // Let the model select reset before submitting.
            requestAnimationFrame(submit);
          }}
        >
          <option value="">Any</option>
          {facets.makes.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </NativeSelect>
      </BarField>
      <BarField label="Model" id={barId("model")}>
        <NativeSelect
          id={barId("model")}
          key={make}
          name="model"
          defaultValue={make === f.make ? (f.model ?? "") : ""}
          disabled={!make}
          onChange={submit}
        >
          <option value="">{make ? "Any" : "Pick a make"}</option>
          {models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </NativeSelect>
      </BarField>
      <BarField label="Max miles" id={barId("mileage_max")}>
        <NativeSelect
          id={barId("mileage_max")}
          name="mileage_max"
          defaultValue={f.mileage_max ?? ""}
          onChange={submit}
        >
          <option value="">Any</option>
          {MILEAGE_STEPS.map((m) => (
            <option key={m} value={m}>
              {m.toLocaleString("en-US")}
            </option>
          ))}
        </NativeSelect>
      </BarField>
      <BarField label="Price" id={barId("price_max")}>
        <NativeSelect
          id={barId("price_max")}
          name="price_max"
          defaultValue={f.price_max ?? ""}
          onChange={submit}
        >
          <option value="">Any</option>
          {PRICE_STEPS.map((p) => (
            <option key={p} value={p}>
              Up to {formatPrice(p)}
            </option>
          ))}
        </NativeSelect>
      </BarField>
      <noscript>
        <Button type="submit" className="h-11">
          Apply
        </Button>
      </noscript>
      <Button
        asChild
        variant={activeCount > 0 ? "outline" : "ghost"}
        className="h-11 shrink-0"
        aria-disabled={activeCount === 0}
      >
        <Link href={inventoryHref(f, RESET)}>
          <RotateCcw aria-hidden /> Reset
        </Link>
      </Button>
    </CleanGetForm>
  );
}

function BarField({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 flex-1 space-y-1">
      <label htmlFor={id} className="block text-xs font-semibold text-neutral-600">
        {label}
      </label>
      {children}
    </div>
  );
}

/** Clears every filter but keeps sort, page size and view. */
const RESET = Object.fromEntries([...FILTER_KEYS, "page"].map((k) => [k, undefined])) as Partial<
  Record<keyof InventoryFilters, undefined>
>;

/** Hidden inputs that carry the current URL's other values through a filter form. */
function KeptFields({ f, skip }: { f: InventoryFilters; skip: (keyof InventoryFilters)[] }) {
  const kept: [string, string][] = [];
  for (const key of [...FILTER_KEYS, "sort", "per_page", "view"] as const) {
    if (skip.includes(key)) continue;
    const value = f[key];
    if (value === undefined) continue;
    if (key === "sort" && value === "newest") continue;
    if (key === "per_page" && value === DEFAULT_PER_PAGE) continue;
    kept.push([key, String(value)]);
  }
  return kept.map(([name, value]) => (
    <input key={name} type="hidden" name={name} value={value} suppressHydrationWarning />
  ));
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
      {/* Keep sort, page size and view when filtering; page always resets to 1. */}
      <KeptFields f={f} skip={[...FILTER_KEYS]} />

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
          <Link href={inventoryHref(f, RESET)} onClick={onApplied}>
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
