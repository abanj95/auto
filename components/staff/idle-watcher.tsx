"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { keepAlive, signOut } from "@/app/(staff)/admin/(app)/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { HEARTBEAT_MS, IDLE_LIMIT_MS, IDLE_WARNING_MS } from "@/lib/security/session-limits";

const CHANNEL = "mcrowin-staff-session";
const STORAGE_KEY = "mcrowin:last-activity";
const EVENTS = ["pointerdown", "keydown", "wheel", "touchstart", "scroll", "mousemove"] as const;

type Message = { type: "activity"; at: number } | { type: "signout" };

function readShared(): number {
  try {
    return Number(localStorage.getItem(STORAGE_KEY)) || 0;
  } catch {
    return 0;
  }
}

/** Tell every open staff tab that we signed out (they go to the login page). */
export function broadcastSignOut() {
  try {
    const channel = new BroadcastChannel(CHANNEL);
    channel.postMessage({ type: "signout" } satisfies Message);
    // Closing at once can drop the message; the page is about to navigate anyway.
    setTimeout(() => channel.close(), 1000);
  } catch {
    // Old browsers: other tabs find out on their next request.
  }
}

/**
 * Staff idle logout: warning after 25 minutes without activity, sign-out at
 * 30. Activity in any tab keeps all tabs alive (BroadcastChannel +
 * localStorage for tabs opened later). While active, a heartbeat every 2
 * minutes refreshes the server-side session, which enforces the same limits
 * even if this timer is bypassed.
 */
export function IdleWatcher() {
  const [warning, setWarning] = useState(false);
  const lastActivity = useRef(0);
  const lastHeartbeat = useRef(0);
  const signingOut = useRef(false);
  const channel = useRef<BroadcastChannel | null>(null);

  const goToLogin = useCallback((reason: "idle" | null) => {
    if (signingOut.current) return;
    signingOut.current = true;
    window.location.assign(reason ? `/admin/auth/signout?reason=${reason}` : "/admin/login");
  }, []);

  const heartbeat = useCallback(async () => {
    lastHeartbeat.current = Date.now();
    try {
      await keepAlive();
    } catch {
      // Redirected (session ended server-side) or offline: the next page load decides.
    }
  }, []);

  const markActive = useCallback(
    (at = Date.now(), broadcast = true) => {
      if (at <= lastActivity.current) return;
      lastActivity.current = at;
      setWarning(false);
      if (broadcast) {
        try {
          localStorage.setItem(STORAGE_KEY, String(at));
        } catch {}
        channel.current?.postMessage({ type: "activity", at } satisfies Message);
        if (at - lastHeartbeat.current > HEARTBEAT_MS) void heartbeat();
      }
    },
    [heartbeat],
  );

  useEffect(() => {
    lastActivity.current = Math.max(Date.now(), readShared());
    lastHeartbeat.current = Date.now(); // This page load just touched the session.

    try {
      channel.current = new BroadcastChannel(CHANNEL);
      channel.current.onmessage = (e: MessageEvent<Message>) => {
        if (e.data.type === "signout") goToLogin(null);
        else markActive(e.data.at, false);
      };
    } catch {
      channel.current = null;
    }

    let throttle = 0;
    const onActivity = () => {
      const now = Date.now();
      if (now - throttle < 1000) return;
      throttle = now;
      markActive(now);
    };
    for (const event of EVENTS) window.addEventListener(event, onActivity, { passive: true });

    const timer = window.setInterval(() => {
      const idle = Date.now() - Math.max(lastActivity.current, readShared());
      if (idle >= IDLE_LIMIT_MS) goToLogin("idle");
      else setWarning(idle >= IDLE_WARNING_MS);
    }, 1000);

    return () => {
      for (const event of EVENTS) window.removeEventListener(event, onActivity);
      window.clearInterval(timer);
      channel.current?.close();
    };
  }, [goToLogin, markActive]);

  return (
    <AlertDialog open={warning}>
      <AlertDialogContent data-testid="idle-warning">
        <AlertDialogHeader>
          <AlertDialogTitle>You&apos;ll be signed out in 5 minutes</AlertDialogTitle>
          <AlertDialogDescription>
            For security, staff are signed out after 30 minutes without activity.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            className="h-11"
            onClick={() => {
              markActive(Date.now());
              void heartbeat();
            }}
          >
            Stay signed in
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Sign-out button for the top bar: signs out and tells the other tabs. */
export function SignOutForm({ children }: { children: React.ReactNode }) {
  return (
    <form
      action={async () => {
        broadcastSignOut();
        await signOut();
      }}
      suppressHydrationWarning
    >
      {children}
    </form>
  );
}
