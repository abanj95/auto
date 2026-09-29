/**
 * Before launch: delete every demo vehicle (is_demo = true), its photo rows
 * and its files in the vehicle-photos bucket. Hero slides are kept.
 *
 *   pnpm tsx scripts/remove-demo.ts
 */
import { adminClient, removeDemoVehicles } from "./demo-common";

async function main() {
  const count = await removeDemoVehicles(adminClient());
  console.log(count ? `Done: removed ${count} demo vehicles.` : "No demo vehicles found.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
