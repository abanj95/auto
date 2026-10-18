"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { setUserPermissions } from "@/app/(staff)/admin/(app)/(admin-only)/users/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { PERMISSION_KEYS, PERMISSIONS, type Permission } from "@/lib/permissions";

/** Switches for the extra areas a poster may manage. */
export function AccessDialog({
  user,
  open,
  onOpenChange,
}: {
  user: { id: string; name: string; permissions: string[] };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Permission[]>(
    PERMISSION_KEYS.filter((k) => user.permissions.includes(k)),
  );
  const [saving, startSaving] = useTransition();

  function toggle(key: Permission, on: boolean) {
    setSelected((list) => (on ? [...list, key] : list.filter((k) => k !== key)));
  }

  function save() {
    startSaving(async () => {
      const result = await setUserPermissions(user.id, selected);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${user.name}'s access is updated.`);
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Access for {user.name}</DialogTitle>
          <DialogDescription>
            Posters can always post, edit, mark sold and delete vehicles. Turn on anything extra
            they should manage. Users, the activity log and Featured stay admin-only.
          </DialogDescription>
        </DialogHeader>
        <ul className="divide-y rounded-lg border">
          {PERMISSION_KEYS.map((key) => (
            <li key={key}>
              <label className="flex min-h-16 cursor-pointer items-center gap-4 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{PERMISSIONS[key].label}</span>
                  <span className="block text-sm text-muted-foreground">
                    {PERMISSIONS[key].description}
                  </span>
                </span>
                <Switch
                  checked={selected.includes(key)}
                  onCheckedChange={(on) => toggle(key, on)}
                  aria-label={PERMISSIONS[key].label}
                />
              </label>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button variant="outline" className="h-11" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="h-11" onClick={save} disabled={saving}>
            {saving && <Loader2 className="animate-spin" aria-hidden />}
            Save access
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
