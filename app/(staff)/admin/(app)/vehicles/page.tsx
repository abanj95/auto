import type { Metadata } from "next";

import { requireStaff } from "@/lib/auth";

export const metadata: Metadata = { title: "Vehicles" };

// Placeholder — built in a later stage.
export default async function Page() {
  await requireStaff();

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold tracking-tight">Vehicles</h1>
      <p className="text-muted-foreground">Your vehicle listings will appear here.</p>
    </div>
  );
}
