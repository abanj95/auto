import "server-only";

// Server-side Turnstile check for public forms (Supabase Auth checks the
// sign-in forms itself). Off when TURNSTILE_SECRET_KEY is unset (local dev).

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function turnstileEnabled() {
  return !!process.env.TURNSTILE_SECRET_KEY;
}

/** true = passed (or captcha is off). Fails closed if Cloudflare can't be reached. */
export async function verifyTurnstile(token: string, ip: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip !== "unknown") body.set("remoteip", ip);
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (error) {
    console.error("turnstile verify failed", error instanceof Error ? error.message : error);
    return false;
  }
}
