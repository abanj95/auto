import { expect, test } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  admin,
  createStaff,
  deleteStaff,
  hasSupabase,
  sharedStaff,
  staffClient,
  type TestStaff,
  unregisteredClient,
} from "./helpers/staff";

// Database rules (RLS, grants, triggers) straight through the Supabase API,
// as each kind of user. The app's own checks aren't involved here.

test.describe("database access rules", () => {
  test.skip(!hasSupabase, "needs Supabase keys in .env.local");
  test.describe.configure({ mode: "serial" });
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "API tests: desktop project only");
  });

  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "x",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  let poster: TestStaff;
  let adminUser: TestStaff;
  let posterDb: SupabaseClient;
  let adminDb: SupabaseClient;
  let draftId: string;

  test.beforeAll(async () => {
    // The run's shared users; these API sessions don't affect their browser sessions.
    [poster, adminUser] = [sharedStaff("poster"), sharedStaff("admin")];
    [posterDb, adminDb] = await Promise.all([staffClient(poster), staffClient(adminUser)]);
    const { data, error } = await admin
      .from("vehicles")
      .insert({ make: "Rlstest", model: "Draft", status: "draft" })
      .select("id")
      .single();
    if (error) throw error;
    draftId = data.id;
  });

  test.afterAll(async () => {
    await admin.from("vehicles").delete().eq("make", "Rlstest");
  });

  test("anon: no drafts, users, activity log, uploads or settings changes", async () => {
    const { data: drafts } = await anon.from("vehicles").select("id").eq("id", draftId);
    expect(drafts).toEqual([]);
    const { data: profiles } = await anon.from("profiles").select("id");
    expect(profiles ?? []).toEqual([]);
    const { error: auditError } = await anon.from("audit_log").select("id");
    expect(auditError).not.toBeNull(); // No grant at all.
    const { data: updated } = await anon
      .from("site_settings")
      .update({ phone: "(000) 000-0000" })
      .eq("id", true)
      .select();
    expect(updated ?? []).toEqual([]);
    const { error: uploadError } = await anon.storage
      .from("vehicle-photos")
      .upload(`${draftId}/x.webp`, new Blob(["x"], { type: "image/webp" }));
    expect(uploadError).not.toBeNull();
    const { error: rpcError } = await anon.rpc("rate_limit_hit", {
      p_key: "x",
      p_limit: 1,
      p_window_seconds: 60,
    });
    expect(rpcError).not.toBeNull();
  });

  test("poster: manages vehicles (incl. delete), nothing admin-only", async () => {
    const db = posterDb;
    // Sees drafts; creates, edits and deletes vehicles (posters may delete, by design).
    expect((await db.from("vehicles").select("id").eq("id", draftId)).data).toHaveLength(1);
    const { data: car, error } = await db
      .from("vehicles")
      .insert({ make: "Rlstest", model: "Poster" })
      .select("id, created_by, stock_no")
      .single();
    expect(error).toBeNull();
    expect(car!.created_by).toBe(poster.userId);
    expect(car!.stock_no).toMatch(/^MC-\d{4,}$/);
    const { error: editError } = await db.from("vehicles").update({ price: 1 }).eq("id", car!.id);
    expect(editError).toBeNull();
    const { data: deleted } = await db.from("vehicles").delete().eq("id", car!.id).select("id");
    expect(deleted).toHaveLength(1);

    // Can't choose system fields on insert (L2).
    const { error: spoof } = await db.from("vehicles").insert({
      make: "Rlstest",
      model: "Spoof",
      stock_no: "HACK-1",
      created_by: adminUser.userId,
    });
    expect(spoof?.code).toBe("42501");

    // Settings, roles, activity log, homepage and Storage are off limits.
    const { data: settings } = await db
      .from("site_settings")
      .update({ phone: "(000) 000-0000" })
      .eq("id", true)
      .select();
    expect(settings ?? []).toEqual([]);
    const { data: roles } = await db
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", poster.userId)
      .select();
    expect(roles ?? []).toEqual([]);
    expect((await db.from("audit_log").select("id").limit(1)).data ?? []).toEqual([]);
    const { error: auditInsert } = await db.from("audit_log").insert({ action: "sign_in" });
    expect(auditInsert).not.toBeNull();
    const { error: slideError } = await db
      .from("hero_slides")
      .insert({ image_path: "/x.jpg", image_width: 1, image_height: 1 });
    expect(slideError).not.toBeNull();
    const { error: uploadError } = await db.storage
      .from("vehicle-photos")
      .upload(`${draftId}/${crypto.randomUUID()}.webp`, new Blob(["x"], { type: "image/webp" }));
    expect(uploadError).not.toBeNull(); // Uploads only through the server.
  });

  test("admin: reads the activity log; nobody can change or delete it", async () => {
    const { error: insertError } = await admin
      .from("audit_log")
      .insert({ action: "sign_in", details: { test: "rls" } });
    expect(insertError).toBeNull();
    const { data: rows } = await adminDb.from("audit_log").select("id").limit(1);
    expect(rows).toHaveLength(1);
    const id = rows![0].id;

    for (const db of [adminDb, posterDb]) {
      const { data: changed } = await db
        .from("audit_log")
        .update({ action: "sign_out" })
        .eq("id", id)
        .select();
      expect(changed ?? []).toEqual([]);
      const { data: removed } = await db.from("audit_log").delete().eq("id", id).select();
      expect(removed ?? []).toEqual([]);
    }
    // Not even the secret key.
    const { error: serviceUpdate } = await admin
      .from("audit_log")
      .update({ action: "sign_out" })
      .eq("id", id);
    expect(serviceUpdate).not.toBeNull();
    const { error: serviceDelete } = await admin.from("audit_log").delete().eq("id", id);
    expect(serviceDelete).not.toBeNull();
  });

  test("token without a staff session (never touched): no staff access", async () => {
    const db = await unregisteredClient(poster);
    expect((await db.from("vehicles").select("id").eq("id", draftId)).data).toEqual([]);
    const { error } = await db.from("vehicles").insert({ make: "Rlstest", model: "Nosession" });
    expect(error).not.toBeNull();
  });

  test("idle or expired session: no staff access, even with a valid token", async () => {
    // Own user: ageing sessions would also end the shared poster's browser session.
    const own = await createStaff("poster", "E2E Idle");
    try {
      await idleChecks(own);
    } finally {
      await deleteStaff(own);
    }
  });

  async function idleChecks(poster: TestStaff) {
    const db = await staffClient(poster);
    expect((await db.from("vehicles").select("id").eq("id", draftId)).data).toHaveLength(1);

    await admin.rpc("admin_age_staff_sessions", {
      p_user_id: poster.userId,
      p_idle_seconds: 31 * 60,
      p_age_seconds: 0,
    });
    expect((await db.from("vehicles").select("id").eq("id", draftId)).data).toEqual([]);
    expect((await db.rpc("touch_staff_session")).data).toBe("idle");
    // Ended for good: activity doesn't revive it.
    expect((await db.rpc("touch_staff_session")).data).toBe("ended");

    const fresh = await staffClient(poster);
    await admin.rpc("admin_age_staff_sessions", {
      p_user_id: poster.userId,
      p_idle_seconds: 0,
      p_age_seconds: 13 * 60 * 60,
    });
    expect((await fresh.rpc("touch_staff_session")).data).toBe("expired");
  }
});
