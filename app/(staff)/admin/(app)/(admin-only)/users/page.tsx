import type { Metadata } from "next";

import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Users" };

// Placeholder — built in a later stage.
export default async function Page() {
  await requireAdmin();

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold tracking-tight">Users</h1>
      <p className="text-muted-foreground">Staff user management is coming soon.</p>
    </div>
  );
}
