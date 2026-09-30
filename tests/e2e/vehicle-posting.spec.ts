import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";

import { hasSupabase, STATE } from "./helpers/staff";

// VIN alphabet has no I, O or Q. No check digit needed (not validated by design).
const VIN_CHARS = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789";
const randomVin = () =>
  Array.from({ length: 17 }, () => VIN_CHARS[Math.floor(Math.random() * VIN_CHARS.length)]).join(
    "",
  );

test.describe("vehicle posting (poster)", () => {
  test.skip(!hasSupabase, "needs Supabase keys in .env.local");

  // The run's shared poster, already signed in; global-teardown.ts removes what it created.
  test.use({ storageState: STATE.poster });
  const login = (page: Page) => page.goto("/admin");

  test("poster can create a draft, add a photo, publish, and it appears on /inventory", async ({
    page,
  }) => {
    const model = `E2E${Math.floor(Math.random() * 1e8)}`;
    await login(page);
    await page.goto("/admin/vehicles/new", { waitUntil: "networkidle" });

    await page.getByLabel("VIN", { exact: true }).fill(randomVin());
    await page.getByLabel("Year").fill("2020");
    await page.getByLabel("Make").fill("Testmake");
    await page.getByLabel("Model").fill(model);
    await page.getByLabel("Price").fill("12345");
    await page.getByLabel("Mileage").fill("54321");
    await expect(page.getByLabel("Price")).toHaveValue("12,345");

    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText("Draft saved.")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/vehicles\/[0-9a-f-]{36}$/);

    const jpeg = await sharp({
      create: { width: 2400, height: 1800, channels: 3, background: "#2563eb" },
    })
      .jpeg()
      .toBuffer();
    await page
      .getByTestId("photo-input")
      .setInputFiles({ name: "car.jpg", mimeType: "image/jpeg", buffer: jpeg });
    await expect(page.getByTestId("photo-tile")).toHaveAttribute("data-state", "done", {
      timeout: 30_000,
    });
    await expect(page.getByTestId("photo-tile").getByText("Cover")).toBeVisible();

    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByText("Published — it's live on the site.")).toBeVisible();

    await page.goto("/inventory?make=Testmake");
    await expect(
      page.getByRole("heading", { level: 3, name: `2020 Testmake ${model}` }),
    ).toBeVisible();
  });

  test("poster can delete vehicles but does not see Featured", async ({ page }) => {
    await login(page);

    await page.goto("/admin/vehicles/new", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Photos" })).toBeVisible();
    await expect(page.getByRole("switch", { name: "Featured" })).toHaveCount(0);
    await expect(page.getByText("Featured", { exact: true })).toHaveCount(0);

    await page.goto("/admin/vehicles");
    await page
      .getByRole("button", { name: /^Actions for / })
      .first()
      .click();
    await expect(page.getByRole("menuitem", { name: "Edit" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Delete" })).toBeVisible();
  });
});
