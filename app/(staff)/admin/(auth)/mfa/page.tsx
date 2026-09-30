import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MfaForm } from "@/components/staff/mfa-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LOGIN_PATH, safeAdminPath } from "@/lib/auth-paths";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Two-step verification" };

/**
 * Second sign-in step, required for every staff member. First visit: set up an
 * authenticator app (QR code). Afterwards: enter the 6-digit code.
 */
export default async function MfaPage({ searchParams }: PageProps<"/admin/mfa">) {
  const { next } = await searchParams;
  const target = safeAdminPath(typeof next === "string" ? next : null);

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect(LOGIN_PATH);
  if (data.claims.aal === "aal2") redirect(target);

  const { data: factors } = await supabase.auth.mfa.listFactors();
  const enrolled = (factors?.totp ?? []).some((f) => f.status === "verified");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Two-step verification</CardTitle>
        <CardDescription>
          {enrolled
            ? "Enter the 6-digit code from your authenticator app."
            : "Staff accounts need an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password, …). Set it up once — it takes a minute."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <MfaForm mode={enrolled ? "verify" : "enroll"} next={target} />
      </CardContent>
    </Card>
  );
}
