/** Staff-area paths shared by proxy.ts, route handlers and server actions. */

export const LOGIN_PATH = "/admin/login";
export const DASHBOARD_PATH = "/admin";
export const RESET_PASSWORD_PATH = "/admin/reset-password";
export const AUTH_CONFIRM_PATH = "/admin/auth/confirm";
export const SIGN_OUT_PATH = "/admin/auth/signout";
export const MFA_PATH = "/admin/mfa";

// Need a session but not two-factor yet: finishing sign-in (MFA), and setting a
// password from an invite or reset link. Everything else needs aal2.
const AAL1_PATHS = [MFA_PATH, "/admin/welcome", RESET_PASSWORD_PATH];

export function allowsAal1(pathname: string) {
  return AAL1_PATHS.includes(pathname);
}

// Reachable without a session. Everything else under /admin requires one.
const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/forgot-password"];
const PUBLIC_ADMIN_PREFIXES = ["/admin/auth/"];

export function isProtectedAdminPath(pathname: string) {
  if (pathname !== "/admin" && !pathname.startsWith("/admin/")) return false;
  if (PUBLIC_ADMIN_PATHS.includes(pathname)) return false;
  return !PUBLIC_ADMIN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Only allow redirects back into the staff area (prevents open redirects):
 * "/admin", "/admin/…", "/admin?…". No "//", backslashes or control characters.
 */
export function safeAdminPath(next: string | null | undefined) {
  if (
    !next ||
    next.length > 500 ||
    !/^\/admin([/?#]|$)/.test(next) ||
    next.includes("//") ||
    next.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(next)
  ) {
    return DASHBOARD_PATH;
  }
  return next;
}

export function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const isLocal = !configured || /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(configured);
  const vercelDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (isLocal && process.env.VERCEL && vercelDomain) return `https://${vercelDomain}`;
  return (configured || "http://localhost:3000").replace(/\/$/, "");
}
