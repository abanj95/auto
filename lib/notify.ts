import "server-only";

import { siteUrl } from "@/lib/auth-paths";
import { BODY_TYPE_LABELS, formatMileage, formatPrice } from "@/lib/format";
import {
  BEST_TIMES,
  CONTACT_METHODS,
  type VehicleRequestInput,
} from "@/lib/validation/vehicle-request";

// Email to the dealership for each new Vehicle Finder request, via Resend's
// HTTP API (no SDK). Off when RESEND_API_KEY or NOTIFY_EMAIL is unset. Never
// throws: the request is already saved and shows up in /admin/requests.

const RESEND_URL = "https://api.resend.com/emails";
const DEFAULT_FROM = "Vehicle Finder <onboarding@resend.dev>"; // Resend's test sender.

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export async function notifyNewRequest(id: string, r: VehicleRequestInput, dealershipName: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL;
  if (!apiKey || !to) return;

  const link = `${siteUrl()}/admin/requests/${id}`;
  const years = r.year_from || r.year_to ? `${r.year_from ?? "any"} – ${r.year_to ?? "any"}` : null;
  const budget =
    r.budget_min !== null || r.budget_max !== null
      ? `${r.budget_min !== null ? formatPrice(r.budget_min) : "any"} – ${r.budget_max !== null ? formatPrice(r.budget_max) : "any"}`
      : null;
  const wanted = [r.make, r.model].filter(Boolean).join(" ") || "a vehicle";

  const rows: [string, string | null][] = [
    ["Name", `${r.first_name} ${r.last_name}`],
    ["Phone", r.phone],
    ["Second phone", r.phone2],
    ["Email", r.email],
    ["Best time to call", r.best_time && BEST_TIMES[r.best_time]],
    ["Preferred contact", r.preferred_contact && CONTACT_METHODS[r.preferred_contact]],
    ["Years", years],
    ["Make", r.make],
    ["Model", r.model],
    ["Engine", r.engine],
    ["Max mileage", r.max_mileage ? formatMileage(r.max_mileage) : "Any"],
    ["Budget", budget],
    ["Body type", r.body_type && BODY_TYPE_LABELS[r.body_type]],
    ["Features / colors", r.notes],
  ];
  const filled = rows.filter((row): row is [string, string] => !!row[1]);

  const text = [
    `New Vehicle Finder request: ${wanted}`,
    "",
    ...filled.map(([k, v]) => `${k}: ${v}`),
    "",
    `Open it: ${link}`,
  ].join("\n");
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;color:#171717">
<h2 style="margin:0 0 12px">New Vehicle Finder request</h2>
<table cellpadding="6" style="border-collapse:collapse">${filled
    .map(
      ([k, v]) =>
        `<tr><td style="color:#525252;vertical-align:top;white-space:nowrap">${escapeHtml(k)}</td><td style="white-space:pre-wrap">${escapeHtml(v)}</td></tr>`,
    )
    .join("")}</table>
<p style="margin-top:20px"><a href="${escapeHtml(link)}" style="background:#b91c1c;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:600">Open in admin</a></p>
</div>`;

  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.NOTIFY_FROM || DEFAULT_FROM,
        to: [to],
        reply_to: r.email,
        subject: `${dealershipName}: Vehicle Finder request for ${wanted}`.slice(0, 200),
        text,
        html,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error("resend failed", res.status, (await res.text()).slice(0, 300));
  } catch (error) {
    console.error("resend failed", error instanceof Error ? error.message : error);
  }
}
