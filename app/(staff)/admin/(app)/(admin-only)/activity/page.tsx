import { TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { requireAdmin } from "@/lib/auth";
import { AUDIT_ACTIONS, type AuditAction } from "@/lib/security/audit";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Activity" };

const PAGE_SIZE = 50;
const first = (v: unknown) => (Array.isArray(v) ? v[0] : v);
const date = z.preprocess(first, z.iso.date().optional()).catch(undefined);
const filtersSchema = z.object({
  user: z.preprocess(first, z.uuid().optional()).catch(undefined),
  action: z
    .preprocess(
      first,
      z.enum(Object.keys(AUDIT_ACTIONS) as [AuditAction, ...AuditAction[]]).optional(),
    )
    .catch(undefined),
  from: date,
  to: date,
  alerts: z.preprocess(first, z.literal("1").optional()).catch(undefined),
  page: z.preprocess(first, z.coerce.number().int().min(1).max(1000)).catch(1),
});

const TIME = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/New_York",
});

/** "-04:00" or "-05:00" for a date in America/New_York (daylight saving aware). */
function easternOffset(day: string) {
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    timeZoneName: "shortOffset",
  })
    .formatToParts(new Date(`${day}T12:00:00Z`))
    .find((p) => p.type === "timeZoneName")?.value; // "GMT-4"
  const hours = Number(name?.replace("GMT", "") || -5);
  return `-${String(Math.abs(hours)).padStart(2, "0")}:00`;
}

/** Admin only: the insert-only audit log, newest first. */
export default async function ActivityPage({ searchParams }: PageProps<"/admin/activity">) {
  await requireAdmin();
  const f = filtersSchema.parse(await searchParams);
  const supabase = await createClient();

  let query = supabase
    .from("audit_log")
    .select(
      "id, user_id, action, target_type, target_id, details, ip, user_agent, alert, created_at",
      {
        count: "exact",
      },
    )
    .order("created_at", { ascending: false });
  if (f.user) query = query.eq("user_id", f.user);
  if (f.action) query = query.eq("action", f.action);
  if (f.alerts) query = query.eq("alert", true);
  // Dates are in the dealership's time zone (Eastern).
  if (f.from) query = query.gte("created_at", `${f.from}T00:00:00${easternOffset(f.from)}`);
  if (f.to) query = query.lte("created_at", `${f.to}T23:59:59${easternOffset(f.to)}`);
  const offset = (f.page - 1) * PAGE_SIZE;

  const [{ data: rows, count, error }, { data: profiles }] = await Promise.all([
    query.range(offset, offset + PAGE_SIZE - 1),
    supabase.from("profiles").select("id, full_name").order("full_name"),
  ]);
  if (error && error.code !== "PGRST103") throw error;
  const names = new Map((profiles ?? []).map((p) => [p.id, p.full_name || "Unnamed"]));
  const total = count ?? 0;
  const pageHref = (page: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...f, page }))
      if (v && !(k === "page" && v === 1)) params.set(k, String(v));
    return `/admin/activity?${params}`;
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-28">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Activity</h1>
        <p className="text-sm text-muted-foreground">
          Sign-ins, account changes and edits. Entries can&apos;t be changed or deleted.
        </p>
      </div>

      <form
        method="get"
        className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-6"
      >
        <label className="space-y-1 text-sm font-medium lg:col-span-2">
          User
          <NativeSelect name="user" defaultValue={f.user ?? ""}>
            <option value="">Everyone</option>
            {(profiles ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name || "Unnamed"}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="space-y-1 text-sm font-medium lg:col-span-2">
          Action
          <NativeSelect name="action" defaultValue={f.action ?? ""}>
            <option value="">All actions</option>
            {Object.entries(AUDIT_ACTIONS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="space-y-1 text-sm font-medium">
          From
          <input
            type="date"
            name="from"
            defaultValue={f.from}
            className="block h-10 w-full rounded-md border px-2"
          />
        </label>
        <label className="space-y-1 text-sm font-medium">
          To
          <input
            type="date"
            name="to"
            defaultValue={f.to}
            className="block h-10 w-full rounded-md border px-2"
          />
        </label>
        <label className="flex items-center gap-2 text-sm font-medium sm:col-span-1 lg:col-span-2">
          <input
            type="checkbox"
            name="alerts"
            value="1"
            defaultChecked={!!f.alerts}
            className="size-4"
          />
          Alerts only (new device, roles, new users, lockouts)
        </label>
        <div className="flex gap-2 lg:col-span-4 lg:justify-end">
          <Button type="submit" className="h-10">
            Filter
          </Button>
          <Button asChild variant="ghost" className="h-10">
            <Link href="/admin/activity">Clear</Link>
          </Button>
        </div>
      </form>

      <p className="text-sm text-muted-foreground">
        {total} {total === 1 ? "entry" : "entries"}
      </p>

      {rows && rows.length > 0 ? (
        <ul className="divide-y rounded-xl border bg-card" data-testid="activity-list">
          {rows.map((row) => (
            <li key={row.id} className={cn("space-y-1 p-3 text-sm", row.alert && "bg-amber-50")}>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {row.alert && (
                  <TriangleAlert className="size-4 text-amber-600" aria-label="Alert" />
                )}
                <span className="font-semibold">
                  {AUDIT_ACTIONS[row.action as AuditAction] ?? row.action}
                </span>
                <span className="text-muted-foreground">
                  by {row.user_id ? (names.get(row.user_id) ?? "Deleted user") : "—"}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {TIME.format(new Date(row.created_at))}
                </span>
              </div>
              <Details row={row} names={names} />
              <p className="truncate text-xs text-muted-foreground" title={row.user_agent ?? ""}>
                {row.ip} · {row.user_agent}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          Nothing matches these filters.
        </p>
      )}

      {total > PAGE_SIZE && (
        <div className="flex justify-between">
          {f.page > 1 ? (
            <Button asChild variant="outline" className="h-10">
              <Link href={pageHref(f.page - 1)}>Newer</Link>
            </Button>
          ) : (
            <span />
          )}
          {offset + PAGE_SIZE < total && (
            <Button asChild variant="outline" className="h-10">
              <Link href={pageHref(f.page + 1)}>Older</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/** Details as "key: value" text (React escapes everything). */
function Details({
  row,
  names,
}: {
  row: { target_type: string | null; target_id: string | null; details: unknown };
  names: Map<string, string>;
}) {
  const details = (row.details ?? {}) as Record<string, unknown>;
  const parts = Object.entries(details)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${k.replace(/_/g, " ")}: ${Array.isArray(v) ? v.join(", ") : String(v)}`);
  const target =
    row.target_type === "user" && row.target_id
      ? `user: ${names.get(row.target_id) ?? row.target_id}`
      : row.target_type && row.target_id
        ? `${row.target_type}: ${row.target_id}`
        : null;
  const text = [target, ...parts].filter(Boolean).join(" · ");
  return text ? <p className="break-words text-muted-foreground">{text}</p> : null;
}
