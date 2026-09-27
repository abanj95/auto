import { Search } from "lucide-react";

import { CleanGetForm } from "@/components/public/clean-get-form";
import { NativeSelect } from "@/components/public/native-select";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { PRICE_STEPS } from "@/lib/validation/inventory";

export function QuickSearch({ makes }: { makes: string[] }) {
  return (
    <CleanGetForm
      action="/inventory"
      className="grid gap-3 rounded-xl bg-background p-4 shadow-xl ring-1 ring-black/5 sm:grid-cols-[1fr_1fr_auto] sm:p-5"
    >
      <div className="space-y-1.5">
        <label htmlFor="qs-make" className="block text-sm font-semibold">
          Make
        </label>
        <NativeSelect id="qs-make" name="make" defaultValue="">
          <option value="">Any make</option>
          {makes.map((make) => (
            <option key={make} value={make}>
              {make}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="qs-price-max" className="block text-sm font-semibold">
          Max price
        </label>
        <NativeSelect id="qs-price-max" name="price_max" defaultValue="">
          <option value="">No max</option>
          {PRICE_STEPS.map((p) => (
            <option key={p} value={p}>
              {formatPrice(p)}
            </option>
          ))}
        </NativeSelect>
      </div>
      <Button type="submit" size="lg" className="h-11 self-end px-6 text-base font-semibold">
        <Search aria-hidden /> Search
      </Button>
    </CleanGetForm>
  );
}
