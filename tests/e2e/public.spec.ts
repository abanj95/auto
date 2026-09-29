import { expect, test, type Page } from "@playwright/test";

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
}

test("home page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: "Search" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Newest arrivals" })).toBeVisible();
  await expectNoHorizontalScroll(page);
});

test("filtering by make updates the URL and results", async ({ page }) => {
  await page.goto("/inventory");
  await expectNoHorizontalScroll(page);
  const totalBefore = Number(await page.getByTestId("result-count").textContent());

  // Phones/tablets: filters live in a bottom sheet. Desktop: in the sidebar.
  const filtersButton = page.getByRole("button", { name: /^Filters/ });
  if (await filtersButton.isVisible()) await filtersButton.click();
  const panel = (await page.getByRole("dialog").isVisible())
    ? page.getByRole("dialog")
    : page.getByRole("complementary");

  const makeSelect = panel.getByLabel("Make", { exact: true });
  const make = await makeSelect.locator("option").nth(1).getAttribute("value");
  expect(make, "needs at least one listed vehicle").toBeTruthy();
  await makeSelect.selectOption(make!);
  await panel.getByRole("button", { name: "Show results" }).click();

  await expect(page).toHaveURL(new RegExp(`/inventory\\?make=${encodeURIComponent(make!)}$`));
  const totalAfter = Number(await page.getByTestId("result-count").textContent());
  expect(totalAfter).toBeGreaterThan(0);
  expect(totalAfter).toBeLessThanOrEqual(totalBefore);

  const titles = page.getByRole("listitem").getByRole("heading", { level: 3 });
  await expect(titles.first()).toBeVisible();
  for (const title of await titles.allTextContents()) expect(title).toContain(make!);
});

test("a vehicle page shows Call, Text and Share", async ({ page }) => {
  await page.goto("/inventory");
  await page.getByRole("listitem").getByRole("link").first().click();
  await expect(page).toHaveURL(/\/inventory\/[a-z0-9-]+$/);

  // Sticky bar on phones, sidebar card on desktop; only one is visible.
  const actions = page.getByRole("group", { name: "Contact about this vehicle" });
  const call = actions.getByRole("link", { name: "Call", exact: true });
  await expect(call).toBeVisible();
  await expect(call).toHaveAttribute("href", /^tel:\+\d+$/);
  const text = actions.getByRole("link", { name: "Text", exact: true });
  await expect(text).toBeVisible();
  await expect(text).toHaveAttribute("href", /^sms:\+\d+\?&body=.+stock%20[A-Z]+-\d{4}/);
  await expect(actions.getByRole("button", { name: "Share" })).toBeVisible();
  await expectNoHorizontalScroll(page);
});
