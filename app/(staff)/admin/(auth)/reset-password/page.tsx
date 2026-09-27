import type { Metadata } from "next";

import { ResetPasswordForm } from "@/components/staff/reset-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Set a new password" };

// Reached from the reset email via /admin/auth/confirm, which signs the user in.
// proxy.ts sends visitors without a session to the login page.
export default function ResetPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Set a new password</CardTitle>
        <CardDescription>Use at least 8 characters.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResetPasswordForm />
      </CardContent>
    </Card>
  );
}
