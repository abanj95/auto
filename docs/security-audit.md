# Security audit — McRowin Auto

Date: 2026-09-29 · Branch: `security-hardening` · Scope: all app code, SQL migrations 001–014,
storage policies, Next.js config, client bundles, dependencies, Supabase project settings.

Phase 2 (same branch) fixed every critical/high/medium finding; see the Status column,
the accepted items below, and the manual checklist at the end.

## Summary

| Severity | Count |
| -------- | ----- |
| Critical | 0     |
| High     | 1     |
| Medium   | 7     |
| Low      | 9     |

No critical issues. Authorization is solid: every staff page, server action and route checks the
user on the server, RLS is on every table, and the secret key never reaches the browser. The gaps
are in login hardening (no MFA, weak password rules, no lockout), sessions that never expire,
missing browser security headers, and no audit trail.

## Findings

### High

| ID  | Finding                                                                                                                             | Where                                                      | How it could be exploited                                                                                                                  | Proposed fix                                                                                                                                                                                                               | Status                                                                                    |
| --- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| H1  | **No multi-factor authentication.** Staff sign in with a password only. Admins can invite users, change roles, edit the whole site. | `app/(staff)/admin/(auth)/actions.ts:40`, `lib/auth.ts:34` | A phished, reused or guessed admin password gives full control: create a new admin, lock out the owner, deface the site, delete inventory. | Supabase TOTP MFA for all staff (admins and posters). Require `aal2` in `proxy.ts`, in `requireStaff()`/`requireAdmin()`, and in RLS for writes. Enrollment with QR code; recovery by an admin resetting a user's factors. | **Accepted (A10).** TOTP was built, then removed by decision (2026-09-30, migration 017). |

### Medium

| ID  | Finding                                                                                                                                                                                                                                                     | Where                                                                                                      | How it could be exploited                                                                                                                                    | Proposed fix                                                                                                                                                                                                                              | Status                                                                                                                                                      |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | **No security headers.** No Content-Security-Policy, no `frame-ancestors`/`X-Frame-Options`, no `X-Content-Type-Options`, `Referrer-Policy` or `Permissions-Policy`; `X-Powered-By: Next.js` is sent. (Checked against `next start`.)                       | `next.config.ts:6` (no `headers()`), `proxy.ts`                                                            | Admin pages can be framed (clickjacking: trick an admin into clicking "Make admin"/"Delete"). No second line of defense if an XSS bug ever appears.          | Nonce-based CSP set in `proxy.ts` (no `unsafe-inline` scripts), `frame-ancestors 'none'`, HSTS (includeSubDomains, preload), nosniff, strict Referrer-Policy, restrictive Permissions-Policy, COOP same-origin, `poweredByHeader: false`. | **Fixed.** Nonce CSP (no `unsafe-inline` scripts) + all listed headers; `poweredByHeader: false`. Trade-off A3.                                             |
| M2  | **Sessions never expire.** Supabase refresh tokens last indefinitely by default; there is no idle or absolute timeout. Staff mostly use phones.                                                                                                             | `lib/supabase/middleware.ts:40`                                                                            | A lost/shared phone or an unattended dealership PC stays signed in to the admin area forever.                                                                | Idle logout (30 min, warning at 25, synced across tabs), absolute 12 h limit, both enforced on the server (per-session `last_seen_at` / token issue time checked in `proxy.ts` and `requireStaff()`).                                     | **Fixed.** 30 min idle (warning at 25, cross-tab) and 12 h absolute, enforced in the browser, the proxy, `requireStaff` and RLS (`private.staff_sessions`). |
| M3  | **Weak password policy.** Minimum 8 characters; Supabase leaked-password protection is off (reported by `supabase db advisors`).                                                                                                                            | `lib/validation/auth.ts:18`; Supabase Auth settings                                                        | Easier credential stuffing / guessing, especially without MFA (H1).                                                                                          | Minimum 12 characters in Zod and in Supabase Auth settings; turn on leaked-password protection (needs Pro plan).                                                                                                                          | **Fixed in the app** (≥ 12 characters). Supabase minimum length: manual setting. Leaked-password check needs the Pro plan → accepted on Free (A8).          |
| M4  | **No app-level brute-force protection.** Login, magic link and password reset rely only on Supabase's per-IP limits; no per-account lockout. The VIN lookup route is unthrottled.                                                                           | `app/(staff)/admin/(auth)/actions.ts:40,67,83`; `app/(staff)/admin/api/vin/[vin]/route.ts:8`               | Slow or distributed password guessing against a known staff email; email bombing via magic-link/reset.                                                       | Postgres-based rate limiter (per IP and per email); lock an account 15 min after 5 failures; Cloudflare Turnstile on login, magic link and reset (Supabase captcha support).                                                              | **Fixed.** Postgres limiter + 15-min lockout after 5 failures; Turnstile (after you add keys); VIN 60/10 min, invites 20/h.                                 |
| M5  | **Changing a password doesn't sign out other sessions.** `updateUser({ password })` leaves other devices signed in.                                                                                                                                         | `app/(staff)/admin/(auth)/actions.ts:106`                                                                  | Someone who stole a session keeps access after the owner resets their password.                                                                              | After a password change, sign out all other sessions (`signOut({ scope: "others" })`); on deactivation also revoke all sessions (ban already blocks refresh).                                                                             | **Fixed.** Password change signs out all other sessions (Supabase + staff session table); deactivation and MFA reset end all of the user's sessions.        |
| M6  | **No audit trail.** Sign-ins, role changes, deletions and price changes aren't recorded.                                                                                                                                                                    | —                                                                                                          | Misuse or a compromised account can't be investigated after the fact.                                                                                        | Insert-only `audit_log` table (admin read, nobody updates/deletes), logging from server actions, `/admin/activity` page, email alerts for sensitive events.                                                                               | **Fixed.** Insert-only `audit_log`, `/admin/activity` with filters and flagged alerts. Email alerts skipped by decision (A7).                               |
| M7  | **Uploads aren't checked server-side.** Photos go from the browser straight to Storage. The bucket only checks the _declared_ Content-Type; the `vehicle-photos` insert policy doesn't check the file extension; nothing re-encodes the file on the server. | `components/staff/vehicle-form/photo-upload.ts:90`; `supabase/migrations/20260927120006_storage.sql:19-30` | A poster (or a stolen poster session) can store arbitrary bytes, e.g. an HTML or polyglot file, at a public URL on the Supabase domain, labeled as an image. | Upload through a server route: check magic bytes, re-encode with sharp, store under a random name with the secret key; remove the client-side insert policies so browsers can't write to Storage directly.                                | **Fixed.** `POST /admin/api/uploads` (origin, role, ≤ 4 MB, magic bytes, sharp re-encode, random name, secret key); browser insert policies dropped.        |

### Low

| ID  | Finding                                                                                                                                                                                                                                                                               | Where                                                                                                 | How it could be exploited                                                                                                                                                               | Proposed fix                                                                                                                                                                                 | Status                                                                                                                                                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1  | **SVG allowed for logos.** Admin-uploaded SVGs are served from Supabase Storage as `image/svg+xml`.                                                                                                                                                                                   | `supabase/migrations/20260928120013_homepage_editor.sql:122,143-144`; `components/public/logo.tsx:29` | On our pages they render in `<img>` (scripts don't run), but opening the file URL directly runs any script inside it on the Supabase storage origin. Admin-only.                        | Remove SVG from the bucket and the editor; logos as PNG/WebP.                                                                                                                                | **Fixed.** SVG removed from the bucket, editor and validation; logos stored as PNG.                                                                                                                                                            |
| L2  | **Insert-time fields trusted.** `vehicles_before_write` freezes `created_by`, `created_at`, `stock_no`, `published_at`, `sold_at` only on UPDATE. On INSERT a staff member calling the API directly can set them. (CLAUDE.md says client values are ignored — true for updates only.) | `supabase/migrations/20260927120002_vehicles.sql:84-111`                                              | Spoof who created a listing (matters once there's an audit log); insert a sold car with an old `sold_at` so the nightly purge deletes it. Staff can already delete, so impact is small. | New trigger: on INSERT set `created_by = auth.uid()` (when signed in), `created_at = now()`, ignore client `published_at`/`sold_at`; generate `stock_no` unless the secret-key role inserts. | **Fixed.** Column-level INSERT grants: signed-in users can't set `stock_no`, `created_by`, dates, `slug`, `is_demo`.                                                                                                                           |
| L3  | **Facebook / Maps links are validated only in the app.** No database check, and the footer renders them as `href`.                                                                                                                                                                    | `supabase/migrations/20260927120004_site_settings.sql:16-17`; `components/public/site-footer.tsx:69`  | An admin token used directly against the API could store `javascript:…`, a stored XSS on every public page. Admin-only; defense in depth.                                               | DB check constraints (https + allowed hosts) and a render-time `https:` guard.                                                                                                               | **Fixed.** DB `https://` checks + render-time `isHttpsUrl()`.                                                                                                                                                                                  |
| L4  | **Sign-out is a GET request.**                                                                                                                                                                                                                                                        | `app/(staff)/admin/auth/signout/route.ts:11`                                                          | Any site can sign a staff member out with an `<img>` tag (nuisance only).                                                                                                               | Accept POST for normal sign-out; keep GET only for the forced "disabled" redirect, which is harmless.                                                                                        | **Accepted (partly fixed).** The Sign out button is now a POST server action. The GET route remains only for forced sign-outs (idle / expired / disabled); a cross-site request can still sign someone out — a nuisance with no data exposure. |
| L5  | **Cron secret compared with `!==`.**                                                                                                                                                                                                                                                  | `app/api/cron/purge-sold/route.ts:11`                                                                 | Timing attack, not practical over the network.                                                                                                                                          | Constant-time comparison.                                                                                                                                                                    | **Fixed.** `timingSafeEqual`.                                                                                                                                                                                                                  |
| L6  | **`setVehicleStatus` doesn't validate `status` with Zod.**                                                                                                                                                                                                                            | `app/(staff)/admin/(app)/vehicles/actions.ts:142`                                                     | Bad values are rejected by the DB enum; returns a generic error. Consistency only.                                                                                                      | Zod enum check.                                                                                                                                                                              | **Fixed.** Zod enum check.                                                                                                                                                                                                                     |
| L7  | **Signed-out tokens stay valid until they expire.** `getClaims()` verifies the JWT signature locally, so an access token from a session that was signed out still works for up to 1 hour. Deactivation is already covered (profile check on every request).                           | `lib/auth.ts:18`                                                                                      | A copied access token keeps working for ≤1 h after sign-out.                                                                                                                            | Server-side session table (M2) checked in `requireStaff()`; shorter JWT expiry.                                                                                                              | **Fixed.** Signed-out / idle / expired sessions are ended in `private.staff_sessions`; RLS and `requireStaff` reject their tokens immediately.                                                                                                 |
| L8  | **No CI, secret scanning or dependency updates.**                                                                                                                                                                                                                                     | repo                                                                                                  | A committed key or vulnerable dependency goes unnoticed.                                                                                                                                | GitHub Actions (lint, typecheck, build, tests, `pnpm audit`, gitleaks), gitleaks pre-commit hook, Dependabot, GitHub secret scanning + push protection, branch protection.                   | **Fixed** (CI, gitleaks hook + CI job, Dependabot). GitHub settings are manual (checklist).                                                                                                                                                    |
| L9  | **Backups unknown.** Depends on the Supabase plan.                                                                                                                                                                                                                                    | —                                                                                                     | Data loss (accidental delete, bad migration) may be unrecoverable.                                                                                                                      | Confirm the plan; if needed, nightly `pg_dump` to a private location plus `docs/restore.md`.                                                                                                 | **Fixed.** Nightly encrypted `pg_dump` → private GitHub repo (`.github/workflows/backup.yml`, `docs/restore.md`); needs one-time setup.                                                                                                        |

## Checked and OK

- **Server-side auth everywhere.** All 26 exported server actions and 4 route handlers were checked:
  - Staff/admin actions call `requireStaff()` / `requireAdmin()` (user actions via `requireOtherUser()` → `requireAdmin()`).
  - The VIN route checks `getStaff()` plus the `active` flag.
  - The cron route checks `CRON_SECRET`.
  - Sign-in and confirm flows are public by design.
  - Every staff page and layout calls the guard.
- **Role checks on the server.** Admin-only pages and actions use `requireAdmin()`; RLS repeats every rule. Nobody can change their own role or `active` (trigger).
- **No cross-user record access.** Posters editing any vehicle is by design. Profiles are readable only by their owner or an admin, and editable only by admins. Hero slides and settings are admin-only.
- **Zod on every form and action input** (the only gap is L6).
- **No trust in `getSession()` on the server.** Server code uses `getClaims()`. The only `getSession()` is in the browser upload helper (`photo-upload.ts:86`), where Supabase Storage verifies the token itself.
- **RLS on every public table:** `profiles`, `vehicles`, `vehicle_photos`, `site_settings`, `hero_slides`.
- **Grants are explicit.** Anon can only SELECT. Role helpers live in the non-exposed `private` schema.
- **Every `security definer` function sets `search_path = ''`.**
- **`supabase db advisors`** (security + performance) reports only "leaked password protection disabled" (M3).
- **Storage.**
  - Both buckets are public by URL but not listable, and nobody can overwrite a file (no UPDATE policy).
  - Only admins can write to `site-images`, so posters can't touch it.
  - Staff delete only in `vehicle-photos`.
  - Size limits: 5 MB and 8 MB.
- **Secret key never reaches the browser.**
  - Used only in `lib/supabase/admin.ts` (`server-only` + an ESLint rule).
  - Scanning all 52 files in `.next/static` found 0 occurrences of the real `SUPABASE_SECRET_KEY` or `CRON_SECRET` values. The only `sb_secret_` text is a prefix check inside supabase-js.
- **XSS.**
  - No `dangerouslySetInnerHTML` or `eval`.
  - Descriptions and all DB text render as React text (escaped).
  - `tel:`/`sms:` links are built from digits only.
  - Hero button links are restricted to internal paths or `tel:` by a DB check and Zod.
  - `mailto:` uses a DB-validated email.
  - Only L3 remains.
- **Open redirects.** `safeAdminPath()` only allows `/admin…` paths (rejects `//` and `\`). It's used in the login action, magic link, auth confirm route and the proxy's `next` param.
- **Error messages.**
  - Login says "Incorrect email or password."
  - Magic link and reset always reply "If that email belongs to a staff account…"
  - DB errors are logged on the server and shown as generic messages.
  - Next.js hides stack traces in production.
- **Public sign-ups disabled.** Email is the only provider, and auto-confirm is off.
- **Staff responses aren't cached.** Staff pages return `Cache-Control: private, no-cache, no-store` (checked with `next start`).
- **Dependencies.** `pnpm audit` reports 0 known vulnerabilities.

## Items in the Phase 2 brief that need a decision

1. **"Poster can't delete vehicles."**
   - The current, documented design lets posters delete listings (migration 011, CLAUDE.md).
   - Change it (admin-only delete), or keep it and have the test assert posters _can_ delete?
2. **"Camera only on the VIN scan page."**
   - There's no VIN scanner (VINs are typed, by decision).
   - Plan: `camera=()` everywhere.
3. **Email alerts** (new device, role change, new user, 5+ failed logins).
   - Supabase's SMTP only sends auth emails, so the app needs its own email service (e.g. Resend, free tier) and an API key.
   - Which service, and which address gets the alerts?
4. **Rate limiting.**
   - Plan: Postgres-based (no new service).
5. **Backups.**
   - Which Supabase plan are you on (Free has no downloadable backups)?
   - Where should nightly dumps go (e.g. a private S3/R2 bucket, or encrypted artifacts in a private GitHub repo)?
6. **Server-side uploads (M7).**
   - Photos would go through our server (checked and re-encoded with sharp), then stored with the secret key.
   - Browsers could no longer write to Storage directly.
   - Uploads stay progress-tracked and 3 at a time, but each photo makes one extra hop.
7. **Session limits in the Supabase dashboard.**
   - "Time-box" and "inactivity timeout" are Pro plan settings.
   - The app will enforce 30 min idle / 12 h on its own either way.

## Accepted risks and trade-offs (Phase 2)

| ID  | Item                                                                                        | Why it's accepted                                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Per-IP limits use `x-real-ip` / `x-forwarded-for`.                                          | Vercel sets these itself, so they're trustworthy there; on other hosts they could be spoofed. The per-account lockout doesn't depend on the IP.       |
| A2  | Anyone who knows a staff email can lock that account for 15 minutes with 5 wrong passwords. | Requested lockout policy. The owner can still sign in with an email link while locked. Every lock is flagged on `/admin/activity`.                    |
| A3  | Every page renders on each request (no CDN caching of HTML).                                | Required for nonce-based CSP without `unsafe-inline`. It's about 4 fast Supabase reads per view, fine at dealership traffic. Images are still cached. |
| A4  | `style-src 'unsafe-inline'`.                                                                | Needed by Next.js fonts, Radix and style attributes. Inline _scripts_ are still blocked, and that's where the XSS risk is.                            |
| A5  | `public.admin_age_staff_sessions()` exists in the production database.                      | Only the secret-key role can run it, and that role can already do anything. It lets tests prove the server-side session limits.                       |
| A6  | E2E and RLS tests run against the one (live) Supabase project.                              | There's no staging project yet. Tests create and delete their own users and data. A free staging project is recommended (then set `RUN_E2E` in CI).   |
| A7  | No email alerts.                                                                            | Skipped by decision (it needs an email service). Alerts are flagged and filterable on `/admin/activity`.                                              |
| A8  | No leaked-password check (HaveIBeenPwned).                                                  | That Supabase feature needs the Pro plan. Mitigated by the 12-character minimum and the lockout.                                                      |
| A9  | Photo files aren't in the nightly backups.                                                  | The backup covers the database. See `docs/restore.md` for downloading buckets.                                                                        |
| A10 | No two-factor (H1). Staff sign in with a password or an email link only.                    | Removed by decision (2026-09-30). Mitigated by the 12-character minimum, lockout, captcha, session limits and new-device alerts on `/admin/activity`. |

## Manual settings checklist (in order)

Supabase plan: **Free**. Available on Free: captcha, password rules, JWT expiry,
rate limits. **Pro only:** leaked-password protection, session time-box / inactivity timeout,
daily backups. The app enforces the session limits itself either way.

### 1. Cloudflare (Turnstile)

1. Dashboard → **Turnstile** → _Add widget_.
   - Name: McRowin Auto.
   - Hostnames: your production domain, your `*.vercel.app` project domain, and `localhost` (optional).
   - Mode: **Managed**.
2. Copy the **Site key** (public) and the **Secret key** (private).

### 2. Vercel (Project → Settings → Environment Variables, Production + Preview)

1. `NEXT_PUBLIC_TURNSTILE_SITE_KEY` = the Turnstile site key (public).
2. Check `NEXT_PUBLIC_SITE_URL` (real https URL, no localhost), `CRON_SECRET` (≥ 16 random characters) and `SUPABASE_SECRET_KEY`. **A production build now fails if these are missing or wrong** (`lib/env.ts`).
3. Leave `NEXT_PUBLIC_ALLOW_INDEXING` unset until launch.
4. Deployment Protection: keep Vercel Authentication on for previews. If you want the ZAP workflow to scan previews, create a _Protection Bypass for Automation_ secret.

### 3. Supabase Dashboard

1. **Authentication → Sign In / Providers → Email**:
   - Minimum password length **12**.
   - Password requirements: letters + digits (optional).
   - _Leaked password protection_: turn on if you upgrade to Pro.
2. **Authentication → Attack Protection** → _Enable CAPTCHA protection_ → provider **Turnstile** → paste the Turnstile **secret key**. Do this _after_ the Vercel site key is deployed, or sign-in breaks.
3. **Authentication → Multi-Factor**: not used by the app (two-factor removed); leave as is.
4. **Access token (JWT) expiry**: **900** seconds (default 3600), under Authentication → Sessions / JWT settings. The proxy refreshes tokens automatically.
5. **Authentication → Sessions** (Pro only, optional): Time-box **12 h**, Inactivity timeout **30 min**.
6. **Authentication → URL Configuration**:
   - Site URL = the live URL.
   - Redirect URLs include `https://<domain>/admin/auth/confirm**` (and `http://localhost:3000/**` for development).
7. Migrations 015–016 are already applied (shared project). For a new project, run `pnpm db:push`.

### 4. Test the preview, then merge

1. `git push -u origin security-hardening` → open the Vercel preview.
2. Sign in with your password or an email link.
3. Try it out: post a car with photos, edit the homepage, open `/admin/activity`, leave a tab idle.
4. Merge the PR into `main` → production deploy.

### 5. GitHub (repo → Settings)

1. **Code security**:
   - Secret scanning: **on**.
   - Push protection: **on**.
   - Dependabot alerts and security updates: **on**.
2. **Rules → Rulesets → New branch ruleset** for `main`:
   - Require a pull request before merging.
   - Require status checks: _Lint, typecheck, build, audit_ and _Secret scan (gitleaks)_.
   - Block force pushes.
   - Restrict deletions.
3. **Backups**: follow `docs/restore.md` (private repo, token, 3 secrets + 1 variable), then run _Nightly database backup_ once by hand.
4. Optional: repository variable `RUN_E2E=true` plus the `E2E_*` secrets, pointing at a staging Supabase project.

### 6. Local

- `brew install gitleaks` so the pre-commit hook scans commits (it's enabled by `pnpm install`).
- After enabling captcha in Supabase, put the same `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in `.env.local`. The password-form tests then skip themselves; everything else signs in with one-time links.
