"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { requestPasswordReset, type ActionResult } from "@/app/(staff)/admin/(auth)/actions";
import { EmailField } from "@/components/staff/email-field";
import { FormAlert } from "@/components/staff/form-alert";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { emailOnlySchema, type EmailOnlyInput } from "@/lib/validation/auth";

export function ForgotPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const form = useForm<EmailOnlyInput>({
    resolver: zodResolver(emailOnlySchema),
    defaultValues: { email: "" },
  });

  function onSubmit(values: EmailOnlyInput) {
    setResult(null);
    startTransition(async () => {
      setResult(await requestPasswordReset(values));
    });
  }

  return (
    <div className="space-y-4">
      {result && (
        <FormAlert kind={result.ok ? "success" : "error"}>
          {result.ok ? result.message : result.error}
        </FormAlert>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <EmailField control={form.control} />
          <Button type="submit" size="lg" className="h-11 w-full" disabled={pending}>
            {pending ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
