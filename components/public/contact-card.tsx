import { Clock, Mail, MapPin, MessageSquare, Phone } from "lucide-react";

import { HoursList } from "@/components/public/hours-list";
import { Button } from "@/components/ui/button";
import { phoneHref, smsHref } from "@/lib/format";
import { fullAddress, mapUrl, type SiteSettings } from "@/lib/public-data";

/** Call / Text / address / hours / directions, used on About and Contact. */
export function ContactCard({ settings: s }: { settings: SiteSettings }) {
  const address = fullAddress(s);
  const map = mapUrl(s);
  const sms = s.sms_phone || s.phone;

  return (
    <div className="space-y-6 rounded-xl border bg-card p-6 shadow-sm">
      {(s.phone || sms) && (
        <div className="grid gap-2 sm:grid-cols-2">
          {s.phone && (
            <Button asChild size="lg" className="h-12 text-base font-semibold">
              <a href={`tel:${phoneHref(s.phone)}`}>
                <Phone aria-hidden /> Call {s.phone}
              </a>
            </Button>
          )}
          {sms && (
            <Button asChild size="lg" variant="secondary" className="h-12 text-base font-semibold">
              <a href={smsHref(sms)}>
                <MessageSquare aria-hidden /> Text us
              </a>
            </Button>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <MapPin className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <div className="space-y-1">
          <p className="font-semibold">Location</p>
          <p className="text-muted-foreground">{address || "Call us for directions."}</p>
          {map && (
            <a
              href={map}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block font-semibold text-primary underline-offset-4 hover:underline"
            >
              Open in Google Maps
            </a>
          )}
        </div>
      </div>

      {s.email && (
        <div className="flex gap-3">
          <Mail className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <div className="space-y-1">
            <p className="font-semibold">Email</p>
            <a
              href={`mailto:${s.email}`}
              className="break-all text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {s.email}
            </a>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Clock className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <div className="flex-1 space-y-1">
          <p className="font-semibold">Hours</p>
          <HoursList hours={s.hours} className="text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}
