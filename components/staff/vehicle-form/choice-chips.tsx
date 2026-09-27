"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

/** Row of large tappable chips acting as a single-choice radio group. */
export function ChoiceChips({
  label,
  options,
  value,
  onChange,
  allowDeselect = true,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  allowDeselect?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(selected && allowDeselect ? "" : o.value)}
            className={cn(
              "inline-flex h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-background hover:bg-muted",
            )}
          >
            {selected && <Check className="size-4" aria-hidden />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
