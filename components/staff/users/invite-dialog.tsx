"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Link2, Mail, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { inviteStaff } from "@/app/(staff)/admin/(app)/(admin-only)/users/actions";
import { ShareLinkDialog } from "@/components/staff/users/share-link-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inviteSchema, type InviteInput } from "@/lib/validation/users";

/** "Invite poster": name + email, then send an email or create a link to text. */
export function InviteDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState<{ url: string; name: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<InviteInput>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { name: "", email: "" },
  });
  const { errors } = form.formState;

  function submit(mode: "email" | "link") {
    return form.handleSubmit((values) =>
      startTransition(async () => {
        const result = await inviteStaff(values, mode);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        setOpen(false);
        form.reset();
        router.refresh();
        if (result.data.link) setLink({ url: result.data.link, name: values.name });
        else toast.success(`Invite sent to ${values.email}.`);
      }),
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="h-11">
            <UserPlus aria-hidden /> Invite poster
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite a poster</DialogTitle>
            <DialogDescription>
              They&apos;ll set their own password. Posters can add, edit, sell and delete vehicles.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            noValidate
            onSubmit={(e) => e.preventDefault()}
            suppressHydrationWarning // Chrome on iOS adds autofill attributes.
          >
            <div className="space-y-1.5">
              <Label htmlFor="invite-name">Name</Label>
              <Input
                id="invite-name"
                {...form.register("name")}
                autoComplete="off"
                className="h-12 text-base"
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                inputMode="email"
                autoCapitalize="none"
                autoComplete="off"
                {...form.register("email")}
                className="h-12 text-base"
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="button" className="h-11" disabled={pending} onClick={submit("email")}>
                <Mail aria-hidden /> Send invite email
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11"
                disabled={pending}
                onClick={submit("link")}
              >
                <Link2 aria-hidden /> Copy invite link
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ShareLinkDialog
        link={link?.url ?? null}
        title={`Invite link for ${link?.name ?? ""}`}
        description="Text this link to them. It opens a page where they set their password."
        onClose={() => setLink(null)}
      />
    </>
  );
}
