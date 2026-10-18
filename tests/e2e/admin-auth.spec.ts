import { expect, test } from "@playwright/test";

import {
  admin,
  createStaff,
  deleteStaff,
  hasSupabase,
  signIn,
  STATE,
  type TestStaff,
} from "./helpers/staff";

test("visiting /admin while logged out redirects to /admin/login", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});

test.describe("poster", () => {
  test.skip(!hasSupabase, "needs Supabase keys in .env.local");

  // The run's shared poster (no extra access), already signed in (global-setup.ts).
  test.use({ storageState: STATE.poster });

  test("a poster without extra access can't open Requests, Homepage, Settings or Users", async ({
    page,
  }) => {
    await page.goto("/admin");

    // Visible but disabled in the nav (bottom tabs on phones, sidebar on desktop).
    const locked = ["Requests (no access)", "Settings (no access)", "Users (admin only)"];
    if (test.info().project.name === "desktop") locked.push("Homepage (no access)");
    for (const name of locked) {
      const item = page.getByRole("link", { name });
      await expect(item).toBeVisible();
      await expect(item).toHaveAttribute("aria-disabled", "true");
      await expect(item).not.toHaveAttribute("href", /.*/);
    }

    // Typing the URL is still blocked on the server.
    const pages = {
      "/admin/requests": "Vehicle Finder requests",
      "/admin/homepage": "Homepage",
      "/admin/settings": "Settings",
      "/admin/users": "Users",
      "/admin/activity": "Activity",
    };
    for (const [path, heading] of Object.entries(pages)) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/admin$/);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toHaveCount(0);
    }
  });
});

test.describe("poster access levels", () => {
  test.skip(!hasSupabase, "needs Supabase keys in .env.local");
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop project only");
  });

  let poster: TestStaff | undefined;
  test.beforeAll(async () => {
    poster = await createStaff("poster", "E2E Access");
  });
  test.afterAll(async () => deleteStaff(poster));

  test("an admin turns on Requests and Settings; the poster can open those only", async ({
    browser,
  }) => {
    // Admin: Users → Actions → Access… → switches → Save.
    const adminContext = await browser.newContext({ storageState: STATE.admin });
    const adminPage = await adminContext.newPage();
    await adminPage.goto("/admin/users", { waitUntil: "networkidle" });
    await adminPage.getByRole("button", { name: "Actions for E2E Access" }).click();
    await adminPage.getByRole("menuitem", { name: "Access…" }).click();
    const dialog = adminPage.getByRole("dialog", { name: "Access for E2E Access" });
    await dialog.getByRole("switch", { name: "Requests" }).click();
    await dialog.getByRole("switch", { name: "Settings" }).click();
    await dialog.getByRole("button", { name: "Save access" }).click();
    await expect(dialog).toBeHidden();
    const row = adminPage.getByRole("listitem").filter({ hasText: "E2E Access" });
    await expect(row.getByText("Requests", { exact: true })).toBeVisible();
    await expect(row.getByText("Settings", { exact: true })).toBeVisible();
    await adminContext.close();

    const { data } = await admin
      .from("profiles")
      .select("permissions")
      .eq("id", poster!.userId)
      .single();
    expect(data?.permissions).toEqual(["requests", "settings"]);

    // Poster: Requests and Settings open; Homepage still blocked.
    const posterContext = await browser.newContext();
    const page = await posterContext.newPage();
    await signIn(page, poster!);
    for (const [path, heading] of [
      ["/admin/requests", "Vehicle Finder requests"],
      ["/admin/settings", "Settings"],
    ]) {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    }
    await expect(page.getByRole("link", { name: "Homepage (no access)" })).toBeVisible();
    await page.goto("/admin/homepage");
    await expect(page).toHaveURL(/\/admin$/);
    await posterContext.close();
  });
});
