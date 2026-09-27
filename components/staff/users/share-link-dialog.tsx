"use client";

import { Copy, Share2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

/**
 * Shows a one-time sign-in link with Copy / Share buttons. Copying needs its
 * own tap (iOS blocks clipboard writes that happen after a server round-trip).
 */
export function ShareLinkDialog({
  link,
  title,
  description,
  onClose,
}: {
  link: string | null;
  title: string;
  description: string;
  onClose: () => void;
}) {
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copied. Paste it into a text message.");
    } catch {
      toast.error("Couldn't copy — press and hold the link to copy it.");
    }
  }

  return (
    <Dialog open={link !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Input
          readOnly
          value={link ?? ""}
          onFocus={(e) => e.currentTarget.select()}
          aria-label="Sign-in link"
          className="h-11 font-mono text-xs"
        />
        <p className="text-xs text-muted-foreground">
          Works once. It expires after a short time (1 hour by default), so send it right away.
        </p>
        <DialogFooter className="gap-2 sm:gap-2">
          {canShare && (
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => link && navigator.share({ text: link }).catch(() => {})}
            >
              <Share2 aria-hidden /> Share
            </Button>
          )}
          <Button type="button" className="h-11" onClick={copy}>
            <Copy aria-hidden /> Copy link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
