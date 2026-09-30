import type { Metadata } from "next";

import { LoginForm } from "@/components/staff/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DISABLED_MESSAGE } from "@/lib/auth";

export const metadata: Metadata = { title: "Staff sign in" };

const ERRORS: Record<string, string> = {
  disabled: DISABLED_MESSAGE,
  link: "That sign-in link is invalid or has expired. Request a new one.",
  idle: "You were signed out after 30 minutes without activity.",
  expired: "Your session reached its 12-hour limit. Please sign in again.",
  ended: "Your session ended. Please sign in again.",
};

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  const { next, error } = await searchParams;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Staff sign in</CardTitle>
        <CardDescription>For McRowin Auto staff only.</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm
          next={typeof next === "string" ? next : undefined}
          initialError={typeof error === "string" ? ERRORS[error] : undefined}
        />
      </CardContent>
    </Card>
  );
}
