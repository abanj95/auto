import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/** Styled native <select>: phones show their own picker, and it submits with GET forms. */
export function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        suppressHydrationWarning // Chrome on iOS adds autofill attributes.
        className={cn(
          "h-11 w-full appearance-none rounded-md border border-input bg-background pr-9 pl-3 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 md:text-sm",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
    </div>
  );
}
