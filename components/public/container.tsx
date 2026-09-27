import { cn } from "@/lib/utils";

/** Centered content column, max ~1280px, 16px gutters on phones. */
export function Container({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)} {...props} />
  );
}
