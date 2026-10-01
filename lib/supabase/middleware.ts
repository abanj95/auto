import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isProtectedAdminPath, LOGIN_PATH, SIGN_OUT_PATH } from "@/lib/auth-paths";
import type { Database } from "@/lib/database.types";
import { buildCsp, createNonce } from "@/lib/security/csp";
import { MAX_SESSION_MS } from "@/lib/security/session-limits";

/**
 * Runs on every page request (from proxy.ts, Next 16's middleware):
 * 1. Content-Security-Policy with a per-request nonce (Next.js applies it to
 *    its own scripts; the root layout reads it from x-nonce).
 * 2. Refreshes the Supabase session and forwards updated auth cookies.
 * 3. Staff area: signed out → login; signed in more than 12 hours ago → signed
 *    out. Pages, actions and RLS check again
 *    (this is the fast first gate, not the only one).
 */
export async function updateSession(request: NextRequest) {
  const nonce = createNonce();
  const csp = buildCsp(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const next = () => NextResponse.next({ request: { headers: requestHeaders } });
  let response = next();

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = next();
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          // Prevents CDNs from caching a response that carries a session cookie.
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  // Do not add code between createServerClient and getClaims(): it triggers
  // the token refresh that keeps users signed in.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  const { pathname, search } = request.nextUrl;
  const redirectTo = (path: string, params: Record<string, string> = {}) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const redirect = NextResponse.redirect(url);
    // Carry over any cookies Supabase just set (e.g. clearing an expired session).
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return withHeaders(redirect, csp, true);
  };

  if (isProtectedAdminPath(pathname)) {
    // APIs answer 401 instead of redirecting to a page.
    const isApi = pathname.startsWith("/admin/api/");
    const deny = (path: string, params?: Record<string, string>) =>
      isApi
        ? withHeaders(
            NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 }),
            csp,
            true,
          )
        : redirectTo(path, params);
    const nextParam: Record<string, string> =
      pathname !== "/admin" ? { next: pathname + search } : {};
    if (!claims) return deny(LOGIN_PATH, nextParam);

    // Absolute limit: 12 hours after signing in, whatever the activity.
    const amr = (claims.amr ?? []) as { timestamp: number }[];
    const signedInAt = amr.length ? Math.min(...amr.map((a) => a.timestamp)) * 1000 : null;
    if (signedInAt && Date.now() - signedInAt > MAX_SESSION_MS) {
      return deny(SIGN_OUT_PATH, { reason: "expired" });
    }
  }

  return withHeaders(response, csp, pathname.startsWith("/admin"));
}

function withHeaders(response: NextResponse, csp: string, staff: boolean) {
  response.headers.set("Content-Security-Policy", csp);
  if (staff) {
    // Back button / shared computer: never keep staff pages in any cache.
    response.headers.set("Cache-Control", "no-store, max-age=0");
  }
  return response;
}
