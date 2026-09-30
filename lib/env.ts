import { z } from "zod";

// Checked when Next.js loads its config (dev, build, start), so a missing or
// wrong variable fails the build instead of breaking the live site.
// Values are never printed — only the variable names.

const isLocalUrl = (v: string) => /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/.test(v);

const schema = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.url({ protocol: /^https?$/ }),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
      .string()
      .regex(/^(sb_publishable_|eyJ)/, "must be the publishable (or legacy anon) key"),
    SUPABASE_SECRET_KEY: z
      .string()
      .regex(/^(sb_secret_|eyJ)/, "must be the secret (or legacy service role) key")
      .optional(),
    NEXT_PUBLIC_SITE_URL: z.url({ protocol: /^https?$/ }).optional(),
    CRON_SECRET: z.string().min(16, "use at least 16 random characters").optional(),
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(10).optional(),
    NEXT_PUBLIC_ALLOW_INDEXING: z.enum(["true", "false"]).optional(),
    VERCEL_ENV: z.enum(["production", "preview", "development"]).optional(),
  })
  .superRefine((env, ctx) => {
    // Sanity: the secret key must never be put in a NEXT_PUBLIC_ variable.
    if (env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.startsWith("sb_secret_")) {
      ctx.addIssue({
        code: "custom",
        path: ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"],
        message: "is a SECRET key — never expose it in a NEXT_PUBLIC_ variable",
      });
    }
    if (env.VERCEL_ENV !== "production") return;
    const required = ["SUPABASE_SECRET_KEY", "CRON_SECRET", "NEXT_PUBLIC_SITE_URL"] as const;
    for (const key of required) {
      if (!env[key])
        ctx.addIssue({ code: "custom", path: [key], message: "is required in production" });
    }
    if (env.NEXT_PUBLIC_SITE_URL && isLocalUrl(env.NEXT_PUBLIC_SITE_URL)) {
      ctx.addIssue({
        code: "custom",
        path: ["NEXT_PUBLIC_SITE_URL"],
        message: "points at localhost in production",
      });
    }
    if (isLocalUrl(env.NEXT_PUBLIC_SUPABASE_URL)) {
      ctx.addIssue({
        code: "custom",
        path: ["NEXT_PUBLIC_SUPABASE_URL"],
        message: "points at localhost in production",
      });
    }
  });

export function validateEnv(env: NodeJS.ProcessEnv = process.env) {
  const result = schema.safeParse(env);
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`);
    throw new Error(`Invalid environment variables:\n${lines.join("\n")}`);
  }
  return result.data;
}
