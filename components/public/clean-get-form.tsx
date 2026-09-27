"use client";

import { useRouter } from "next/navigation";

/**
 * A plain GET form (works before JavaScript loads) that, once hydrated,
 * drops empty fields so URLs stay short: /inventory?make=Honda, not ?make=Honda&model=&…
 */
export function CleanGetForm({
  action,
  onNavigate,
  ...props
}: Omit<React.ComponentProps<"form">, "action" | "method"> & {
  action: string;
  onNavigate?: () => void;
}) {
  const router = useRouter();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(event.currentTarget)) {
      if (typeof value === "string" && value !== "") params.append(key, value);
    }
    const query = params.toString();
    router.push(query ? `${action}?${query}` : action);
    onNavigate?.();
  }

  // suppressHydrationWarning: Chrome on iOS adds autofill attributes to forms.
  return (
    <form
      action={action}
      method="get"
      onSubmit={handleSubmit}
      suppressHydrationWarning
      {...props}
    />
  );
}
