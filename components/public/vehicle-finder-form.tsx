"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleCheck, Loader2, Phone } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm, useWatch, type FieldErrors, type Path } from "react-hook-form";

import { submitVehicleRequest } from "@/app/(public)/vehicle-finder/actions";
import { FormAlert } from "@/components/staff/form-alert";
import { useTurnstile } from "@/components/turnstile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Constants } from "@/lib/database.types";
import { BODY_TYPE_LABELS, phoneHref } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  BEST_TIMES,
  COMMON_MAKES,
  CONTACT_METHODS,
  EMPTY_VEHICLE_REQUEST,
  MAX_MILEAGE_OPTIONS,
  NOTES_MAX,
  vehicleRequestSchema,
  type VehicleRequestFormValues,
} from "@/lib/validation/vehicle-request";

type Values = VehicleRequestFormValues;

const OTHER = "__other";
const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: THIS_YEAR + 1 - 1990 + 1 }, (_, i) => THIS_YEAR + 1 - i);

export function VehicleFinderForm({
  dealershipName,
  phone,
}: {
  dealershipName: string;
  phone: string | null;
}) {
  const form = useForm<Values>({
    defaultValues: EMPTY_VEHICLE_REQUEST,
    resolver: zodResolver(vehicleRequestSchema) as never,
    mode: "onTouched",
  });
  const { register, handleSubmit, formState, control, setError, getValues } = form;
  const { errors, isSubmitting } = formState;
  const captcha = useTurnstile("vehicle_finder");
  const [error, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [website, setWebsite] = useState(""); // Honeypot.
  const notesLength = useWatch({ control, name: "notes" }).length;
  const makeChoice = useWatch({ control, name: "make" });
  const [makeOther, setMakeOther] = useState(false);

  async function onValid() {
    setFormError(null);
    if (captcha.required && !captcha.token) {
      setFormError("Please complete the “I'm human” check.");
      return;
    }
    const result = await submitVehicleRequest(getValues(), {
      website,
      captchaToken: captcha.token,
    });
    captcha.reset();
    if (result.ok) {
      setSent(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setFormError(result.error);
    for (const [name, message] of Object.entries(result.fieldErrors ?? {}))
      setError(name as Path<Values>, { message });
  }

  function onInvalid(errs: FieldErrors<Values>) {
    const first = Object.keys(errs)[0];
    document.getElementById(`finder-${first}`)?.focus();
  }

  if (sent) {
    return (
      <div
        className="rounded-2xl border bg-card p-6 text-center shadow-sm sm:p-10"
        role="status"
        data-testid="finder-thanks"
      >
        <CircleCheck className="mx-auto size-12 text-emerald-600" aria-hidden />
        <h2 className="mt-4 text-2xl font-extrabold tracking-tight">Thanks! We&apos;re on it.</h2>
        <p className="mx-auto mt-2 max-w-md text-muted-foreground">
          We received your request and will reach out soon. Want to talk sooner? Give us a call.
        </p>
        {phone && (
          <Button asChild size="lg" className="mt-6 h-12 text-base">
            <a href={`tel:${phoneHref(phone)}`}>
              <Phone aria-hidden /> {phone}
            </a>
          </Button>
        )}
        <p className="mt-6">
          <Link
            href="/inventory"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Browse our inventory
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onValid, onInvalid)} noValidate className="space-y-6">
      {error && <FormAlert kind="error">{error}</FormAlert>}

      <Section title="Your details">
        <Field label="First name" name="first_name" errors={errors} required>
          {(p) => <Input {...p} {...register("first_name")} autoComplete="given-name" />}
        </Field>
        <Field label="Last name" name="last_name" errors={errors} required>
          {(p) => <Input {...p} {...register("last_name")} autoComplete="family-name" />}
        </Field>
        <Field label="Phone" name="phone" errors={errors} required>
          {(p) => <Input {...p} {...register("phone")} type="tel" autoComplete="tel" />}
        </Field>
        <Field label="Email" name="email" errors={errors} required>
          {(p) => <Input {...p} {...register("email")} type="email" autoComplete="email" />}
        </Field>
        <Field label="Second phone" name="phone2" errors={errors} hint="Optional">
          {(p) => <Input {...p} {...register("phone2")} type="tel" />}
        </Field>
        <Field label="Best time to call" name="best_time" errors={errors}>
          {(p) => (
            <NativeSelect {...p} {...register("best_time")}>
              <option value="">No preference</option>
              {Object.entries(BEST_TIMES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
        <Field label="Preferred contact" name="preferred_contact" errors={errors}>
          {(p) => (
            <NativeSelect {...p} {...register("preferred_contact")}>
              <option value="">No preference</option>
              {Object.entries(CONTACT_METHODS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
      </Section>

      <Section title="Vehicle wanted">
        <Field label="Year from" name="year_from" errors={errors}>
          {(p) => <YearSelect {...p} {...register("year_from")} />}
        </Field>
        <Field label="Year to" name="year_to" errors={errors}>
          {(p) => <YearSelect {...p} {...register("year_to")} />}
        </Field>
        <Field label="Make" name="make" errors={errors} idSuffix={makeOther ? "choice" : undefined}>
          {(p) => (
            <NativeSelect
              {...p}
              value={makeOther ? OTHER : (makeChoice ?? "")}
              onChange={(e) => {
                const other = e.target.value === OTHER;
                setMakeOther(other);
                form.setValue("make", other ? "" : e.target.value);
              }}
            >
              <option value="">Any make</option>
              {COMMON_MAKES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
              <option value={OTHER}>Other</option>
            </NativeSelect>
          )}
        </Field>
        {makeOther && (
          <Field label="Other make" name="make" errors={errors}>
            {(p) => (
              <Input {...p} {...register("make")} placeholder="e.g. Porsche" maxLength={40} />
            )}
          </Field>
        )}
        <Field label="Model" name="model" errors={errors}>
          {(p) => <Input {...p} {...register("model")} placeholder="e.g. RAV4" />}
        </Field>
        <Field label="Engine" name="engine" errors={errors} hint="Optional">
          {(p) => <Input {...p} {...register("engine")} placeholder="e.g. V6, hybrid" />}
        </Field>
        <Field label="Max mileage" name="max_mileage" errors={errors}>
          {(p) => (
            <NativeSelect {...p} {...register("max_mileage")}>
              <option value="">Any</option>
              {MAX_MILEAGE_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m / 1000}k miles
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
        <Field label="Body type" name="body_type" errors={errors}>
          {(p) => (
            <NativeSelect {...p} {...register("body_type")}>
              <option value="">Any</option>
              {Constants.public.Enums.vehicle_body_type.map((b) => (
                <option key={b} value={b}>
                  {BODY_TYPE_LABELS[b]}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
        <Field label="Budget min" name="budget_min" errors={errors}>
          {(p) => (
            <Input {...p} {...register("budget_min")} inputMode="numeric" placeholder="$ No min" />
          )}
        </Field>
        <Field label="Budget max" name="budget_max" errors={errors}>
          {(p) => (
            <Input {...p} {...register("budget_max")} inputMode="numeric" placeholder="$ No max" />
          )}
        </Field>
        <Field
          label="Features and colors"
          name="notes"
          errors={errors}
          className="sm:col-span-2"
          hint={`${notesLength}/${NOTES_MAX}`}
        >
          {(p) => (
            <Textarea
              {...p}
              {...register("notes")}
              rows={4}
              maxLength={NOTES_MAX}
              placeholder="Anything that matters to you: color, leather seats, third row, towing package…"
            />
          )}
        </Field>
      </Section>

      {/* Honeypot: hidden from people and screen readers; bots tend to fill it. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>

      <div className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
        <label className="flex items-start gap-3 text-sm leading-relaxed">
          <input
            id="finder-consent"
            type="checkbox"
            {...register("consent")}
            aria-invalid={!!errors.consent}
            aria-describedby={errors.consent ? "finder-consent-error" : undefined}
            className="mt-1 size-5 shrink-0 accent-primary"
          />
          <span>
            I agree that {dealershipName} may contact me by phone, text, or email about my request.
            Message and data rates may apply. See our{" "}
            <Link
              href="/privacy"
              className="font-semibold text-primary underline underline-offset-4"
            >
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        {errors.consent && (
          <p id="finder-consent-error" className="text-sm font-medium text-destructive">
            {errors.consent.message}
          </p>
        )}
        {captcha.widget}
        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting}
          className="h-12 w-full text-base font-semibold sm:w-auto sm:px-10"
        >
          {isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
          Send my request
        </Button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
      <legend className="sr-only">{title}</legend>
      <h2 className="mb-4 text-lg font-bold" aria-hidden>
        {title}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

type ControlProps = {
  id: string;
  "aria-invalid": boolean;
  "aria-describedby": string | undefined;
};

function Field({
  label,
  name,
  errors,
  required,
  hint,
  idSuffix,
  className,
  children,
}: {
  label: string;
  name: keyof Values;
  errors: FieldErrors<Values>;
  required?: boolean;
  hint?: string;
  idSuffix?: string;
  className?: string;
  children: (props: ControlProps) => React.ReactNode;
}) {
  const id = `finder-${name}${idSuffix ? `-${idSuffix}` : ""}`;
  const message = idSuffix ? undefined : errors[name]?.message;
  const errorId = `${id}-error`;
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-semibold">
          {label}
          {required && (
            <span className="text-primary" aria-hidden>
              {" "}
              *
            </span>
          )}
        </label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children({
        id,
        "aria-invalid": !!message,
        "aria-describedby": message ? errorId : undefined,
      })}
      {message && (
        <p id={errorId} className="text-sm font-medium text-destructive">
          {message}
        </p>
      )}
    </div>
  );
}

function YearSelect(props: React.ComponentProps<typeof NativeSelect>) {
  return (
    <NativeSelect {...props}>
      <option value="">Any</option>
      {YEARS.map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
    </NativeSelect>
  );
}
