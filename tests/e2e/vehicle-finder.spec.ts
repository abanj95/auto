import { expect, test, type Page } from "@playwright/test";

import { admin, hasSupabase } from "./helpers/staff";

// Public Vehicle Finder. Rows are saved by the server; each test uses its own
// email so it can find and delete what it created.

test.describe("vehicle finder", () => {
  test.skip(!hasSupabase, "needs Supabase keys in .env.local");
  test.skip(
    !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    "Turnstile is on: the form can't be automated",
  );
  // A fresh client IP per test, so repeated runs don't trip the 3-per-hour limit
  // (on Vercel this header is set by Vercel, not the browser).
  test.use({
    extraHTTPHeaders: { "x-real-ip": `203.0.113.${Math.floor(Math.random() * 250)}` },
  });

  const emails: string[] = [];
  test.afterAll(async () => {
    if (emails.length) await admin.from("vehicle_requests").delete().in("email", emails);
  });

  async function fillRequired(page: Page, email: string) {
    await page.goto("/vehicle-finder", { waitUntil: "networkidle" }); // Type after hydration.
    await page.getByLabel(/^First name/).fill("Pat");
    await page.getByLabel(/^Last name/).fill("Tester");
    await page.getByLabel(/^Phone/).fill("215-555-0142");
    await page.getByLabel(/^Email/).fill(email);
  }

  test("submits a request and shows the thank-you message", async ({ page }) => {
    const email = `e2e-finder-${crypto.randomUUID()}@example.com`;
    emails.push(email);
    await fillRequired(page, email);
    await page.getByLabel("Year from").selectOption("2018");
    await page.getByLabel("Year to").selectOption("2022");
    await page.getByLabel("Make", { exact: true }).selectOption("Toyota");
    await page.getByLabel("Model").fill("RAV4");
    await page.getByLabel("Max mileage").selectOption("60000");
    await page.getByLabel("Budget max").fill("25,000");
    await page.getByLabel("Features and colors").fill("AWD, blue or gray");
    await page.getByLabel(/I agree that/).check();
    await page.getByRole("button", { name: "Send my request" }).click();

    await expect(page.getByTestId("finder-thanks")).toBeVisible();
    const { data } = await admin
      .from("vehicle_requests")
      .select("make, model, year_from, year_to, max_mileage, budget_max, phone, status, ip_hash")
      .eq("email", email)
      .single();
    expect(data).toMatchObject({
      make: "Toyota",
      model: "RAV4",
      year_from: 2018,
      year_to: 2022,
      max_mileage: 60000,
      budget_max: 25000,
      phone: "(215) 555-0142",
      status: "new",
    });
    expect(data?.ip_hash).not.toContain("203.0.113."); // Hashed, never the raw IP.
  });

  test("is rejected without the consent box", async ({ page }) => {
    const email = `e2e-finder-${crypto.randomUUID()}@example.com`;
    emails.push(email);
    await fillRequired(page, email);
    await page.getByRole("button", { name: "Send my request" }).click();

    await expect(page.getByText("Please agree so we can contact you.")).toBeVisible();
    await expect(page.getByTestId("finder-thanks")).toHaveCount(0);
    const { count } = await admin
      .from("vehicle_requests")
      .select("id", { count: "exact", head: true })
      .eq("email", email);
    expect(count).toBe(0);
  });

  test("the Privacy Policy link in the consent text works", async ({ page }) => {
    await page.goto("/vehicle-finder");
    await page.getByRole("link", { name: "Privacy Policy" }).first().click();
    await expect(page.getByRole("heading", { level: 1, name: "Privacy Policy" })).toBeVisible();
  });
});
