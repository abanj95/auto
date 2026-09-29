/** Staff-area paths shared by proxy.ts, route handlers and server actions. */

export const LOGIN_PATH = "/admin/login";
export const DASHBOARD_PATH = "/admin";
export const RESET_PASSWORD_PATH = "/admin/reset-password";
export const AUTH_CONFIRM_PATH = "/admin/auth/confirm";
export const SIGN_OUT_PATH = "/admin/auth/signout";

// Reachable without a session. Everything else under /admin requires one.
const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/forgot-password"];
const PUBLIC_ADMIN_PREFIXES = ["/admin/auth/"];

export function isProtectedAdminPath(pathname: string) {
  if (pathname !== "/admin" && !pathname.startsWith("/admin/")) return false;
  if (PUBLIC_ADMIN_PATHS.includes(pathname)) return false;
  return !PUBLIC_ADMIN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/** Only allow redirects back into the staff area (prevents open redirects). */
export function safeAdminPath(next: string | null | undefined) {
  if (!next || !next.startsWith("/admin") || next.startsWith("//") || next.includes("\\")) {
    return DASHBOARD_PATH;
  }
  return next;
}

/**
 * Base URL for links we send out (invites, password resets, magic links).
 * NEXT_PUBLIC_SITE_URL wins; on Vercel a missing or localhost value falls back
 * to the production domain Vercel provides, so emailed links never point at
 * someone's laptop.
 */
export function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const isLocal = !configured || /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(configured);
  const vercelDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (isLocal && process.env.VERCEL && vercelDomain) return `https://${vercelDomain}`;
  return (configured || "http://localhost:3000").replace(/\/$/, "");
}
