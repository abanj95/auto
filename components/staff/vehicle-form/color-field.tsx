"use client";

import { useState } from "react";

import { ChoiceChips } from "@/components/staff/vehicle-form/choice-chips";
import { Input } from "@/components/ui/input";

const OTHER = "__other__";

/** Common color chips plus "Other" with a free-text input. */
export function ColorField({
  id,
  label,
  colors,
  value,
  onChange,
}: {
  id: string;
  label: string;
  colors: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  const isPreset = colors.includes(value);
  const [custom, setCustom] = useState(!isPreset && value !== "");

  return (
    <div className="space-y-3">
      <ChoiceChips
        label={label}
        options={[
          ...colors.map((c) => ({ value: c, label: c })),
          { value: OTHER, label: "Other…" },
        ]}
        value={custom ? OTHER : value}
        onChange={(v) => {
          if (v === OTHER) {
            setCustom(true);
            if (isPreset) onChange("");
          } else {
            setCustom(false);
            onChange(v);
          }
        }}
      />
      {custom && (
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. Celestial Silver"
          aria-label={`${label} (custom)`}
          maxLength={40}
          className="h-12 text-base"
          autoFocus
        />
      )}
    </div>
  );
}
