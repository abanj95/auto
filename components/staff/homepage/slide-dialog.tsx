"use client";

import { ImagePlus, Loader2, TriangleAlert } from "lucide-react";
import { useRef, useState } from "react";
import { useForm, useWatch, type Path } from "react-hook-form";
import { toast } from "sonner";

import {
  createSlide,
  discardUpload,
  updateSlide,
} from "@/app/(staff)/admin/(app)/(admin-only)/homepage/actions";
import { HeroSlide } from "@/components/public/hero-slide";
import { ScaledPreview } from "@/components/staff/homepage/scaled-preview";
import { uploadSiteImage } from "@/components/staff/homepage/site-image-upload";
import { slideImageWarning, type AdminSlide } from "@/components/staff/homepage/types";
import { ChoiceChips } from "@/components/staff/vehicle-form/choice-chips";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  FOCAL_POINTS,
  OVERLAYS,
  slideSchema,
  TEXT_POSITIONS,
  type FocalPoint,
  type Overlay,
  type SlideFormValues,
  type TextPosition,
} from "@/lib/validation/homepage";

type FieldName = Path<SlideFormValues>;

/** ISO → value for <input type="datetime-local"> in the browser's time zone. */
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local value (local time) → ISO, so the server doesn't guess the time zone. */
function toIso(local: string) {
  return local ? new Date(local).toISOString() : "";
}

function initialValues(slide: AdminSlide | null): SlideFormValues {
  return {
    image_path: slide?.image_path ?? "",
    image_width: slide?.image_width ?? 0,
    image_height: slide?.image_height ?? 0,
    mobile_image_path: slide?.mobile_image_path ?? null,
    mobile_image_width: slide?.mobile_image_width ?? null,
    mobile_image_height: slide?.mobile_image_height ?? null,
    focal_point: (slide?.focal_point as FocalPoint) ?? "center",
    headline: slide?.headline ?? "",
    subheadline: slide?.subheadline ?? "",
    button_label: slide?.button_label ?? "",
    button_link: slide?.button_link ?? "",
    text_position: (slide?.text_position as TextPosition) ?? "left",
    overlay_strength: (slide?.overlay_strength as Overlay) ?? "dark",
    active: slide?.active ?? true,
    starts_at: toLocalInput(slide?.starts_at ?? null),
    ends_at: toLocalInput(slide?.ends_at ?? null),
  };
}

/**
 * Add or edit a hero slide, with live desktop and phone previews. The parent
 * gives it a new `key` on every open, so each open starts with a fresh form.
 */
export function SlideDialog({
  open,
  onOpenChange,
  slide,
  eyebrow,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = new slide. */
  slide: AdminSlide | null;
  eyebrow: string;
}) {
  const form = useForm<SlideFormValues>({ defaultValues: initialValues(slide) });
  const { register, control, setValue, formState } = form;
  const values = useWatch({ control }) as SlideFormValues;
  const [preview, setPreview] = useState<string | null>(slide?.src ?? null);
  const [mobilePreview, setMobilePreview] = useState<string | null>(slide?.mobileSrc ?? null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Files uploaded in this dialog that aren't saved to a slide yet.
  const pending = useRef(new Set<string>());

  function discardPending(...keep: (string | null)[]) {
    for (const path of pending.current) if (!keep.includes(path)) void discardUpload(path);
    pending.current.clear();
  }

  function close() {
    discardPending();
    onOpenChange(false);
  }

  async function onPickFile(file: File | undefined, kind: "desktop" | "phone" = "desktop") {
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    setProgress(0);
    try {
      const uploaded = await uploadSiteImage(file, "slides", "photo", setProgress);
      pending.current.add(uploaded.path);
      if (kind === "phone") {
        setValue("mobile_image_path", uploaded.path, { shouldDirty: true });
        setValue("mobile_image_width", uploaded.width);
        setValue("mobile_image_height", uploaded.height);
        form.clearErrors("mobile_image_path");
        setMobilePreview(localUrl);
        return;
      }
      setValue("image_path", uploaded.path, { shouldDirty: true });
      setValue("image_width", uploaded.width);
      setValue("image_height", uploaded.height);
      form.clearErrors("image_path");
      setPreview(localUrl);
    } catch (err) {
      URL.revokeObjectURL(localUrl);
      toast.error(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setProgress(null);
    }
  }

  function showErrors(fieldErrors: Record<string, string>) {
    for (const [key, message] of Object.entries(fieldErrors)) {
      form.setError(key as FieldName, { message });
    }
  }

  async function onSave() {
    const raw = form.getValues();
    const input = { ...raw, starts_at: toIso(raw.starts_at), ends_at: toIso(raw.ends_at) };
    const check = slideSchema.safeParse(input);
    if (!check.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of check.error.issues) fieldErrors[issue.path.join(".")] ??= issue.message;
      showErrors(fieldErrors);
      toast.error("Please fix the highlighted fields.");
      return;
    }
    setSaving(true);
    try {
      const result = slide ? await updateSlide(slide.id, input) : await createSlide(input);
      if (!result.ok) {
        if (result.fieldErrors) showErrors(result.fieldErrors);
        toast.error(result.error);
        return;
      }
      discardPending(input.image_path, input.mobile_image_path);
      toast.success(slide ? "Slide saved. The home page is updated." : "Slide added.");
      onOpenChange(false);
    } catch {
      toast.error("Couldn't save. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  const err = (name: FieldName) => formState.errors[name]?.message;
  const warning = values.image_path
    ? slideImageWarning(values.image_width, values.image_height)
    : null;
  const previewSlide = preview
    ? {
        src: preview,
        mobileSrc: mobilePreview,
        focal_point: values.focal_point,
        headline: values.headline || null,
        subheadline: values.subheadline || null,
        button_label: values.button_label || null,
        button_link: values.button_link || null,
        text_position: values.text_position,
        overlay_strength: values.overlay_strength,
      }
    : null;

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{slide ? "Edit slide" : "Add a slide"}</DialogTitle>
          <DialogDescription>
            Landscape photos at least 1600px wide look best. Text sits on the left or center.
          </DialogDescription>
        </DialogHeader>

        <form
          id="slide-form"
          onSubmit={(e) => {
            e.preventDefault();
            void onSave();
          }}
          noValidate
          className="space-y-5"
          suppressHydrationWarning
        >
          {/* Image + previews */}
          <div className="space-y-3">
            {previewSlide ? (
              <div className="grid gap-3 sm:grid-cols-[1fr_9rem] sm:items-end">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Computer</p>
                  <ScaledPreview width={1280} height={600} className="rounded-lg">
                    <HeroSlide
                      slide={previewSlide}
                      eyebrow={eyebrow}
                      preview="desktop"
                      className="size-full"
                    />
                  </ScaledPreview>
                </div>
                <div className="hidden space-y-1 sm:block">
                  <p className="text-xs font-medium text-muted-foreground">Phone</p>
                  <ScaledPreview width={360} height={480} className="rounded-lg">
                    <HeroSlide
                      slide={previewSlide}
                      eyebrow={eyebrow}
                      preview="phone"
                      className="size-full"
                    />
                  </ScaledPreview>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={progress !== null}
                className="flex aspect-[32/15] w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed text-muted-foreground hover:bg-muted/50"
              >
                <ImagePlus className="size-8" aria-hidden />
                <span className="font-medium">Choose an image</span>
              </button>
            )}

            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              tabIndex={-1}
              aria-label="Slide image"
              data-testid="slide-image-input"
              onChange={(e) => {
                void onPickFile(e.target.files?.[0]);
                e.target.value = "";
              }}
              suppressHydrationWarning
            />
            {progress !== null && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {progress > 0 ? `Uploading ${Math.round(progress * 100)}%` : "Preparing image…"}
              </p>
            )}
            {previewSlide && progress === null && (
              <Button
                type="button"
                variant="outline"
                className="h-11"
                onClick={() => inputRef.current?.click()}
              >
                <ImagePlus aria-hidden /> Replace image
              </Button>
            )}
            {warning && (
              <p className="flex gap-2 rounded-md border border-amber-500/40 bg-amber-50 p-3 text-sm text-amber-900">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                {warning}
              </p>
            )}
            {err("image_path") && <p className="text-sm text-destructive">{err("image_path")}</p>}
          </div>

          {/* Phone image (optional) */}
          {previewSlide && (
            <div className="space-y-3 rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Phone image (optional)</p>
                <p className="text-xs text-muted-foreground">
                  A portrait photo (e.g. 1080 × 1350) shown on phones. Without one, the image above
                  is cropped for phones.
                </p>
              </div>
              <input
                ref={mobileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                tabIndex={-1}
                aria-label="Phone image"
                data-testid="slide-mobile-image-input"
                onChange={(e) => {
                  void onPickFile(e.target.files?.[0], "phone");
                  e.target.value = "";
                }}
                suppressHydrationWarning
              />
              <div className="flex flex-wrap items-center gap-2">
                {mobilePreview && (
                  // eslint-disable-next-line @next/next/no-img-element -- local blob: or storage preview
                  <img src={mobilePreview} alt="" className="h-20 w-16 rounded-md object-cover" />
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  disabled={progress !== null}
                  onClick={() => mobileInputRef.current?.click()}
                >
                  <ImagePlus aria-hidden />{" "}
                  {mobilePreview ? "Replace phone image" : "Add phone image"}
                </Button>
                {mobilePreview && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-11 text-destructive hover:text-destructive"
                    onClick={() => {
                      setValue("mobile_image_path", null, { shouldDirty: true });
                      setValue("mobile_image_width", null);
                      setValue("mobile_image_height", null);
                      setMobilePreview(null);
                    }}
                  >
                    Remove
                  </Button>
                )}
              </div>
              {!mobilePreview && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Keep in view on phones</p>
                  <ChoiceChips
                    label="Keep in view on phones"
                    allowDeselect={false}
                    options={Object.entries(FOCAL_POINTS).map(([value, label]) => ({
                      value,
                      label,
                    }))}
                    value={values.focal_point}
                    onChange={(v) =>
                      setValue("focal_point", v as FocalPoint, { shouldDirty: true })
                    }
                  />
                </div>
              )}
              {err("mobile_image_path") && (
                <p className="text-sm text-destructive">{err("mobile_image_path")}</p>
              )}
            </div>
          )}

          <Field id="headline" label="Headline" error={err("headline")}>
            <Input id="headline" {...register("headline")} className="h-12 text-base" />
          </Field>
          <Field id="subheadline" label="Subheadline" error={err("subheadline")}>
            <Textarea
              id="subheadline"
              {...register("subheadline")}
              rows={2}
              className="text-base"
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
            <Field id="button_label" label="Button text" error={err("button_label")}>
              <Input
                id="button_label"
                {...register("button_label")}
                placeholder="e.g. Shop SUVs"
                className="h-12 text-base"
              />
            </Field>
            <Field
              id="button_link"
              label="Button link"
              error={err("button_link")}
              hint="A page on this site (e.g. /inventory?body=suv or a vehicle's page), or tel: and a phone number to call."
            >
              <Input
                id="button_link"
                {...register("button_link")}
                placeholder="e.g. /inventory?body=suv"
                autoCapitalize="none"
                autoCorrect="off"
                className="h-12 text-base"
              />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium">Text position</p>
              <ChoiceChips
                label="Text position"
                allowDeselect={false}
                options={Object.entries(TEXT_POSITIONS).map(([value, label]) => ({ value, label }))}
                value={values.text_position}
                onChange={(v) =>
                  setValue("text_position", v as TextPosition, { shouldDirty: true })
                }
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Overlay (keeps text readable)</p>
              <ChoiceChips
                label="Overlay"
                allowDeselect={false}
                options={Object.entries(OVERLAYS).map(([value, label]) => ({ value, label }))}
                value={values.overlay_strength}
                onChange={(v) => setValue("overlay_strength", v as Overlay, { shouldDirty: true })}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="starts_at" label="Show from (optional)" error={err("starts_at")}>
              <Input
                id="starts_at"
                type="datetime-local"
                {...register("starts_at")}
                className="h-12 text-base"
              />
            </Field>
            <Field
              id="ends_at"
              label="Show until (optional)"
              error={err("ends_at")}
              hint="For promotions. The home page updates within 5 minutes of these times."
            >
              <Input
                id="ends_at"
                type="datetime-local"
                {...register("ends_at")}
                className="h-12 text-base"
              />
            </Field>
          </div>

          <label className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <span className="text-sm font-medium">Show on the home page</span>
            <Switch
              checked={values.active}
              onCheckedChange={(v) => setValue("active", v, { shouldDirty: true })}
            />
          </label>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" className="h-11" onClick={close}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="slide-form"
            className="h-11"
            disabled={saving || progress !== null}
          >
            {saving && <Loader2 className="animate-spin" aria-hidden />}
            {slide ? "Save slide" : "Add slide"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
