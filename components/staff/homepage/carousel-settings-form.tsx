"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { saveCarouselSettings } from "@/app/(staff)/admin/(app)/(admin-only)/homepage/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { carouselSettingsSchema, type CarouselSettingsValues } from "@/lib/validation/homepage";

export function CarouselSettingsForm({ initial }: { initial: CarouselSettingsValues }) {
  const [autoplay, setAutoplay] = useState(initial.hero_autoplay);
  const [seconds, setSeconds] = useState(String(initial.hero_interval_seconds));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSave() {
    const values = { hero_autoplay: autoplay, hero_interval_seconds: seconds };
    const check = carouselSettingsSchema.safeParse(values);
    if (!check.success) {
      setError(check.error.issues[0].message);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const result = await saveCarouselSettings(values);
      if (result.ok) toast.success("Carousel settings saved.");
      else toast.error(result.error);
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
      className="space-y-4 rounded-xl border bg-card p-4 sm:p-5"
      suppressHydrationWarning
    >
      <div>
        <h2 className="text-lg font-semibold">Carousel</h2>
        <p className="text-sm text-muted-foreground">
          Autoplay pauses while a visitor hovers over it, and is always off for visitors who turn
          off animations on their device.
        </p>
      </div>
      <label className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">Change slides automatically</span>
        <Switch checked={autoplay} onCheckedChange={setAutoplay} />
      </label>
      <div className="space-y-1.5">
        <Label htmlFor="hero_interval_seconds">Seconds per slide</Label>
        <Input
          id="hero_interval_seconds"
          type="number"
          inputMode="numeric"
          min={3}
          max={20}
          value={seconds}
          onChange={(e) => setSeconds(e.target.value)}
          disabled={!autoplay}
          className="h-12 w-28 text-base"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <Button type="submit" className="h-11" disabled={saving}>
        {saving && <Loader2 className="animate-spin" aria-hidden />}
        Save carousel settings
      </Button>
    </form>
  );
}
