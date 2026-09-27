import { MessageSquare, Phone } from "lucide-react";

import { ShareButton } from "@/components/public/share-button";
import { Button } from "@/components/ui/button";
import { phoneHref, smsHref } from "@/lib/format";
import { cn } from "@/lib/utils";

export type VehicleActionsProps = {
  phone: string | null;
  smsPhone: string | null;
  smsBody: string;
  share: { title: string; text: string; path: string };
  sold: boolean;
};

/** Call / Text / Share. Sold cars only get Share. */
function ActionButtons({
  phone,
  smsPhone,
  smsBody,
  share,
  sold,
  stacked,
}: VehicleActionsProps & { stacked?: boolean }) {
  const sms = smsPhone || phone;
  const size = cn("h-12 text-base font-semibold", stacked ? "w-full" : "flex-1 px-2");
  return (
    <>
      {!sold && phone && (
        <Button asChild size="lg" className={size}>
          <a href={`tel:${phoneHref(phone)}`}>
            <Phone aria-hidden /> Call
          </a>
        </Button>
      )}
      {!sold && sms && (
        <Button asChild size="lg" variant="secondary" className={size}>
          <a href={smsHref(sms, smsBody)}>
            <MessageSquare aria-hidden /> Text
          </a>
        </Button>
      )}
      <ShareButton {...share} size="lg" variant="outline" className={size} />
    </>
  );
}

/** Sticky bar pinned to the bottom of the screen on phones. */
export function MobileActionBar(props: VehicleActionsProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur md:hidden">
      <div role="group" aria-label="Contact about this vehicle" className="flex gap-2">
        <ActionButtons {...props} />
      </div>
    </div>
  );
}

/** Stacked buttons for the desktop sidebar card. */
export function DesktopActions(props: VehicleActionsProps) {
  return (
    <div
      role="group"
      aria-label="Contact about this vehicle"
      className="hidden flex-col gap-2 md:flex"
    >
      <ActionButtons {...props} stacked />
    </div>
  );
}
