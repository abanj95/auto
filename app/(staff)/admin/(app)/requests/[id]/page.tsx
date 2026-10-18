import { ArrowLeft, Mail, MessageSquare, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { RequestEditor } from "@/components/staff/requests/request-editor";
import { RequestStatusBadge } from "@/components/staff/requests/request-status-badge";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth";
import { BODY_TYPE_LABELS, formatMileage, formatPrice, phoneHref, smsHref } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { BEST_TIMES, CONTACT_METHODS, requestTitle } from "@/lib/validation/vehicle-request";

export const metadata: Metadata = { title: "Request" };

export default async function RequestPage({ params }: PageProps<"/admin/requests/[id]">) {
  await requirePermission("requests");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const { data: r } = await (
    await createClient()
  )
    .from("vehicle_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!r) notFound();

  const money = (n: number | null) => (n === null ? "any" : formatPrice(n));
  const details: [string, string | null][] = [
    ["Years", r.year_from || r.year_to ? `${r.year_from ?? "any"} – ${r.year_to ?? "any"}` : null],
    ["Make", r.make],
    ["Model", r.model],
    ["Engine", r.engine],
    ["Max mileage", r.max_mileage ? formatMileage(r.max_mileage) : "Any"],
    [
      "Budget",
      r.budget_min !== null || r.budget_max !== null
        ? `${money(r.budget_min)} – ${money(r.budget_max)}`
        : null,
    ],
    ["Body type", r.body_type && BODY_TYPE_LABELS[r.body_type]],
  ];
  const contact: [string, string | null][] = [
    ["Phone", r.phone],
    ["Second phone", r.phone2],
    ["Email", r.email],
    ["Best time", r.best_time && BEST_TIMES[r.best_time as keyof typeof BEST_TIMES]],
    [
      "Prefers",
      r.preferred_contact && CONTACT_METHODS[r.preferred_contact as keyof typeof CONTACT_METHODS],
    ],
  ];
  const received = new Date(r.created_at).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/New_York",
  });

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        href="/admin/requests"
        className="inline-flex h-10 items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden /> All requests
      </Link>

      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">
            {r.first_name} {r.last_name}
          </h1>
          <RequestStatusBadge status={r.status} />
        </div>
        <p className="text-muted-foreground">
          Wants: <span className="font-medium text-foreground">{requestTitle(r)}</span> · Received{" "}
          {received}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Button asChild size="lg" className="h-12">
          <a href={`tel:${phoneHref(r.phone)}`}>
            <Phone aria-hidden /> Call
          </a>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-12">
          <a href={smsHref(r.phone)}>
            <MessageSquare aria-hidden /> Text
          </a>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-12">
          <a href={`mailto:${r.email}`}>
            <Mail aria-hidden /> Email
          </a>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Contact" rows={contact} />
        <Panel title="Vehicle wanted" rows={details} />
      </div>

      {r.notes && (
        <section className="rounded-xl border bg-card p-4">
          <h2 className="mb-2 font-semibold">Features and colors</h2>
          <p className="text-sm whitespace-pre-line">{r.notes}</p>
        </section>
      )}

      <RequestEditor id={r.id} status={r.status} adminNotes={r.admin_notes ?? ""} />
    </div>
  );
}

function Panel({ title, rows }: { title: string; rows: [string, string | null][] }) {
  return (
    <section className="rounded-xl border bg-card p-4">
      <h2 className="mb-2 font-semibold">{title}</h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        {rows
          .filter((row): row is [string, string] => !!row[1])
          .map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="min-w-0 break-words">{v}</dd>
            </div>
          ))}
      </dl>
    </section>
  );
}
