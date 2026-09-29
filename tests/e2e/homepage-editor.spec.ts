import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

test.describe("homepage editor", () => {
  test.skip(!url || !secretKey, "needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY");
  // These tests change the shared hero slides: run once, one at a time.
  test.describe.configure({ mode: "serial" });
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop project only");
  });

  const admin = createClient(url ?? "", secretKey ?? "", {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const email = `e2e-admin-${crypto.randomUUID()}@example.com`;
  const password = `pw-${crypto.randomUUID()}`;
  let userId: string | undefined;

  test.beforeAll(async () => {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "E2E Admin" },
    });
    if (error) throw error;
    userId = data.user.id;
    await admin.from("profiles").update({ role: "admin" }).eq("id", userId);
  });

  test.afterAll(async () => {
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  async function login(page: Page) {
    await page.goto("/admin/login", { waitUntil: "networkidle" }); // Type only after hydration.
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin$/);
  }

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
