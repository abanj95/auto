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

test("every page sends a nonce-based CSP and the other security headers", async ({ request }) => {
  for (const path of ["/", "/inventory", "/admin/login"]) {
    const res = await request.get(path);
    const headers = res.headers();
    const csp = headers["content-security-policy"];
    expect(csp, path).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["strict-transport-security"]).toContain("includeSubDomains");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"]).toContain("camera=()");
    expect(headers["cross-origin-opener-policy"]).toBe("same-origin");
    expect(headers["x-powered-by"]).toBeUndefined();

    // Next.js puts the nonce on its scripts.
    const nonce = csp.match(/'nonce-([^']+)'/)![1];
    expect(await res.text()).toContain(`nonce="${nonce}"`);
  }
});

test("open redirects are blocked", async ({ page }) => {
  for (const next of ["https://evil.example", "//evil.example", "/\\evil.example"]) {
    await page.goto(`/admin/auth/confirm?next=${encodeURIComponent(next)}`);
    await expect(page).toHaveURL(/\/admin\/login\?error=link$/);
  }
});

test.describe("staff security", () => {
  test.skip(!hasSupabase, "needs Supabase keys in .env.local");
  // One user whose sessions some tests end on purpose: run these in order.
  test.describe.configure({ mode: "serial" });
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop project only");
  });

  let user: TestStaff | undefined;
  test.beforeAll(async () => {
    user = await createStaff("admin", "E2E Security");
  });
  test.afterAll(async () => deleteStaff(user));

  test("signed out: admin pages go to login and the upload API refuses", async ({ page }) => {
    for (const path of ["/admin", "/admin/users", "/admin/activity", "/admin/vehicles/new"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/admin\/login/);
    }
    const res = await page.request.post("/admin/api/uploads?kind=logo", {
      headers: { origin: new URL(page.url()).origin, "content-type": "image/png" },
      data: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    });
    expect(res.status()).toBe(401);
  });

  test("after sign-in, redirects stay on this site", async ({ page }) => {
    await signIn(page, user!, "/admin/users");
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
  });

  test("SVG and fake images are rejected by the upload API", async ({ browser }) => {
    const context = await browser.newContext({ storageState: STATE.admin });
    const page = await context.newPage();
    await page.goto("/admin");
    const origin = new URL(page.url()).origin;
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
    for (const [type, body] of [
      ["image/svg+xml", Buffer.from(svg)],
      ["image/png", Buffer.from(svg)], // Lies about its type.
      ["image/jpeg", Buffer.from("<html><script>alert(1)</script></html>")],
    ] as const) {
      const res = await page.request.post("/admin/api/uploads?kind=logo", {
        headers: { origin, "content-type": type },
        data: body,
      });
      expect(res.status(), type).toBe(415);
    }
    // Cross-site requests are refused outright.
    const cross = await page.request.post("/admin/api/uploads?kind=logo", {
      headers: { origin: "https://evil.example", "content-type": "image/png" },
      data: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    });
    expect(cross.status()).toBe(403);
    await context.close();
  });

  test("the session ends on the server when idle, even if the browser timer is bypassed", async ({
    page,
  }) => {
    await signIn(page, user!);
    await admin.rpc("admin_age_staff_sessions", {
      p_user_id: user!.userId,
      p_idle_seconds: 31 * 60,
      p_age_seconds: 0,
    });
    await page.goto("/admin/vehicles");
    await expect(page).toHaveURL(/\/admin\/login\?error=idle$/);
    await expect(page.getByText("signed out after 30 minutes")).toBeVisible();
  });

  test("the session ends after 12 hours regardless of activity", async ({ page }) => {
    await signIn(page, user!);
    await admin.rpc("admin_age_staff_sessions", {
      p_user_id: user!.userId,
      p_idle_seconds: 0,
      p_age_seconds: 13 * 60 * 60,
    });
    await page.goto("/admin/vehicles");
    await expect(page).toHaveURL(/\/admin\/login\?error=expired$/);
  });

  test("idle logout in the browser: warning at 25 minutes, signed out at 30", async ({ page }) => {
    await page.clock.install();
    await signIn(page, user!);
    await page.waitForLoadState("networkidle"); // The idle timer starts after hydration.
    await page.clock.fastForward("25:05");
    const dialog = page.getByTestId("idle-warning");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("You'll be signed out in 5 minutes");

    // "Stay signed in" resets the timer.
    await dialog.getByRole("button", { name: "Stay signed in" }).click();
    await expect(dialog).toBeHidden();
    await page.clock.fastForward("25:05");
    await expect(dialog).toBeVisible();
    await page.clock.fastForward("05:05");
    await expect(page).toHaveURL(/\/admin\/login\?error=idle$/);
  });

  test("signing out in one tab signs out the others", async ({ context }) => {
    const first = await context.newPage();
    await signIn(first, user!);
    const second = await context.newPage();
    await second.goto("/admin/vehicles", { waitUntil: "networkidle" });
    await expect(second).toHaveURL(/\/admin\/vehicles$/);
    await first.getByRole("button", { name: "Sign out" }).click();
    await expect(first).toHaveURL(/\/admin\/login$/);
    await expect(second).toHaveURL(/\/admin\/login$/);
  });

  test("activity log records sign-ins", async ({ browser }) => {
    const context = await browser.newContext({ storageState: STATE.admin });
    const page = await context.newPage();
    await page.goto("/admin/activity");
    await expect(page.getByTestId("activity-list")).toContainText("Signed in");
    await context.close();
  });
});

test.describe("login protection", () => {
  test.skip(!hasSupabase, "needs Supabase keys in .env.local");
  // A fresh client IP per test, so repeated runs don't trip the per-IP limit
  // (on Vercel this header is set by Vercel, not the browser).
  test.use({ extraHTTPHeaders: { "x-real-ip": `198.51.100.${Math.floor(Math.random() * 250)}` } });
  test.skip(
    !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    "Turnstile is on: the password form can't be automated",
  );
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop project only");
  });

  test("5 failed sign-ins lock the account for 15 minutes, with generic messages", async ({
    page,
  }) => {
    const user = await createStaff("poster", "E2E Lockout");
    try {
      await page.goto("/admin/login", { waitUntil: "networkidle" });
      await page.getByLabel("Email").fill(user.email);
      for (let i = 1; i <= 4; i++) {
        await page.getByLabel("Password").fill(`wrong-password-${i}`);
        await page.getByRole("button", { name: "Sign in" }).click();
        await expect(page.getByText("Invalid email or password.")).toBeVisible();
      }
      await page.getByLabel("Password").fill("wrong-password-5");
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(page.getByText("Too many failed sign-ins")).toBeVisible();

      // Even the right password is refused while locked.
      await page.getByLabel("Password").fill(user.password);
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(page.getByText("Too many failed sign-ins")).toBeVisible();
      await expect(page).toHaveURL(/\/admin\/login/);

      // Unknown emails get the same replies (no account enumeration).
      await page.getByLabel("Email").fill(`nobody-${crypto.randomUUID()}@example.com`);
      await page.getByLabel("Password").fill("wrong-password-x");
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(page.getByText("Invalid email or password.")).toBeVisible();
    } finally {
      await deleteStaff(user);
    }
  });

  test("a correct password signs in, and an unsafe next goes to /admin", async ({ page }) => {
    const user = await createStaff("poster", "E2E Password");
    try {
      await page.goto("/admin/login?next=%2F%2Fevil.example", { waitUntil: "networkidle" });
      await page.getByLabel("Email").fill(user.email);
      await page.getByLabel("Password").fill(user.password);
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(page).toHaveURL(/\/admin$/);
    } finally {
      await deleteStaff(user);
    }
  });
});
