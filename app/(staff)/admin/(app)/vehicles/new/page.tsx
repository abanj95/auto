import type { Metadata } from "next";

import { requireStaff } from "@/lib/auth";

export const metadata: Metadata = { title: "Add a vehicle" };

// Placeholder — built in a later stage.
export default async function Page() {
  await requireStaff();

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold tracking-tight">Add a vehicle</h1>
      <p className="text-muted-foreground">The add-vehicle form is coming next.</p>
    </div>
  );
}
