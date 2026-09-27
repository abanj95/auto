"use client";

import type { Control, FieldValues, Path } from "react-hook-form";

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

/** Email input for any form whose values include `email`. */
export function EmailField<T extends FieldValues & { email: string }>({
  control,
}: {
  control: Control<T>;
}) {
  return (
    <FormField
      control={control}
      name={"email" as Path<T>}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Email</FormLabel>
          <FormControl>
            <Input
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              className="h-11"
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
