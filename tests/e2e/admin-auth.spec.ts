import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

test("visiting /admin while logged out redirects to /admin/login", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});

test.describe("poster", () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  test.skip(!url || !secretKey, "needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY");

  // A throwaway poster account, created and deleted by each run.
  const admin = createClient(url ?? "", secretKey ?? "", {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const email = `e2e-poster-${crypto.randomUUID()}@example.com`;
  const password = `pw-${crypto.randomUUID()}`;
  let userId: string | undefined;

  test.beforeAll(async () => {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "E2E Poster" },
    });
    if (error) throw error;
    userId = data.user.id; // The auth trigger gives it a 'poster' profile.
  });

  test.afterAll(async () => {
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  test("a poster sees Homepage/Settings/Users greyed out and cannot open them", async ({
    page,
  }) => {
    await page.goto("/admin/login", { waitUntil: "networkidle" }); // Type only after hydration.
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin$/);

    // Visible but disabled in the nav (bottom tabs on phones, sidebar on desktop).
    for (const label of ["Homepage", "Settings", "Users"]) {
      const item = page.getByRole("link", { name: `${label} (admin only)` });
      await expect(item).toBeVisible();
      await expect(item).toHaveAttribute("aria-disabled", "true");
      await expect(item).not.toHaveAttribute("href", /.*/);
    }

    // Typing the URL is still blocked on the server.
    const pages = {
      "/admin/homepage": "Homepage",
      "/admin/settings": "Settings",
      "/admin/users": "Users",
    };
    for (const [path, heading] of Object.entries(pages)) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/admin$/);
      await expect(page.getByRole("heading", { name: heading })).toHaveCount(0);
    }
  });
});
