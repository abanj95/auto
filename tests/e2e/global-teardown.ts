import { existsSync, readFileSync, rmSync } from "node:fs";

import { admin, AUTH_DIR, deleteStaff, type TestStaff } from "./helpers/staff";

export default async function globalTeardown() {
  const file = `${AUTH_DIR}/users.json`;
  if (!existsSync(file)) return;
  const users = JSON.parse(readFileSync(file, "utf8")) as Record<string, TestStaff>;
  for (const user of Object.values(users)) {
    // Remove what the shared users created (vehicles + photo files), then the users.
    const { data: vehicles } = await admin
      .from("vehicles")
      .select("id, vehicle_photos(storage_path)")
      .eq("created_by", user.userId);
    const paths = (vehicles ?? []).flatMap((v) => v.vehicle_photos.map((p) => p.storage_path));
    if (paths.length) await admin.storage.from("vehicle-photos").remove(paths);
    if (vehicles?.length)
      await admin
        .from("vehicles")
        .delete()
        .in(
          "id",
          vehicles.map((v) => v.id),
        );
    await deleteStaff(user);
  }
  rmSync(AUTH_DIR, { recursive: true, force: true });
}
