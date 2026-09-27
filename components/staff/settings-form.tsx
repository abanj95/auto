"use client";

import { Info, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm, type Path } from "react-hook-form";
import { toast } from "sonner";

import { saveSiteSettings } from "@/app/(staff)/admin/(app)/(admin-only)/settings/actions";
import { useUnsavedWarning } from "@/components/staff/use-unsaved-warning";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  DAY_NAMES,
  siteSettingsSchema,
  type SiteSettingsFormValues,
} from "@/lib/validation/site-settings";

type FieldName = Path<SiteSettingsFormValues>;

export function SettingsForm({
  initial,
  hoursWereSet,
}: {
  initial: SiteSettingsFormValues;
  hoursWereSet: boolean;
}) {
  const form = useForm<SiteSettingsFormValues>({ defaultValues: initial });
  const { control, register, formState, getValues } = form;
  const { errors, isDirty } = formState;
  const [saving, setSaving] = useState(false);
  const [hoursSaved, setHoursSaved] = useState(hoursWereSet);

  useUnsavedWarning(isDirty);

  // Clear a field's error as soon as it changes.
  useEffect(
    () =>
      form.subscribe({
        formState: { values: true },
        callback: ({ name }) => {
          if (name) form.clearErrors(name as FieldName);
        },
      }),
    [form],
  );

  function showErrors(fieldErrors: Record<string, string>) {
    const keys = Object.keys(fieldErrors);
    for (const key of keys) form.setError(key as FieldName, { message: fieldErrors[key] });
    document
      .getElementById(`field-${keys[0]}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function onSave() {
    const values = getValues();
    const check = siteSettingsSchema.safeParse(values);
    if (!check.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of check.error.issues) fieldErrors[issue.path.join(".")] ??= issue.message;
      showErrors(fieldErrors);
      toast.error("Please fix the highlighted fields.");
      return;
    }
    setSaving(true);
    try {
      const result = await saveSiteSettings(values);
      if (!result.ok) {
        if (result.fieldErrors) showErrors(result.fieldErrors);
        toast.error(result.error);
        return;
      }
      // Show the stored formatting (e.g. "(215) 618-2789") and mark the form clean.
      const saved = check.data;
      form.reset({
        ...values,
        phone: saved.phone ?? "",
        sms_phone: saved.sms_phone ?? "",
        state: saved.state ?? "",
        facebook_url: saved.facebook_url ?? "",
        google_maps_url: saved.google_maps_url ?? "",
      });
      setHoursSaved(true);
      toast.success("Settings saved. The public site is updated.");
    } catch {
      toast.error("Couldn't save. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  const err = (name: string) => {
    // Nested errors (hours.0.close) live under errors.hours[0].close.
    const value = name
      .split(".")
      .reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], errors);
    return (value as { message?: string } | undefined)?.message;
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void onSave();
      }}
      noValidate
      className="mx-auto max-w-3xl space-y-5 pb-28"
      suppressHydrationWarning // Chrome on iOS adds autofill attributes.
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Shown in the public site&apos;s header, footer, About and Contact pages.
        </p>
      </div>

      <Section title="Dealership">
        <Field name="dealership_name" label="Dealership name" error={err("dealership_name")}>
          <Input id="dealership_name" {...register("dealership_name")} className="h-12 text-base" />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field name="phone" label="Phone (for Call)" error={err("phone")}>
            <Input
              id="phone"
              {...register("phone")}
              type="tel"
              inputMode="tel"
              autoComplete="off"
              className="h-12 text-base"
            />
          </Field>
          <Field
            name="sms_phone"
            label="Text number (for Text)"
            error={err("sms_phone")}
            hint="Leave empty to use the phone number."
          >
            <Input
              id="sms_phone"
              {...register("sms_phone")}
              type="tel"
              inputMode="tel"
              autoComplete="off"
              className="h-12 text-base"
            />
          </Field>
        </div>
        <Field name="email" label="Email" error={err("email")}>
          <Input
            id="email"
            {...register("email")}
            type="email"
            inputMode="email"
            autoCapitalize="none"
            autoComplete="off"
            className="h-12 text-base"
          />
        </Field>
      </Section>

      <Section title="Address">
        <Field name="address" label="Street address" error={err("address")}>
          <Input
            id="address"
            {...register("address")}
            autoComplete="off"
            className="h-12 text-base"
          />
        </Field>
        <div className="grid grid-cols-[1fr_5rem_7rem] gap-3">
          <Field name="city" label="City" error={err("city")}>
            <Input id="city" {...register("city")} className="h-12 text-base" />
          </Field>
          <Field name="state" label="State" error={err("state")}>
            <Input
              id="state"
              {...register("state")}
              maxLength={2}
              autoCapitalize="characters"
              className="h-12 text-base uppercase"
            />
          </Field>
          <Field name="zip" label="ZIP" error={err("zip")}>
            <Input
              id="zip"
              {...register("zip")}
              inputMode="numeric"
              maxLength={10}
              className="h-12 text-base"
            />
          </Field>
        </div>
        <Field
          name="google_maps_url"
          label="Google Maps link"
          error={err("google_maps_url")}
          hint="In Google Maps, open your business, tap Share, copy the link. Leave empty to link to the address."
        >
          <Input
            id="google_maps_url"
            {...register("google_maps_url")}
            type="url"
            inputMode="url"
            autoCapitalize="none"
            className="h-12 text-base"
          />
        </Field>
      </Section>

      <Section title="Hours">
        {!hoursSaved && (
          <p className="flex gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            Hours aren&apos;t set yet — the site says &ldquo;Call us for current hours&rdquo;. These
            are suggestions; adjust and save to publish them.
          </p>
        )}
        <ul className="divide-y">
          {initial.hours.map((row, i) => (
            <Controller
              key={row.day}
              control={control}
              name={`hours.${i}.closed`}
              render={({ field: closed }) => (
                <li
                  id={`field-hours.${i}.open`}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3"
                >
                  <span className="w-24 font-medium">{DAY_NAMES[row.day]}</span>
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    <Switch
                      checked={!closed.value}
                      onCheckedChange={(open) => closed.onChange(!open)}
                      aria-label={`${DAY_NAMES[row.day]} open`}
                    />
                    {closed.value ? "Closed" : "Open"}
                  </label>
                  {!closed.value && (
                    <div className="flex basis-full items-center gap-2 sm:ml-auto sm:basis-auto">
                      <Input
                        type="time"
                        {...register(`hours.${i}.open`)}
                        aria-label={`${DAY_NAMES[row.day]} opens`}
                        aria-invalid={!!err(`hours.${i}.open`)}
                        className="h-11 w-full text-base sm:w-32"
                      />
                      <span className="text-muted-foreground">to</span>
                      <Input
                        type="time"
                        {...register(`hours.${i}.close`)}
                        aria-label={`${DAY_NAMES[row.day]} closes`}
                        aria-invalid={!!err(`hours.${i}.close`)}
                        className="h-11 w-full text-base sm:w-32"
                      />
                    </div>
                  )}
                  {(err(`hours.${i}.open`) || err(`hours.${i}.close`)) && (
                    <p role="alert" className="basis-full text-sm text-destructive">
                      {err(`hours.${i}.open`) ?? err(`hours.${i}.close`)}
                    </p>
                  )}
                </li>
              )}
            />
          ))}
        </ul>
      </Section>

      <Section title="About & pricing">
        <Field
          name="about_text"
          label="About text"
          error={err("about_text")}
          hint="Blank line = new paragraph. The first paragraph is shown on the home page."
        >
          <Textarea id="about_text" {...register("about_text")} rows={8} className="text-base" />
        </Field>
        <Field
          name="price_disclaimer"
          label="Price disclaimer"
          error={err("price_disclaimer")}
          hint="Shown under every price."
        >
          <Textarea
            id="price_disclaimer"
            {...register("price_disclaimer")}
            rows={2}
            className="text-base"
          />
        </Field>
      </Section>

      <Section title="Social">
        <Field name="facebook_url" label="Facebook page" error={err("facebook_url")}>
          <Input
            id="facebook_url"
            {...register("facebook_url")}
            type="url"
            inputMode="url"
            autoCapitalize="none"
            placeholder="https://www.facebook.com/…"
            className="h-12 text-base"
          />
        </Field>
      </Section>

      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t bg-background/95 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur md:bottom-0 md:left-56">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <p className="mr-auto text-xs text-muted-foreground" aria-live="polite">
            {isDirty ? "Unsaved changes" : ""}
          </p>
          <Button type="submit" className="h-11 px-6 font-semibold" disabled={saving}>
            {saving && <Loader2 className="animate-spin" aria-hidden />}
            Save settings
          </Button>
        </div>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-xl border bg-card p-4 sm:p-6">
      <h2 className="text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  name,
  label,
  error,
  hint,
  children,
  className,
}: {
  name: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div id={`field-${name}`} className={cn("space-y-1.5", className)}>
      <Label htmlFor={name} className="text-sm font-semibold">
        {label}
      </Label>
      {children}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
