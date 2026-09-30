import { expect, test } from "@playwright/test";

import { hasSupabase, STATE } from "./helpers/staff";

test("visiting /admin while logged out redirects to /admin/login", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});

test.describe("poster", () => {
  test.skip(!hasSupabase, "needs Supabase keys in .env.local");

  // The run's shared poster (with two-factor), already signed in (global-setup.ts).
  test.use({ storageState: STATE.poster });

  test("a poster sees Homepage/Settings/Users greyed out and cannot open them", async ({
    page,
  }) => {
    await page.goto("/admin");

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
      "/admin/activity": "Activity",
    };
    for (const [path, heading] of Object.entries(pages)) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/admin$/);
      await expect(page.getByRole("heading", { name: heading })).toHaveCount(0);
    }
  });
});
