import type { Metadata } from "next";

import { ResetPasswordForm } from "@/components/staff/reset-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Welcome" };

// Invite links land here via /admin/auth/confirm (which signs the user in).
// proxy.ts sends visitors without a session to the login page.
export default function WelcomePage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Welcome to McRowin Auto</CardTitle>
        <CardDescription>
          Choose a password for your staff account. Use at least 12 characters.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResetPasswordForm />
      </CardContent>
    </Card>
  );
}
