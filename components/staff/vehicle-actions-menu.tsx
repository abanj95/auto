"use client";

import {
  CircleCheck,
  Clock,
  ExternalLink,
  EllipsisVertical,
  Pencil,
  Tag,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { deleteVehicle, setVehicleStatus } from "@/app/(staff)/admin/(app)/vehicles/actions";
import { ConfirmDialog } from "@/components/staff/confirm-dialog";
import { STATUS_LABELS } from "@/components/staff/vehicle-status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Enums } from "@/lib/database.types";

type Props = {
  vehicle: { id: string; slug: string; status: Enums<"vehicle_status">; label: string };
  isAdmin: boolean;
  /** Hide "Edit" when already on the edit page. */
  showEdit?: boolean;
  /** Called after a status change (the edit form keeps its own copy of the status). */
  onStatusChange?: (status: Enums<"vehicle_status">) => void;
  /** Where to go after deleting (default: stay and refresh). */
  afterDelete?: string;
};

const STATUS_ACTIONS: { status: Enums<"vehicle_status">; label: string; icon: typeof Tag }[] = [
  { status: "available", label: "Mark available", icon: CircleCheck },
  { status: "pending", label: "Mark pending", icon: Clock },
  { status: "sold", label: "Mark sold", icon: Tag },
];

/** ⋯ menu: Edit, status changes, View on site, Delete (admin only). */
export function VehicleActionsMenu({
  vehicle,
  isAdmin,
  showEdit = true,
  onStatusChange,
  afterDelete,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  function changeStatus(status: Enums<"vehicle_status">) {
    startTransition(async () => {
      const result = await setVehicleStatus(vehicle.id, status);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${vehicle.label} marked ${STATUS_LABELS[status].toLowerCase()}.`);
      onStatusChange?.(status);
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteVehicle(vehicle.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${vehicle.label} deleted.`);
      if (afterDelete) router.replace(afterDelete);
      else router.refresh();
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-11 shrink-0"
            disabled={pending}
            aria-label={`Actions for ${vehicle.label}`}
          >
            <EllipsisVertical className="size-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {showEdit && (
            <DropdownMenuItem asChild className="h-11">
              <Link href={`/admin/vehicles/${vehicle.id}`}>
                <Pencil aria-hidden /> Edit
              </Link>
            </DropdownMenuItem>
          )}
          {STATUS_ACTIONS.filter((a) => a.status !== vehicle.status).map(
            ({ status, label, icon: Icon }) => (
              <DropdownMenuItem key={status} className="h-11" onSelect={() => changeStatus(status)}>
                <Icon aria-hidden /> {label}
              </DropdownMenuItem>
            ),
          )}
          {vehicle.status !== "draft" && (
            <DropdownMenuItem asChild className="h-11">
              <a href={`/inventory/${vehicle.slug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink aria-hidden /> View on site
              </a>
            </DropdownMenuItem>
          )}
          {isAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                className="h-11"
                onSelect={() => setConfirmDelete(true)}
              >
                <Trash2 aria-hidden /> Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {isAdmin && (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title={`Delete ${vehicle.label}?`}
          description="This removes the listing and all of its photos. It can't be undone."
          confirmLabel="Delete vehicle"
          onConfirm={remove}
        />
      )}
    </>
  );
}
