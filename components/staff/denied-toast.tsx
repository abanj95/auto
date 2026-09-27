"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

/** Shows the "no access" toast once, then removes ?denied=1 from the URL. */
export function DeniedToast() {
  const router = useRouter();
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    toast.error("You don't have access to that page.");
    router.replace("/admin");
  }, [router]);

  return null;
}
