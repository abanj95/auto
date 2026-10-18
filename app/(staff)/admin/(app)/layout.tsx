import { IdleWatcher } from "@/components/staff/idle-watcher";
import { BottomTabs, Sidebar } from "@/components/staff/staff-nav";
import { TopBar } from "@/components/staff/top-bar";
import { requireStaff } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

// Signed-in staff chrome. Every page and server action below must still call
// requireStaff() / requireAdmin() itself — layouts don't guard their children.
export default async function StaffAppLayout({ children }: LayoutProps<"/admin">) {
  const { profile, email } = await requireStaff();
  const isAdmin = profile.role === "admin";
  const access = { isAdmin, permissions: profile.permissions };
  // New Vehicle Finder requests, for the nav badge (only for those who can open them).
  let newRequests = 0;
  if (hasPermission(profile, "requests")) {
    const { count } = await (
      await createClient()
    )
      .from("vehicle_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "new");
    newRequests = count ?? 0;
  }
  const badges = { "/admin/requests": newRequests };

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <TopBar name={profile.full_name || email || "Staff"} />
      <div className="flex flex-1">
        <Sidebar access={access} badges={badges} />
        <main className="min-w-0 flex-1 px-4 pt-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:p-6">
          {children}
        </main>
      </div>
      <BottomTabs access={access} badges={badges} />
      <IdleWatcher />
    </div>
  );
}
