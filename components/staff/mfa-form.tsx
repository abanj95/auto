"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { recordMfa } from "@/app/(staff)/admin/(auth)/actions";
import { FormAlert } from "@/components/staff/form-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

type Enrollment = { factorId: string; qrCode: string; secret: string };

/** TOTP enrolment (QR code) or verification, via Supabase MFA. */
export function MfaForm({ mode, next }: { mode: "enroll" | "verify"; next: string }) {
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const supabase = createClient();
    void (async () => {
      const { data, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) return setError("Couldn't load your sign-in settings. Reload the page.");

      if (mode === "verify") {
        const factor = data.totp.find((f) => f.status === "verified");
        if (factor) setFactorId(factor.id);
        return;
      }
      // Remove half-finished setups from earlier visits, then start a new one.
      for (const f of data.all) {
        if (f.factor_type === "totp" && f.status === "unverified") {
          await supabase.auth.mfa.unenroll({ factorId: f.id });
        }
      }
      const { data: enrolled, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Authenticator ${new Date().toISOString().slice(0, 16)}`,
      });
      if (enrollError) return setError("Couldn't start the setup. Reload the page.");
      setEnrollment({
        factorId: enrolled.id,
        qrCode: enrolled.totp.qr_code,
        secret: enrolled.totp.secret,
      });
      setFactorId(enrolled.id);
    })();
  }, [mode]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId || !/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error: verifyError } = await createClient().auth.mfa.challengeAndVerify({
      factorId,
      code,
    });
    if (verifyError) {
      setBusy(false);
      setCode("");
      setError(
        verifyError.status === 429
          ? "Too many attempts. Wait a few minutes and try again."
          : "That code didn't work. Check the time on your phone and try the newest code.",
      );
      return;
    }
    await recordMfa(mode === "enroll" ? "enrolled" : "verified");
    // Full navigation so the server sees the upgraded (aal2) session cookie.
    window.location.assign(next);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate suppressHydrationWarning>
      {error && <FormAlert kind="error">{error}</FormAlert>}

      {mode === "enroll" && (
        <div className="space-y-3">
          <p className="text-sm">
            1. Open your authenticator app and scan this code (or enter the key by hand).
          </p>
          <div className="flex justify-center">
            {enrollment ? (
              // eslint-disable-next-line @next/next/no-img-element -- data: SVG from Supabase
              <img
                src={enrollment.qrCode}
                alt="QR code for your authenticator app"
                className="size-48 rounded-md border bg-white p-2"
                data-testid="mfa-qr"
              />
            ) : (
              <div className="flex size-48 items-center justify-center rounded-md border">
                <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
              </div>
            )}
          </div>
          {enrollment && (
            <p className="text-center text-xs text-muted-foreground">
              Key:{" "}
              <code className="font-mono break-all select-all" data-testid="mfa-secret">
                {enrollment.secret}
              </code>
            </p>
          )}
          <p className="text-sm">2. Enter the 6-digit code the app shows.</p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="mfa-code">Code</Label>
        <Input
          id="mfa-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className="h-12 text-center font-mono text-xl tracking-[0.4em]"
          autoFocus
        />
      </div>
      <Button type="submit" size="lg" className="h-11 w-full" disabled={busy || !factorId}>
        {busy ? "Checking…" : mode === "enroll" ? "Turn on two-step verification" : "Verify"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Lost your phone? Ask an admin to reset your two-step verification.{" "}
        <a href="/admin/auth/signout?reason=ended" className="underline underline-offset-4">
          Sign out
        </a>
      </p>
    </form>
  );
}
