"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import {
  sendMagicLink,
  signInWithPassword,
  type ActionResult,
} from "@/app/(staff)/admin/(auth)/actions";
import { EmailField } from "@/components/staff/email-field";
import { FormAlert } from "@/components/staff/form-alert";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  emailOnlySchema,
  loginSchema,
  type EmailOnlyInput,
  type LoginInput,
} from "@/lib/validation/auth";

type Mode = "password" | "link";

export function LoginForm({ next, initialError }: { next?: string; initialError?: string }) {
  const [mode, setMode] = useState<Mode>("password");
  const [result, setResult] = useState<ActionResult | null>(
    initialError ? { ok: false, error: initialError } : null,
  );
  const [email, setEmail] = useState("");

  function switchMode(to: Mode, currentEmail: string) {
    setEmail(currentEmail);
    setResult(null);
    setMode(to);
  }

  return (
    <div className="space-y-4">
      {result && (
        <FormAlert kind={result.ok ? "success" : "error"}>
          {result.ok ? result.message : result.error}
        </FormAlert>
      )}
      {mode === "password" ? (
        <PasswordForm
          next={next}
          defaultEmail={email}
          onResult={setResult}
          onUseLink={(e) => switchMode("link", e)}
        />
      ) : (
        <MagicLinkForm
          next={next}
          defaultEmail={email}
          onResult={setResult}
          onUsePassword={(e) => switchMode("password", e)}
        />
      )}
    </div>
  );
}

function PasswordForm({
  next,
  defaultEmail,
  onResult,
  onUseLink,
}: {
  next?: string;
  defaultEmail: string;
  onResult: (r: ActionResult | null) => void;
  onUseLink: (email: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: defaultEmail, password: "" },
  });

  function onSubmit(values: LoginInput) {
    onResult(null);
    startTransition(async () => {
      // On success the action redirects, so a result means it failed.
      const result = await signInWithPassword(values, next);
      onResult(result);
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <EmailField control={form.control} />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Password</FormLabel>
                <Link
                  href="/admin/forgot-password"
                  className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="current-password"
                  className="h-11"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" size="lg" className="h-11 w-full" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-11 w-full"
          onClick={() => onUseLink(form.getValues("email"))}
        >
          Email me a sign-in link
        </Button>
      </form>
    </Form>
  );
}

function MagicLinkForm({
  next,
  defaultEmail,
  onResult,
  onUsePassword,
}: {
  next?: string;
  defaultEmail: string;
  onResult: (r: ActionResult | null) => void;
  onUsePassword: (email: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const form = useForm<EmailOnlyInput>({
    resolver: zodResolver(emailOnlySchema),
    defaultValues: { email: defaultEmail },
  });

  function onSubmit(values: EmailOnlyInput) {
    onResult(null);
    startTransition(async () => {
      onResult(await sendMagicLink(values, next));
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <EmailField control={form.control} />
        <Button type="submit" size="lg" className="h-11 w-full" disabled={pending}>
          {pending ? "Sending…" : "Email me a sign-in link"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-11 w-full"
          onClick={() => onUsePassword(form.getValues("email"))}
        >
          Sign in with password instead
        </Button>
      </form>
    </Form>
  );
}
