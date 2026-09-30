import { z } from "zod";

const email = z.string().trim().pipe(z.email("Enter a valid email address."));

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const emailOnlySchema = z.object({ email });
export type EmailOnlyInput = z.infer<typeof emailOnlySchema>;

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(12, "Use at least 12 characters.")
      .max(72, "Use 72 characters or fewer."),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match.",
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
