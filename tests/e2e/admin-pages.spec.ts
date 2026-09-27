import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const cronSecret = process.env.CRON_SECRET;

const VIN_CHARS = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789";
const randomVin = () =>
  Array.from({ length: 17 }, () => VIN_CHARS[Math.floor(Math.random() * VIN_CHARS.length)]).join(
    "",
  );

test.describe("admin pages", () => {
  test.skip(!url || !secretKey, "needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY");
  // These tests change shared data (site settings, vehicles): run them once, not per viewport.
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop project only");
  });

  const admin = createClient(url ?? "", secretKey ?? "", {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  test("an admin can update the phone number and see it in the public footer", async ({ page }) => {
    const email = `e2e-admin-${crypto.randomUUID()}@example.com`;
    const password = `pw-${crypto.randomUUID()}`;
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "E2E Admin" },
    });
    if (error) throw error;
    const userId = created.user.id;
    const { data: before } = await admin.from("site_settings").select("phone").single();

    try {
      await admin.from("profiles").update({ role: "admin" }).eq("id", userId);

      await page.goto("/admin/login", { waitUntil: "networkidle" });
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Password").fill(password);
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(page).toHaveURL(/\/admin$/);

      await page.goto("/admin/settings", { waitUntil: "networkidle" });
      const n = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
      await page.getByLabel("Phone (for Call)").fill(`215 555 ${n}`);
      await page.getByRole("button", { name: "Save settings" }).click();
      await expect(page.getByText("Settings saved.")).toBeVisible();
      await expect(page.getByLabel("Phone (for Call)")).toHaveValue(`(215) 555-${n}`);

      await page.goto("/");
      const footer = page.getByRole("contentinfo");
      await expect(footer.getByRole("link", { name: `(215) 555-${n}` })).toHaveAttribute(
        "href",
        `tel:+1215555${n}`,
      );
    } finally {
      await admin
        .from("site_settings")
        .update({ phone: before?.phone ?? null })
        .eq("id", true);
      await admin.auth.admin.deleteUser(userId);
    }
  });

  test("the purge job deletes cars sold more than 31 days ago (and their photos) only", async ({
    request,
  }) => {
    test.skip(!cronSecret, "needs CRON_SECRET");
    const days = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
    const base = {
      year: 2015,
      make: "Purgetest",
      model: "Old",
      price: 1000,
      mileage: 1,
      status: "sold" as const,
    };
    const { data: cars, error } = await admin
      .from("vehicles")
      .insert([
        { ...base, vin: randomVin(), sold_at: days(32) },
        { ...base, vin: randomVin(), sold_at: days(5) },
      ])
      .select("id");
    if (error) throw error;
    const [old, recent] = cars.map((c) => c.id);
    const path = `${old}/${crypto.randomUUID()}.webp`;

    try {
      await admin.storage
        .from("vehicle-photos")
        .upload(path, new Blob([new Uint8Array([1, 2, 3])], { type: "image/webp" }));
      await admin
        .from("vehicle_photos")
        .insert({ vehicle_id: old, storage_path: path, width: 1, height: 1 });

      expect((await request.get("/api/cron/purge-sold")).status()).toBe(401);
      const res = await request.get("/api/cron/purge-sold", {
        headers: { authorization: `Bearer ${cronSecret}` },
      });
      expect(res.status()).toBe(200);
      expect((await res.json()).deleted).toBeGreaterThanOrEqual(1);

      const { data: left } = await admin.from("vehicles").select("id").in("id", [old, recent]);
      expect(left?.map((v) => v.id)).toEqual([recent]);
      const { data: files } = await admin.storage.from("vehicle-photos").list(old);
      expect(files ?? []).toHaveLength(0);
    } finally {
      await admin.storage.from("vehicle-photos").remove([path]);
      await admin.from("vehicles").delete().in("id", [old, recent]);
    }
  });
});
