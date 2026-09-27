"use client";

import { ArrowLeft, CircleAlert, ExternalLink, FileText, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Controller, useForm, useWatch, type Path } from "react-hook-form";
import { toast } from "sonner";

import {
  createDraft,
  findVinDuplicate,
  saveVehicle,
  type SavedVehicle,
} from "@/app/(staff)/admin/(app)/vehicles/actions";
import { useUnsavedWarning } from "@/components/staff/use-unsaved-warning";
import { VehicleActionsMenu } from "@/components/staff/vehicle-actions-menu";
import { VehicleStatusBadge } from "@/components/staff/vehicle-status-badge";
import { ChoiceChips } from "@/components/staff/vehicle-form/choice-chips";
import { ColorField } from "@/components/staff/vehicle-form/color-field";
import { FeaturesField } from "@/components/staff/vehicle-form/features-field";
import { PhotoManager, type InitialPhoto } from "@/components/staff/vehicle-form/photo-manager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Constants } from "@/lib/database.types";
import {
  BODY_TYPE_LABELS,
  DRIVETRAIN_LABELS,
  FUEL_LABELS,
  TITLE_STATUS_LABELS,
  TRANSMISSION_LABELS,
  vehicleTitle,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { descriptionTemplate, EXTERIOR_COLORS, INTERIOR_COLORS } from "@/lib/vehicle-options";
import {
  DESCRIPTION_MAX,
  groupDigits,
  normalizeVin,
  vehicleDraftSchema,
  vehiclePublishSchema,
  type VehicleFormValues,
} from "@/lib/validation/vehicle";

const AUTOSAVE_MS = 10_000;
const E = Constants.public.Enums;

type SaveState = "idle" | "saving" | "saved" | "invalid" | "error";
type Intent = "draft" | "publish" | "save";
type VinLookup = {
  vin: string;
  state: "loading" | "done" | "error";
  message?: string;
  duplicate?: { id: string; stock_no: string; label: string } | null;
};

const PREFILL_LABELS: Partial<Record<keyof VehicleFormValues, string>> = {
  year: "year",
  make: "make",
  model: "model",
  trim: "trim",
  body_type: "body type",
  engine: "engine",
  drivetrain: "drivetrain",
  fuel_type: "fuel",
  transmission: "transmission",
};

export function VehicleForm({
  vehicle: initialVehicle,
  values: initialValues,
  photos,
  isAdmin,
}: {
  vehicle: SavedVehicle | null;
  values: VehicleFormValues;
  photos: InitialPhoto[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const form = useForm<VehicleFormValues>({ defaultValues: initialValues });
  const { control, register, formState, setValue, getValues } = form;
  const { errors, isDirty } = formState;

  const [vehicle, setVehicle] = useState(initialVehicle);
  const vehicleRef = useRef(initialVehicle);
  const creating = useRef<Promise<string> | null>(null);
  const saving = useRef(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [photoStatus, setPhotoStatus] = useState({ saved: photos.length, busy: false });

  const isDraft = !vehicle || vehicle.status === "draft";
  const [year, make, model] = useWatch({ control, name: ["year", "make", "model"] });
  const title = vehicleTitle({ year: Number(year) || null, make, model });

  // Clear a field's error as soon as it changes.
  useEffect(() => {
    return form.subscribe({
      formState: { values: true },
      callback: ({ name }) => {
        if (name) form.clearErrors(name as Path<VehicleFormValues>);
      },
    });
  }, [form]);

  /**
   * Remember the saved vehicle. The URL deliberately stays /admin/vehicles/new
   * while editing: server actions refresh the *current URL*, and rendering the
   * edit page instead would remount this form and drop uploads in progress.
   */
  const adopt = useCallback((saved: SavedVehicle) => {
    vehicleRef.current = saved;
    setVehicle(saved);
  }, []);

  /** The vehicle id, creating an empty draft first if needed (e.g. on the first photo). */
  const getVehicleId = useCallback(async () => {
    if (vehicleRef.current) return vehicleRef.current.id;
    creating.current ??= (async () => {
      const result = await createDraft();
      if (!result.ok) {
        creating.current = null;
        throw new Error(result.error);
      }
      adopt(result.data);
      return result.data.id;
    })();
    return creating.current;
  }, [adopt]);

  function showErrors(fieldErrors: Partial<Record<keyof VehicleFormValues, string>>) {
    const keys = Object.keys(fieldErrors) as (keyof VehicleFormValues)[];
    for (const key of keys) form.setError(key, { message: fieldErrors[key] });
    const first = keys[0];
    if (first) {
      document
        .getElementById(`field-${first}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      if (["vin", "year", "make", "model", "trim", "price", "mileage", "engine"].includes(first)) {
        form.setFocus(first as Path<VehicleFormValues>);
      }
    }
  }

  async function save(intent: Intent, silent = false): Promise<boolean> {
    if (saving.current) return false;
    const values = getValues();
    const listed = vehicleRef.current !== null && vehicleRef.current.status !== "draft";
    const check = (
      intent === "publish" || listed ? vehiclePublishSchema : vehicleDraftSchema
    ).safeParse(values);
    if (!check.success) {
      if (silent) {
        setSaveState("invalid");
        return false;
      }
      const fieldErrors: Partial<Record<keyof VehicleFormValues, string>> = {};
      for (const issue of check.error.issues)
        fieldErrors[issue.path[0] as keyof VehicleFormValues] ??= issue.message;
      showErrors(fieldErrors);
      toast.error("Please fix the highlighted fields.");
      return false;
    }
    if (intent === "publish" && !listed) {
      if (photoStatus.busy) {
        toast.error("Wait for the photos to finish uploading.");
        return false;
      }
      if (photoStatus.saved === 0) {
        toast.error("Add at least one photo before publishing.");
        document.getElementById("photos")?.scrollIntoView({ behavior: "smooth", block: "center" });
        return false;
      }
    }

    saving.current = true;
    setSaveState("saving");
    try {
      const id = vehicleRef.current?.id ?? (creating.current ? await creating.current : null);
      const result = await saveVehicle({ id, values, intent });
      if (!result.ok) {
        setSaveState("error");
        if (result.fieldErrors) showErrors(result.fieldErrors);
        toast.error(result.error);
        return false;
      }
      adopt(result.data);
      // Mark what was just saved as clean; keep anything typed while saving.
      form.reset(values, { keepValues: true });
      setSaveState("saved");
      setSavedAt(new Date());
      if (!silent) {
        toast.success(
          intent === "publish"
            ? "Published — it's live on the site."
            : intent === "save"
              ? "Changes saved."
              : "Draft saved.",
        );
        // New car saved on purpose and nothing uploading: move to its own edit URL.
        if (!initialVehicle && !photoStatus.busy)
          router.replace(`/admin/vehicles/${result.data.id}`);
      }
      return true;
    } catch {
      setSaveState("error");
      toast.error("Couldn't save. Check your connection and try again.");
      return false;
    } finally {
      saving.current = false;
    }
  }

  // Autosave drafts every 10 seconds (listed cars use "Save changes" so half-done edits never go live).
  const autosave = useRef<() => void>(() => {});
  useEffect(() => {
    autosave.current = () => {
      if (isDirty && !saving.current) void save("draft", true);
    };
  });
  useEffect(() => {
    if (!isDraft) return;
    const timer = setInterval(() => autosave.current(), AUTOSAVE_MS);
    return () => clearInterval(timer);
  }, [isDraft]);

  // Warn before leaving with unsaved changes or uploads in progress.
  useUnsavedWarning(isDirty || photoStatus.busy);

  // ---- VIN lookup: NHTSA prefill (only empty fields) + duplicate warning.

  const vin = normalizeVin(useWatch({ control, name: "vin" }));
  const [lookup, setLookup] = useState<VinLookup | null>(null);
  const lastLookedUp = useRef(normalizeVin(initialValues.vin)); // Don't look up on load.

  useEffect(() => {
    if (vin.length !== 17 || vin === lastLookedUp.current) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      lastLookedUp.current = vin;
      setLookup({ vin, state: "loading" });
      const [duplicate, decoded] = await Promise.all([
        findVinDuplicate(vin, vehicleRef.current?.id ?? null).catch(() => null),
        fetch(`/admin/api/vin/${vin}`, { signal: controller.signal })
          .then(
            (r) =>
              r.json() as Promise<{
                ok: boolean;
                data?: Record<string, string | number>;
                error?: string;
              }>,
          )
          .catch(() => null),
      ]);
      if (controller.signal.aborted) return;

      if (!decoded?.ok || !decoded.data) {
        setLookup({
          vin,
          state: "error",
          duplicate,
          message:
            decoded?.error ?? "Couldn't look up this VIN right now — fill in the details below.",
        });
        return;
      }
      const filled: string[] = [];
      for (const [key, value] of Object.entries(decoded.data)) {
        const name = key as keyof VehicleFormValues;
        if (PREFILL_LABELS[name] && getValues(name) === "") {
          setValue(name as Path<VehicleFormValues>, String(value), { shouldDirty: true });
          filled.push(PREFILL_LABELS[name]!);
        }
      }
      setLookup({
        vin,
        state: "done",
        duplicate,
        message: filled.length
          ? `Filled in ${filled.join(", ")} from the VIN. Check them below.`
          : "VIN recognized. Your details were kept.",
      });
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [vin, getValues, setValue]);

  const vinInfo = lookup?.vin === vin ? lookup : null;
  const description = useWatch({ control, name: "description" });

  // ---- render

  const status =
    saveState === "saving"
      ? "Saving…"
      : saveState === "invalid"
        ? "Not saved — check the form"
        : saveState === "error"
          ? "Couldn't save"
          : isDirty
            ? "Unsaved changes"
            : savedAt
              ? `Saved ${savedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
              : "";

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      noValidate
      className="mx-auto max-w-3xl space-y-5 pb-28"
      suppressHydrationWarning // Chrome on iOS adds autofill attributes.
    >
      {/* Header */}
      <div className="space-y-2">
        <Link
          href="/admin/vehicles"
          className="inline-flex h-10 items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden /> Vehicles
        </Link>
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-bold tracking-tight">
              {vehicle || make || model ? title : "New vehicle"}
            </h1>
            {vehicle && (
              <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <VehicleStatusBadge status={vehicle.status} />
                <span>{vehicle.stock_no}</span>
              </div>
            )}
          </div>
          {vehicle && (
            <VehicleActionsMenu
              vehicle={{ id: vehicle.id, slug: vehicle.slug, status: vehicle.status, label: title }}
              showEdit={false}
              onStatusChange={(s) => adopt({ ...vehicle, status: s })}
              afterDelete="/admin/vehicles"
            />
          )}
        </div>
      </div>

      {/* VIN */}
      <Section title="VIN">
        <Field
          id="vin"
          label="VIN"
          error={errors.vin?.message}
          hint="17 letters and numbers. We'll fill in the details from it."
        >
          <Input
            id="vin"
            {...register("vin")}
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={24}
            aria-invalid={!!errors.vin}
            className="h-12 font-mono text-base tracking-wider uppercase"
          />
        </Field>
        {vinInfo && (
          <p
            role="status"
            className={cn(
              "flex items-start gap-2 text-sm",
              vinInfo.state === "error" ? "text-amber-700" : "text-muted-foreground",
            )}
          >
            {vinInfo.state === "loading" ? (
              <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" aria-hidden />
            ) : vinInfo.state === "error" ? (
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            ) : (
              <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            )}
            {vinInfo.state === "loading" ? "Looking up this VIN…" : vinInfo.message}
          </p>
        )}
        {vinInfo?.duplicate && (
          <div
            role="alert"
            className="rounded-lg border border-amber-500/40 bg-amber-50 p-3 text-sm text-amber-900"
          >
            This VIN is already used by{" "}
            <Link
              href={`/admin/vehicles/${vinInfo.duplicate.id}`}
              className="font-semibold underline"
            >
              {vinInfo.duplicate.label} ({vinInfo.duplicate.stock_no})
            </Link>
            .
          </div>
        )}
      </Section>

      {/* Vehicle */}
      <Section title="Vehicle">
        <div className="grid grid-cols-2 gap-3">
          <Field id="year" label="Year" error={errors.year?.message}>
            <Controller
              control={control}
              name="year"
              render={({ field }) => (
                <Input
                  id="year"
                  {...field}
                  onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  inputMode="numeric"
                  autoComplete="off"
                  aria-invalid={!!errors.year}
                  className="h-12 text-base"
                />
              )}
            />
          </Field>
          <Field id="make" label="Make" error={errors.make?.message}>
            <Input
              id="make"
              {...register("make")}
              autoCapitalize="words"
              aria-invalid={!!errors.make}
              className="h-12 text-base"
            />
          </Field>
          <Field id="model" label="Model" error={errors.model?.message}>
            <Input
              id="model"
              {...register("model")}
              autoCapitalize="words"
              aria-invalid={!!errors.model}
              className="h-12 text-base"
            />
          </Field>
          <Field id="trim" label="Trim" error={errors.trim?.message}>
            <Input
              id="trim"
              {...register("trim")}
              autoCapitalize="words"
              className="h-12 text-base"
            />
          </Field>
        </div>
        <Field id="body_type" label="Body type">
          <NativeSelect id="body_type" {...register("body_type")} className="h-12 text-base">
            <option value="">Not set</option>
            {E.vehicle_body_type.map((b) => (
              <option key={b} value={b}>
                {BODY_TYPE_LABELS[b]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="engine" label="Engine" error={errors.engine?.message}>
          <Input
            id="engine"
            {...register("engine")}
            placeholder="e.g. 2.5L 4-cylinder"
            className="h-12 text-base"
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field id="transmission" label="Transmission">
            <NativeSelect
              id="transmission"
              {...register("transmission")}
              className="h-12 text-base"
            >
              <option value="">Not set</option>
              {E.vehicle_transmission.map((t) => (
                <option key={t} value={t}>
                  {TRANSMISSION_LABELS[t]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field id="drivetrain" label="Drivetrain">
            <NativeSelect id="drivetrain" {...register("drivetrain")} className="h-12 text-base">
              <option value="">Not set</option>
              {E.vehicle_drivetrain.map((d) => (
                <option key={d} value={d}>
                  {DRIVETRAIN_LABELS[d]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field id="fuel_type" label="Fuel">
            <NativeSelect id="fuel_type" {...register("fuel_type")} className="h-12 text-base">
              <option value="">Not set</option>
              {E.vehicle_fuel_type.map((f) => (
                <option key={f} value={f}>
                  {FUEL_LABELS[f]}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
      </Section>

      {/* Photos */}
      <Section title="Photos" id="photos">
        <PhotoManager
          vehicleId={vehicle?.id ?? null}
          initialPhotos={photos}
          getVehicleId={getVehicleId}
          onStatusChange={setPhotoStatus}
        />
      </Section>

      {/* Details */}
      <Section title="Price & details">
        <div className="grid grid-cols-2 gap-3">
          <Field
            id="price"
            label="Price"
            error={errors.price?.message}
            hint="All-in, incl. dealer fees"
          >
            <Controller
              control={control}
              name="price"
              render={({ field }) => (
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-base text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="price"
                    {...field}
                    onChange={(e) => field.onChange(groupDigits(e.target.value))}
                    inputMode="numeric"
                    autoComplete="off"
                    aria-invalid={!!errors.price}
                    className="h-12 pl-7 text-base"
                  />
                </div>
              )}
            />
          </Field>
          <Field id="mileage" label="Mileage" error={errors.mileage?.message}>
            <Controller
              control={control}
              name="mileage"
              render={({ field }) => (
                <div className="relative">
                  <Input
                    id="mileage"
                    {...field}
                    onChange={(e) => field.onChange(groupDigits(e.target.value))}
                    inputMode="numeric"
                    autoComplete="off"
                    aria-invalid={!!errors.mileage}
                    className="h-12 pr-10 text-base"
                  />
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                    mi
                  </span>
                </div>
              )}
            />
          </Field>
        </div>

        <ChipsField id="exterior_color" label="Exterior color">
          <Controller
            control={control}
            name="exterior_color"
            render={({ field }) => (
              <ColorField
                id="exterior_color_custom"
                label="Exterior color"
                colors={EXTERIOR_COLORS}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </ChipsField>
        <ChipsField id="interior_color" label="Interior color">
          <Controller
            control={control}
            name="interior_color"
            render={({ field }) => (
              <ColorField
                id="interior_color_custom"
                label="Interior color"
                colors={INTERIOR_COLORS}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </ChipsField>
        <ChipsField id="title_status" label="Title">
          <Controller
            control={control}
            name="title_status"
            render={({ field }) => (
              <ChoiceChips
                label="Title"
                options={E.vehicle_title_status.map((t) => ({
                  value: t,
                  label: TITLE_STATUS_LABELS[t],
                }))}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </ChipsField>
      </Section>

      {/* Features */}
      <Section title="Features">
        <Controller
          control={control}
          name="features"
          render={({ field }) => <FeaturesField value={field.value} onChange={field.onChange} />}
        />
      </Section>

      {/* Description */}
      <Section title="Description">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="description" className="text-sm font-semibold">
            Description
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10"
            onClick={() => {
              if (
                getValues("description").trim() &&
                !window.confirm("Replace the current description?")
              )
                return;
              setValue("description", descriptionTemplate(getValues()), { shouldDirty: true });
            }}
          >
            <FileText aria-hidden /> Start from template
          </Button>
        </div>
        <div id="field-description">
          <Textarea
            id="description"
            {...register("description")}
            rows={8}
            maxLength={DESCRIPTION_MAX}
            placeholder="What makes this car a good buy? Condition, recent service, one owner…"
            className="text-base"
          />
          <p className="mt-1 text-right text-xs text-muted-foreground" aria-live="polite">
            {description.length.toLocaleString()} / {DESCRIPTION_MAX.toLocaleString()}
          </p>
        </div>
      </Section>

      {/* Featured (admin only) */}
      {isAdmin && (
        <Section title="Home page">
          <Controller
            control={control}
            name="featured"
            render={({ field }) => (
              <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4">
                <span>
                  <span className="block font-medium">Featured</span>
                  <span className="block text-sm text-muted-foreground">
                    Show in “Featured vehicles” on the home page.
                  </span>
                </span>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  aria-label="Featured"
                />
              </label>
            )}
          />
        </Section>
      )}

      {/* Sticky action bar: above the bottom tabs on phones, full width beside the sidebar on desktop. */}
      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t bg-background/95 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur md:bottom-0 md:left-56">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <p
            className="mr-auto min-w-0 truncate text-xs text-muted-foreground"
            aria-live="polite"
            data-testid="save-status"
          >
            {saveState === "saving" && (
              <Loader2 className="mr-1 inline size-3 animate-spin" aria-hidden />
            )}
            {status}
          </p>
          {isDraft ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="h-11"
                onClick={() => void save("draft")}
              >
                Save draft
              </Button>
              <Button
                type="button"
                className="h-11 px-5 font-semibold"
                onClick={() => void save("publish")}
              >
                Publish
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="outline" size="icon" className="size-11">
                <a
                  href={`/inventory/${vehicle!.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="View on site"
                >
                  <ExternalLink />
                </a>
              </Button>
              <Button
                type="button"
                className="h-11 px-5 font-semibold"
                onClick={() => void save("save")}
              >
                Save changes
              </Button>
            </>
          )}
        </div>
      </div>
    </form>
  );
}

function Section({
  title,
  id,
  children,
}: {
  title: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 space-y-4 rounded-xl border bg-card p-4 sm:p-6">
      <h2 className="text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div id={`field-${id}`} className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-semibold">
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

/** Label for chip groups (no single input to point a <label> at). */
function ChipsField({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div id={`field-${id}`} className="space-y-2">
      <p className="text-sm font-semibold">{label}</p>
      {children}
    </div>
  );
}
