"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ALL_PRESET_FEATURES, FEATURE_GROUPS } from "@/lib/vehicle-options";

/** Grouped checklist of common features plus free-text extras. */
export function FeaturesField({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const selected = new Set(value);
  const custom = value.filter((f) => !ALL_PRESET_FEATURES.has(f));

  function toggle(feature: string, on: boolean) {
    onChange(on ? [...value, feature] : value.filter((f) => f !== feature));
  }

  function addCustom() {
    const f = draft.trim().replace(/\s+/g, " ").slice(0, 60);
    if (f && !value.some((v) => v.toLowerCase() === f.toLowerCase())) onChange([...value, f]);
    setDraft("");
  }

  return (
    <div className="space-y-6">
      {FEATURE_GROUPS.map((group) => (
        <fieldset key={group.name}>
          <legend className="mb-2 text-sm font-semibold text-muted-foreground">{group.name}</legend>
          <div className="grid gap-x-4 sm:grid-cols-2">
            {group.features.map((feature) => (
              <label
                key={feature}
                className="flex min-h-11 cursor-pointer items-center gap-3 text-base"
              >
                <Checkbox
                  checked={selected.has(feature)}
                  onCheckedChange={(on) => toggle(feature, on === true)}
                  className="size-5"
                />
                {feature}
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      <div className="space-y-3">
        <p className="text-sm font-semibold text-muted-foreground">Other features</p>
        {custom.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {custom.map((f) => (
              <li
                key={f}
                className="flex items-center gap-1 rounded-full bg-muted py-1 pr-1 pl-3 text-sm"
              >
                {f}
                <button
                  type="button"
                  onClick={() => toggle(f, false)}
                  className="flex size-8 items-center justify-center rounded-full hover:bg-background"
                  aria-label={`Remove ${f}`}
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder="Add a feature, e.g. Bed cover"
            aria-label="Add a feature"
            maxLength={60}
            enterKeyHint="done"
            className="h-12 text-base"
          />
          <Button
            type="button"
            variant="outline"
            className="h-12"
            onClick={addCustom}
            disabled={!draft.trim()}
          >
            <Plus aria-hidden /> Add
          </Button>
        </div>
      </div>
    </div>
  );
}
