import type { Metadata } from "next";

import { InviteDialog } from "@/components/staff/users/invite-dialog";
import { UserActionsMenu } from "@/components/staff/users/user-actions-menu";
import { requireAdmin } from "@/lib/auth";
import { lastSeen } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage() {
  const { userId: me } = await requireAdmin();

  // Auth users (email, sign-in times) need the admin API; profiles come through RLS.
  const [{ data: authData, error: authError }, { data: profiles, error }] = await Promise.all([
    createAdminClient().auth.admin.listUsers({ perPage: 1000 }),
    (await createClient()).from("profiles").select("id, full_name, role, active, created_at"),
  ]);
  if (authError) throw authError;
  if (error) throw error;

  const byId = new Map(authData.users.map((u) => [u.id, u]));
  const staff = profiles
    .map((p) => {
      const u = byId.get(p.id);
      return {
        id: p.id,
        name: p.full_name || u?.email || "Unnamed",
        email: u?.email ?? "",
        role: p.role,
        active: p.active,
        invited: !!u && !u.email_confirmed_at,
        lastSignIn: u?.last_sign_in_at ?? null,
      };
    })
    // Admins first, then by name; deactivated last.
    .sort(
      (a, b) =>
        Number(b.active) - Number(a.active) ||
        (a.role === b.role ? 0 : a.role === "admin" ? -1 : 1) ||
        a.name.localeCompare(b.name),
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">{staff.length} staff accounts</p>
        </div>
        <InviteDialog />
      </div>

      <ul className="divide-y rounded-xl border bg-card">
        {staff.map((u) => (
          <li key={u.id} className={cn("flex items-center gap-3 p-4", !u.active && "opacity-60")}>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate font-semibold">
                {u.name}
                {u.id === me && (
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>
                )}
              </p>
              <p className="truncate text-sm text-muted-foreground">{u.email}</p>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <Pill
                  className={
                    u.role === "admin" ? "bg-primary/10 text-primary" : "bg-muted text-foreground"
                  }
                >
                  {u.role === "admin" ? "Admin" : "Poster"}
                </Pill>
                {u.invited ? (
                  <Pill className="bg-sky-50 text-sky-800">Invited</Pill>
                ) : !u.active ? (
                  <Pill className="bg-red-50 text-red-800">Deactivated</Pill>
                ) : (
                  <Pill className="bg-emerald-50 text-emerald-800">Active</Pill>
                )}
                <span className="text-muted-foreground">
                  · {u.invited ? "Hasn't accepted yet" : `Last sign-in ${lastSeen(u.lastSignIn)}`}
                </span>
              </div>
            </div>
            <UserActionsMenu user={u} isSelf={u.id === me} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Pill({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={cn("rounded-full px-2 py-0.5 font-semibold", className)}>{children}</span>
  );
}
