"use client";

import { Link2, Mail, Share2 } from "lucide-react";
import { useSyncExternalStore } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  title: string;
  text: string;
  /** Path of the page to share, e.g. /inventory/2019-toyota-camry-se-mc-0001 */
  path: string;
} & Pick<React.ComponentProps<typeof Button>, "className" | "variant" | "size">;

const noop = () => () => {};

/** Native share sheet when available; otherwise a menu of share options. */
export function ShareButton({ title, text, path, className, variant = "outline", size }: Props) {
  const canNativeShare = useSyncExternalStore(
    noop,
    () => typeof navigator.share === "function",
    () => false,
  );
  const url = () => `${window.location.origin}${path}`;
  const label = (
    <>
      <Share2 aria-hidden /> Share
    </>
  );

  if (canNativeShare) {
    return (
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => navigator.share({ title, text, url: url() }).catch(() => {})}
      >
        {label}
      </Button>
    );
  }

  const open = (href: string) => window.open(href, "_blank", "noopener,noreferrer");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant={variant} size={size} className={className}>
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onSelect={async () => {
            if (await copyText(url())) toast.success("Link copied");
            else toast.error("Couldn't copy the link");
          }}
        >
          <Link2 aria-hidden /> Copy link
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url())}`)
          }
        >
          <span aria-hidden className="w-4 text-center font-bold">
            f
          </span>{" "}
          Facebook
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url()}`)}`)}
        >
          <span aria-hidden className="w-4 text-center font-bold">
            W
          </span>{" "}
          WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            // Built on click: window isn't available while server rendering.
            window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${text}\n\n${url()}`)}`;
          }}
        >
          <Mail aria-hidden /> Email
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    // Clipboard API is unavailable on plain http (e.g. testing over the LAN).
    const el = document.createElement("textarea");
    el.value = value;
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    el.remove();
    return ok;
  }
}
