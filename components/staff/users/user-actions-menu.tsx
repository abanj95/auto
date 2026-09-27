"use client";

import {
  EllipsisVertical,
  KeyRound,
  Link2,
  ShieldCheck,
  ShieldOff,
  UserCheck,
  UserX,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  sendPasswordReset,
  setUserActive,
  setUserRole,
} from "@/app/(staff)/admin/(app)/(admin-only)/users/actions";
import { ConfirmDialog } from "@/components/staff/confirm-dialog";
import { ShareLinkDialog } from "@/components/staff/users/share-link-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Enums } from "@/lib/database.types";

type StaffUser = {
  id: string;
  name: string;
  email: string;
  role: Enums<"user_role">;
  active: boolean;
  invited: boolean;
};

type Confirm = { title: string; description: string; label: string; run: () => void };

export function UserActionsMenu({ user, isSelf }: { user: StaffUser; isSelf: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [link, setLink] = useState<string | null>(null);

  function run(
    action: () => Promise<{ ok: true; data: unknown } | { ok: false; error: string }>,
    success: string,
  ) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) toast.error(result.error);
      else {
        toast.success(success);
        router.refresh();
      }
    });
  }

  function resetLink() {
    startTransition(async () => {
      const result = await sendPasswordReset(user.id, "link");
      if (!result.ok) toast.error(result.error);
      else setLink(result.data.link);
    });
  }

  const other = user.role === "admin" ? "poster" : "admin";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-11 shrink-0"
            disabled={pending}
            aria-label={`Actions for ${user.name}`}
          >
            <EllipsisVertical className="size-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          {!user.invited && (
            <DropdownMenuItem
              className="h-11"
              onSelect={() =>
                run(
                  () => sendPasswordReset(user.id, "email"),
                  `Password reset email sent to ${user.email}.`,
                )
              }
            >
              <KeyRound aria-hidden /> Send password reset
            </DropdownMenuItem>
          )}
          <DropdownMenuItem className="h-11" onSelect={resetLink}>
            <Link2 aria-hidden /> {user.invited ? "Copy invite link" : "Copy password reset link"}
          </DropdownMenuItem>

          {!isSelf && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="h-11"
                onSelect={() =>
                  setConfirm({
                    title:
                      other === "admin"
                        ? `Make ${user.name} an admin?`
                        : `Make ${user.name} a poster?`,
                    description:
                      other === "admin"
                        ? "Admins can also change site settings and manage users."
                        : "They'll lose access to Settings and Users.",
                    label: other === "admin" ? "Make admin" : "Make poster",
                    run: () =>
                      run(
                        () => setUserRole(user.id, other),
                        `${user.name} is now ${other === "admin" ? "an admin" : "a poster"}.`,
                      ),
                  })
                }
              >
                {other === "admin" ? <ShieldCheck aria-hidden /> : <ShieldOff aria-hidden />}
                {other === "admin" ? "Make admin" : "Make poster"}
              </DropdownMenuItem>
              {user.active ? (
                <DropdownMenuItem
                  variant="destructive"
                  className="h-11"
                  onSelect={() =>
                    setConfirm({
                      title: `Deactivate ${user.name}?`,
                      description:
                        "They'll be signed out and can't sign in until you reactivate them. Their listings stay.",
                      label: "Deactivate",
                      run: () =>
                        run(() => setUserActive(user.id, false), `${user.name} was deactivated.`),
                    })
                  }
                >
                  <UserX aria-hidden /> Deactivate
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  className="h-11"
                  onSelect={() =>
                    run(() => setUserActive(user.id, true), `${user.name} was reactivated.`)
                  }
                >
                  <UserCheck aria-hidden /> Reactivate
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm?.title ?? ""}
        description={confirm?.description ?? ""}
        confirmLabel={confirm?.label ?? ""}
        onConfirm={() => {
          confirm?.run();
          setConfirm(null);
        }}
      />
      <ShareLinkDialog
        link={link}
        title={
          user.invited ? `Invite link for ${user.name}` : `Password reset link for ${user.name}`
        }
        description={
          user.invited
            ? "Text this link to them. It opens a page where they set their password."
            : "Text this link to them. It opens a page where they choose a new password."
        }
        onClose={() => setLink(null)}
      />
    </>
  );
}
