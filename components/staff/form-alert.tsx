import { CircleAlert, CircleCheck } from "lucide-react";

import { cn } from "@/lib/utils";

/** Success or error message shown above/below an auth form. */
export function FormAlert({ kind, children }: { kind: "error" | "success"; children: string }) {
  const Icon = kind === "error" ? CircleAlert : CircleCheck;
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={cn(
        "flex gap-2 rounded-md border p-3 text-sm",
        kind === "error"
          ? "border-destructive/30 bg-destructive/5 text-destructive"
          : "border-emerald-600/30 bg-emerald-50 text-emerald-800",
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p>{children}</p>
    </div>
  );
}
