import { expect, test } from "@playwright/test";

test("home page shows the coming-soon message", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("McRowin Auto — coming soon");

  // No horizontal scroll at any viewport.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});
