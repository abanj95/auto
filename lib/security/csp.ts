// Content-Security-Policy, built per request in proxy.ts with a fresh nonce.
// Scripts: only ours (nonce + 'strict-dynamic', so scripts they load — Vercel
// analytics, Turnstile — are allowed). No 'unsafe-inline' for scripts.

const TURNSTILE = "https://challenges.cloudflare.com";

export function buildCsp(nonce: string, isDev = process.env.NODE_ENV === "development") {
  const supabase = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321");
  const supabaseHttp = supabase.origin;
  const supabaseWs = `${supabase.protocol === "https:" ? "wss:" : "ws:"}//${supabase.host}`;

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      // Dev only: React Refresh / error overlay.
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    // Inline styles are needed by next/font, Radix and style attributes.
    "style-src": ["'self'", "'unsafe-inline'"],
    // data: for the two-factor QR code; blob: for local photo previews.
    "img-src": ["'self'", "data:", "blob:", supabaseHttp],
    "font-src": ["'self'"],
    "connect-src": [
      "'self'",
      supabaseHttp,
      supabaseWs,
      TURNSTILE,
      "https://vitals.vercel-insights.com",
      ...(isDev ? ["ws:"] : []),
    ],
    "frame-src": [TURNSTILE],
    // browser-image-compression runs in a blob: worker.
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    "manifest-src": ["'self'"],
    ...(isDev ? {} : { "upgrade-insecure-requests": [] }),
  };

  return Object.entries(directives)
    .map(([name, values]) => [name, ...values].join(" "))
    .join("; ");
}

/** 128-bit random nonce, base64. Works in the Node and Edge runtimes. */
export function createNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}
