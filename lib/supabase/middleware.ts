import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isProtectedAdminPath, LOGIN_PATH } from "@/lib/auth-paths";
import type { Database } from "@/lib/database.types";

/**
 * Refreshes the Supabase auth session on each request and forwards any
 * updated auth cookies. Signed-out requests to protected /admin routes are
 * redirected to the login page. Called from the root proxy.ts (Next 16's
 * middleware). This is an optimistic check only — pages and server actions
 * still call requireStaff() / requireAdmin().
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

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
          response = NextResponse.next({ request });
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

  const { pathname, search } = request.nextUrl;
  if (!data?.claims && isProtectedAdminPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = LOGIN_PATH;
    loginUrl.search = "";
    if (pathname !== "/admin") loginUrl.searchParams.set("next", pathname + search);

    // Carry over any cookies Supabase just set (e.g. clearing an expired session).
    const redirect = NextResponse.redirect(loginUrl);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}
