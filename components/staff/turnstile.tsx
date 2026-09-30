"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Cloudflare Turnstile (bot check) for login, magic link and password reset.
// Supabase Auth verifies the token (Dashboard → Auth → Attack Protection).
// With no NEXT_PUBLIC_TURNSTILE_SITE_KEY (local dev) nothing is rendered.

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<void> | null = null;
function loadScript() {
  scriptPromise ??= new Promise((resolve, reject) => {
    // Loaded by our (nonced) bundle, so CSP 'strict-dynamic' allows it.
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Turnstile failed to load"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export const CAPTCHA_ENABLED = !!SITE_KEY;

/**
 * Renders the widget and returns its current token ("" until solved, or when
 * captcha is off). Tokens are single-use: call reset() after each submit.
 */
export function useTurnstile(action: string) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [token, setToken] = useState("");

  useEffect(() => {
    if (!SITE_KEY) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return;
        widgetId.current = window.turnstile.render(ref.current, {
          sitekey: SITE_KEY,
          action,
          size: "flexible",
          callback: (t: string) => setToken(t),
          "expired-callback": () => setToken(""),
          "error-callback": () => setToken(""),
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [action]);

  const reset = useCallback(() => {
    setToken("");
    if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
  }, []);

  const widget = SITE_KEY ? (
    <div ref={ref} className="min-h-[65px]" data-testid="turnstile" />
  ) : null;
  return { widget, token, reset, required: !!SITE_KEY };
}
