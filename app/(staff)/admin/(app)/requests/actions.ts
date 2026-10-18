"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/security/audit";
import { createClient } from "@/lib/supabase/server";
import {
  adminNotesSchema,
  requestStatusSchema,
  type RequestStatus,
} from "@/lib/validation/vehicle-request";

export type RequestActionResult = { ok: true } | { ok: false; error: string };

const uuid = z.uuid();

/** Admins and posters with Requests access: change status and/or notes. Status changes go to the activity log. */
export async function updateVehicleRequest(
  id: string,
  values: { status: RequestStatus; admin_notes: string },
): Promise<RequestActionResult> {
  const { userId } = await requirePermission("requests");
  const parsedId = uuid.safeParse(id);
  const status = requestStatusSchema.safeParse(values.status);
  const notes = adminNotesSchema.safeParse(values.admin_notes);
  if (!parsedId.success || !status.success) return { ok: false, error: "Request not found." };
  if (!notes.success) return { ok: false, error: notes.error.issues[0].message };

  const supabase = await createClient();
  const { data: before } = await supabase
    .from("vehicle_requests")
    .select("status")
    .eq("id", parsedId.data)
    .maybeSingle();
  if (!before) return { ok: false, error: "Request not found." };

  const { error } = await supabase
    .from("vehicle_requests")
    .update({ status: status.data, admin_notes: notes.data })
    .eq("id", parsedId.data);
  if (error) {
    console.error("updateVehicleRequest failed", error.code);
    return { ok: false, error: "Couldn't save. Please try again." };
  }
  if (before.status !== status.data) {
    await audit({
      action: "request_status_changed",
      userId,
      targetType: "vehicle_request",
      targetId: parsedId.data,
      details: { from: before.status, to: status.data },
    });
  }
  revalidatePath("/admin", "layout"); // Nav badge.
  return { ok: true };
}

/** Admins and posters with Requests access: permanently delete a request. */
export async function deleteVehicleRequest(id: string): Promise<RequestActionResult> {
  const { userId } = await requirePermission("requests");
  const parsedId = uuid.safeParse(id);
  if (!parsedId.success) return { ok: false, error: "Request not found." };

  const { data, error } = await (
    await createClient()
  )
    .from("vehicle_requests")
    .delete()
    .eq("id", parsedId.data)
    .select("id");
  if (error || !data?.length) {
    if (error) console.error("deleteVehicleRequest failed", error.code);
    return { ok: false, error: "Couldn't delete the request." };
  }
  await audit({
    action: "request_deleted",
    userId,
    targetType: "vehicle_request",
    targetId: parsedId.data,
  });
  revalidatePath("/admin", "layout");
  return { ok: true };
}
