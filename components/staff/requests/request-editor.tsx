"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  deleteVehicleRequest,
  updateVehicleRequest,
} from "@/app/(staff)/admin/(app)/requests/actions";
import { ConfirmDialog } from "@/components/staff/confirm-dialog";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import {
  REQUEST_STATUS_LABELS,
  REQUEST_STATUSES,
  type RequestStatus,
} from "@/lib/validation/vehicle-request";

/** Status + notes for one request, and delete. */
export function RequestEditor({
  id,
  status: initialStatus,
  adminNotes,
}: {
  id: string;
  status: RequestStatus;
  adminNotes: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [notes, setNotes] = useState(adminNotes);
  const [saving, startSaving] = useTransition();
  const [deleting, startDeleting] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dirty = status !== initialStatus || notes !== adminNotes;

  function save() {
    startSaving(async () => {
      const result = await updateVehicleRequest(id, { status, admin_notes: notes });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Saved.");
      router.refresh();
    });
  }

  function remove() {
    startDeleting(async () => {
      const result = await deleteVehicleRequest(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Request deleted.");
      router.push("/admin/requests");
    });
  }

  return (
    <section className="space-y-4 rounded-xl border bg-card p-4">
      <div className="space-y-1.5">
        <label htmlFor="request-status" className="text-sm font-semibold">
          Status
        </label>
        <NativeSelect
          id="request-status"
          value={status}
          onChange={(e) => setStatus(e.target.value as RequestStatus)}
        >
          {REQUEST_STATUSES.map((s) => (
            <option key={s} value={s}>
              {REQUEST_STATUS_LABELS[s]}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="request-notes" className="text-sm font-semibold">
          Notes (staff only)
        </label>
        <Textarea
          id="request-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          maxLength={4000}
          placeholder="Called Tuesday, left a voicemail…"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={save} disabled={!dirty || saving} className="h-11 px-6">
          {saving && <Loader2 className="animate-spin" aria-hidden />}
          Save
        </Button>
        <Button
          variant="ghost"
          onClick={() => setConfirmDelete(true)}
          disabled={deleting}
          className="ml-auto h-11 text-destructive hover:text-destructive"
        >
          <Trash2 aria-hidden /> Delete
        </Button>
      </div>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this request?"
        description="It will be removed permanently."
        confirmLabel="Delete"
        onConfirm={remove}
      />
    </section>
  );
}
