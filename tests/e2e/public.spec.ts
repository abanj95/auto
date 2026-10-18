import { expect, test, type Page } from "@playwright/test";

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
}

test("home page: hero, quick links and welcome", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const tiles = page.getByTestId("quick-links");
  await expect(tiles.getByRole("link", { name: "View Inventory" })).toHaveAttribute(
    "href",
    "/inventory",
  );
  await expect(tiles.getByRole("link", { name: "Vehicle Finder" })).toHaveAttribute(
    "href",
    "/vehicle-finder",
  );
  await expect(page.getByRole("heading", { name: /^Welcome to / })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Newest arrivals" })).toHaveCount(0);
  await expectNoHorizontalScroll(page);
});

test("filtering by make updates the URL and results", async ({ page }, testInfo) => {
  await page.goto("/inventory");
  await expectNoHorizontalScroll(page);
  const totalBefore = Number(await page.getByTestId("result-count").textContent());

  if (testInfo.project.name === "desktop") {
    // Desktop: the horizontal bar applies each change at once.
    const make = page.getByTestId("filter-bar").getByLabel("Make", { exact: true });
    const value = await make.locator("option").nth(1).getAttribute("value");
    expect(value, "needs at least one listed vehicle").toBeTruthy();
    await make.selectOption(value!);
    await expect(page).toHaveURL(new RegExp(`/inventory\\?make=${encodeURIComponent(value!)}$`));
    await checkResults(value!);
  } else {
    // Phones: a Filters button opens the bottom sheet.
    await page.getByRole("button", { name: /^Filters/ }).click();
    const panel = page.getByRole("dialog");
    const make = panel.getByLabel("Make", { exact: true });
    const value = await make.locator("option").nth(1).getAttribute("value");
    expect(value, "needs at least one listed vehicle").toBeTruthy();
    await make.selectOption(value!);
    await panel.getByRole("button", { name: "Show results" }).click();
    await expect(page).toHaveURL(new RegExp(`/inventory\\?make=${encodeURIComponent(value!)}$`));
    await checkResults(value!);
  }

  async function checkResults(make: string) {
    const totalAfter = Number(await page.getByTestId("result-count").textContent());
    expect(totalAfter).toBeGreaterThan(0);
    expect(totalAfter).toBeLessThanOrEqual(totalBefore);
    const titles = page.getByRole("article").getByRole("heading", { level: 3 });
    await expect(titles.first()).toBeVisible();
    for (const title of await titles.allTextContents())
      expect(title.toLowerCase()).toContain(make.toLowerCase());
  }
});

test("list / grid toggle: URL, layout and remembered choice", async ({ page }) => {
  await page.goto("/inventory");
  await expect(page.getByTestId("vehicle-list")).toBeVisible();
  await expect(page.getByTestId("vehicle-list-row").first()).toBeVisible();

  await page.getByRole("link", { name: "Grid view" }).click();
  await expect(page).toHaveURL(/[?&]view=grid/);
  await expect(page.getByTestId("vehicle-grid")).toBeVisible();
  await expect(page.getByTestId("vehicle-card").first()).toBeVisible();
  await expectNoHorizontalScroll(page);

  // Without ?view, the browser restores the last choice.
  await page.goto("/inventory");
  await expect(page).toHaveURL(/[?&]view=grid/);
  await expect(page.getByTestId("vehicle-grid")).toBeVisible();

  await page.getByRole("link", { name: "List view" }).click();
  await expect(page).toHaveURL(/[?&]view=list/);
  await expect(page.getByTestId("vehicle-list")).toBeVisible();
  // List rows show the spec table and a price box.
  const row = page.getByTestId("vehicle-list-row").first();
  await expect(row.getByText("Stock no.")).toBeVisible();
  await expect(row.getByText("Price", { exact: true })).toBeVisible();
  await expect(row.getByRole("button", { name: /^View all \d+ photos/ })).toBeVisible();
  await expectNoHorizontalScroll(page);
});

test("per page and the price disclaimer", async ({ page }) => {
  await page.goto("/inventory");
  await page.getByLabel("Vehicles per page").selectOption("12");
  await expect(page).toHaveURL(/[?&]per_page=12/);
  await expect(page.getByTestId("price-disclaimer")).not.toBeEmpty();
  await expect(page.getByText(/doc(ument)? fee/i)).toHaveCount(0);
});

test("footer links to Terms of Use and Privacy Policy", async ({ page }) => {
  for (const [label, heading] of [
    ["Terms of Use", "Terms of Use"],
    ["Privacy Policy", "Privacy Policy"],
  ]) {
    await page.goto("/");
    await page.getByRole("contentinfo").getByRole("link", { name: label }).click();
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await expect(page.getByText(/^Last updated /)).toBeVisible();
    await expectNoHorizontalScroll(page);
  }
});

test("a vehicle page shows Call, Text and Share", async ({ page }) => {
  await page.goto("/inventory");
  await page
    .getByRole("link", { name: /^View details/ })
    .first()
    .click();
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
