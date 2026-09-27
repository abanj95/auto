import type { Metadata } from "next";

import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Settings" };

// Placeholder — built in a later stage.
export default async function Page() {
  await requireAdmin();

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      <p className="text-muted-foreground">Dealership settings are coming soon.</p>
    </div>
  );
}
