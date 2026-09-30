import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";

import { admin, hasSupabase, STATE } from "./helpers/staff";

test.describe("homepage editor", () => {
  test.skip(!hasSupabase, "needs Supabase keys in .env.local");
  // These tests change the shared hero slides: run once, one at a time.
  test.describe.configure({ mode: "serial" });
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop project only");
  });

  test.use({ storageState: STATE.admin });
  const login = (page: Page) => page.goto("/admin");

  test("an admin adds a slide and it appears on the home page", async ({ page }) => {
    const headline = `E2E slide ${crypto.randomUUID().slice(0, 8)}`;
    try {
      await login(page);
      await page.goto("/admin/homepage", { waitUntil: "networkidle" });
      await page.getByRole("button", { name: "Add slide" }).click();
      const dialog = page.getByRole("dialog");

      const jpeg = await sharp({
        create: { width: 2000, height: 1000, channels: 3, background: "#1e3a8a" },
      })
        .jpeg()
        .toBuffer();
      await dialog
        .getByTestId("slide-image-input")
        .setInputFiles({ name: "hero.jpg", mimeType: "image/jpeg", buffer: jpeg });
      await expect(dialog.getByRole("button", { name: "Replace image" })).toBeVisible({
        timeout: 30_000,
      });

      await dialog.getByLabel("Headline", { exact: true }).fill(headline);
      await dialog.getByLabel("Button text").fill("Shop SUVs");
      await dialog.getByLabel("Button link").fill("/inventory?body=suv");
      await dialog.getByRole("button", { name: "Add slide" }).click();
      await expect(page.getByText("Slide added.")).toBeVisible();
      await expect(page.getByTestId("slide-row").filter({ hasText: headline })).toBeVisible();

      // On the home page: go to the new (last) slide.
      await page.goto("/", { waitUntil: "networkidle" });
      const dots = page.getByRole("button", { name: /^Show slide \d+$/ });
      await dots.last().click();
      const slide = page.getByRole("group").filter({ hasText: headline });
      await expect(slide.getByRole("heading", { name: headline })).toBeVisible();
      await expect(slide.getByRole("link", { name: "Shop SUVs" })).toHaveAttribute(
        "href",
        "/inventory?body=suv",
      );
    } finally {
      const { data } = await admin
        .from("hero_slides")
        .delete()
        .eq("headline", headline)
        .select("image_path");
      const paths = (data ?? []).map((s) => s.image_path).filter((p) => !p.startsWith("/"));
      if (paths.length) await admin.storage.from("site-images").remove(paths);
    }
  });

  test("with no live slides the fallback hero shows", async ({ page }) => {
    const { data: live } = await admin.from("hero_slides").select("id").eq("active", true);
    const ids = (live ?? []).map((s) => s.id);
    try {
      if (ids.length) await admin.from("hero_slides").update({ active: false }).in("id", ids);
      const { data: settings } = await admin
        .from("site_settings")
        .select("dealership_name")
        .single();

      await page.goto("/", { waitUntil: "networkidle" });
      const hero = page.getByTestId("fallback-hero");
      await expect(hero).toBeVisible();
      await expect(hero.getByRole("heading", { level: 1 })).toHaveText(settings!.dealership_name);
      await expect(page.getByRole("region", { name: "Highlights" })).toHaveCount(0);
      // The quick search is still there.
      await expect(page.getByRole("button", { name: "Search" })).toBeVisible();
    } finally {
      if (ids.length) await admin.from("hero_slides").update({ active: true }).in("id", ids);
    }
  });
});
