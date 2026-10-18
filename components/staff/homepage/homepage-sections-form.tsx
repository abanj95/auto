"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch, type Path } from "react-hook-form";
import { toast } from "sonner";

import { saveHomepageSections } from "@/app/(staff)/admin/(app)/homepage/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { homepageSectionsSchema, type HomepageSectionsValues } from "@/lib/validation/homepage";

const TILES = [
  { name: "tile_inventory_label", label: "Inventory tile", hint: "Opens /inventory" },
  { name: "tile_finder_label", label: "Vehicle Finder tile", hint: "Opens /vehicle-finder" },
  { name: "tile_visit_label", label: "Visit tile", hint: "Opens the Google Maps link" },
  { name: "tile_call_label", label: "Call tile", hint: "Calls the phone number" },
] as const;

/** Text of the homepage sections below the hero, and the featured-row toggle. */
export function HomepageSectionsForm({ initial }: { initial: HomepageSectionsValues }) {
  const form = useForm<HomepageSectionsValues>({ defaultValues: initial });
  const { register, formState, control, setValue, setError, getValues, reset } = form;
  const showFeatured = useWatch({ control, name: "show_featured_on_home" });
  const { errors, isDirty } = formState;
  const [saving, setSaving] = useState(false);

  async function onSave() {
    const values = getValues();
    const check = homepageSectionsSchema.safeParse(values);
    if (!check.success) {
      for (const issue of check.error.issues)
        setError(issue.path.join(".") as Path<HomepageSectionsValues>, { message: issue.message });
      return;
    }
    setSaving(true);
    try {
      const result = await saveHomepageSections(values);
      if (result.ok) {
        toast.success("Homepage sections saved.");
        reset(check.data);
      } else toast.error(result.error);
    } catch {
      toast.error("Couldn't save. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void onSave();
      }}
      noValidate
      className="space-y-5 rounded-xl border bg-card p-4 sm:p-5"
      suppressHydrationWarning
    >
      <div>
        <h2 className="text-lg font-semibold">Homepage sections</h2>
        <p className="text-sm text-muted-foreground">
          Below the hero: four quick-link tiles, then &ldquo;Welcome to …&rdquo; with the About text
          and photo (edit those in Settings and Site images).
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="home_welcome_subheading">Welcome subheading</Label>
        <Input
          id="home_welcome_subheading"
          {...register("home_welcome_subheading")}
          maxLength={120}
          className="h-12 text-base"
        />
        {errors.home_welcome_subheading && (
          <p className="text-sm text-destructive">{errors.home_welcome_subheading.message}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {TILES.map((tile) => (
          <div key={tile.name} className="space-y-1.5">
            <Label htmlFor={tile.name}>{tile.label}</Label>
            <Input
              id={tile.name}
              {...register(tile.name)}
              maxLength={30}
              className="h-12 text-base"
            />
            {errors[tile.name] ? (
              <p className="text-sm text-destructive">{errors[tile.name]?.message}</p>
            ) : (
              <p className="text-xs text-muted-foreground">{tile.hint}</p>
            )}
          </div>
        ))}
      </div>

      <label className="flex items-center justify-between gap-3 rounded-lg border p-3">
        <span>
          <span className="block text-sm font-medium">Show featured vehicles on homepage</span>
          <span className="block text-xs text-muted-foreground">
            One row of up to 4 cars marked Featured, below the welcome section.
          </span>
        </span>
        <Switch
          checked={showFeatured}
          onCheckedChange={(v) => setValue("show_featured_on_home", v, { shouldDirty: true })}
        />
      </label>

      <Button type="submit" className="h-11" disabled={saving || !isDirty}>
        {saving && <Loader2 className="animate-spin" aria-hidden />}
        Save homepage sections
      </Button>
    </form>
  );
}
