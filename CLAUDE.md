# McRowin Auto

A simple used-car dealership website for McRowin Auto, replacing an old WordPress site.

## Product summary

- **Public buyers:** browse vehicle listings, filter, view a vehicle page with a photo gallery, tap
  Call or Text, and share a listing; ask us to find a car (Vehicle Finder). No buyer accounts, no
  favorites. The Vehicle Finder is the only public form.
- **Staff:** two roles.
  - `admin` manages everything: listings, site settings, users.
  - `poster` can create, edit, mark sold, and delete listings. An admin can also give each poster
    any of three extra areas on the Users page ("Access…"): **Requests**, **Homepage**, **Settings**
    (`profiles.permissions`). Never: users, activity log, featured.
  - Staff mostly post from a phone.

## Stack

- Next.js 16 App Router + TypeScript (strict), React Server Components by default
- Tailwind CSS v4 + shadcn/ui (Radix, `radix-vega` style), lucide-react icons
- Supabase: Postgres, Auth, Storage, via `@supabase/ssr`
- React Hook Form + Zod for all forms and server validation
- pnpm; ESLint + Prettier; Playwright for smoke tests
- Deploy target: Vercel

Also used: `browser-image-compression` (photo uploads), `@dnd-kit/*` (photo reordering),
`sonner` (toasts), `yet-another-react-lightbox` (public gallery), `@vercel/analytics`,
`@vercel/speed-insights`, `server-only`, `tsx`, `supabase` CLI, `react-markdown` (legal pages).
Resend (email) is called over HTTP with `fetch`, no SDK. No VIN barcode scanning (by
decision) — VINs are typed.

## Folder layout

```
app/
  layout.tsx          Root layout (Inter font, metadata)
  globals.css         Theme tokens (brand color, grays)
  (public)/           Buyer site: home, inventory, inventory/[slug], vehicle-finder, about, contact,
                      terms, privacy
  api/vehicles/[slug]/photos/  Public read-only photo list (inventory "Photos (N)" lightbox)
  sitemap.ts          Public pages (vehicle pages come with the SEO stage)
  not-found.tsx       Site-wide 404 (with public header/footer)
  (staff)/admin/      Staff area (noindex; toast container)
    auth/confirm/     Email-link callback (magic link, password reset)
    auth/signout/     Signs out; used when a profile is missing/inactive
    (auth)/           Public: login, forgot-password; reset-password (needs session)
    (app)/            Signed-in staff: top bar + bottom tabs / sidebar
      vehicles/       List (status chips, search), new, [id] edit; actions.ts = all vehicle/photo server actions
      requests/       Vehicle Finder requests (list, [id] detail); homepage/, settings/ — admins + posters
                      given that area (requirePermission)
    api/vin/[vin]/    Staff-only NHTSA vPIC lookup (prefill)
    api/uploads/      The only way images reach Storage (checked + re-encoded)
      (admin-only)/   Admin-only pages (users, activity) — default home for new pages
components/
  ui/                 shadcn/ui components (generated; edit sparingly)
  public/             Buyer-site components (list rows + grid cards, filter bar, gallery, share,
                      vehicle-finder-form, legal-page)
  turnstile.tsx       Cloudflare Turnstile widget (sign-in forms + Vehicle Finder)
  staff/              Staff-area components
    vehicle-form/     Posting form: photo-manager (upload queue, dnd reorder), photo-upload (compress + XHR upload)
    homepage/         Homepage editor: slide list/dialog, scaled previews, sections form, brand images
    requests/         Vehicle Finder request editor (status, notes, delete)
lib/
  nhtsa.ts            VIN decode + mapping to our enums (server only)
  vehicle-options.ts  Feature checklist, color chips, description template
  public-data.ts      ALL public-site queries (cookie-free anon client) + photoUrl()
  site-images.ts      siteImageUrl() + brand image definitions (client and server)
  env.ts              Zod validation of env vars (run from next.config.ts; fails the build)
  security/           csp.ts (nonce CSP), audit.ts (activity log), rate-limit.ts, request-info.ts,
                      image-check.ts (magic bytes), session-limits.ts, turnstile.ts (server
                      verify), ip-hash.ts (HMAC of IPs)
  notify.ts           Vehicle Finder email to the dealership (Resend; off without RESEND_API_KEY)
  purge-requests.ts   Deletes requests closed > 12 months (daily cron)
  format.ts           Price/mileage formatting, enum labels, tel:/sms: hrefs
  auth.ts             getStaff(), requireStaff(), requireAdmin(), requirePermission() — server only
  permissions.ts      Poster access areas (requests, homepage, settings) + hasPermission()
  auth-paths.ts       Staff route constants, public-path list, safe redirect helper
  database.types.ts   Generated DB types (`pnpm db:types`) — do not edit by hand
  supabase/
    server.ts         Server Components / Server Actions / Route Handlers
    client.ts         Client Components (browser)
    middleware.ts     Session refresh, called from proxy.ts
    public.ts         Cookie-free anon client for public pages (cacheable)
  validation/         Zod schemas (shared by client and server)
  utils.ts            cn() helper
proxy.ts              Next 16 "middleware" — refreshes session; signed-out /admin -> login
scripts/              Local tools (tsx); use the secret key; app code may not import them
  create-admin.ts     One-time: create/update the admin user from ADMIN_EMAIL/ADMIN_PASSWORD
  seed-demo.ts        Demo vehicles (is_demo) + hero slides from Unsplash (docs/image-credits.md)
  remove-demo.ts      Deletes every is_demo vehicle + photos + files (run before launch)
supabase/
  migrations/         SQL migrations (never edit one that has been pushed; add a new one)
  config.toml         Supabase CLI config
tests/e2e/            Playwright smoke tests
docs/image-credits.md Source, photographer and license of every seeded photo
docs/security-audit.md Findings, fixes, and the manual settings checklist
docs/restore.md       Nightly backups (GitHub Actions) and how to restore
.github/              CI (lint, types, build, audit, gitleaks, optional e2e), backups, ZAP, Dependabot
.githooks/pre-commit  gitleaks secret scan (enabled by `pnpm install`)
```

## Public site

- Search engines: until `NEXT_PUBLIC_ALLOW_INDEXING=true` (set at launch on the real domain),
  `app/robots.ts` disallows everything and the root layout marks every page noindex
  (`lib/indexing.ts`).
- Demo listings: `vehicles.is_demo` shows a "Demo listing" badge (card + vehicle page). Seed with
  `pnpm db:seed-demo`; remove all of them before launch with `pnpm db:remove-demo`.

- Public pages read data only through `lib/public-data.ts` (anon client, never cookies), so
  they see exactly what a visitor sees. Every page renders per request (`connection()` in the
  root layout) so it carries the CSP nonce — don't add `revalidate` / `generateStaticParams`.
- Staff edits still call `revalidatePath` for `/`, `/inventory/[slug]` etc. (harmless, and needed
  if caching comes back).
- Inventory filters are plain GET forms with native `<select>`s; every filter lives in the
  URL (`make`, `model`, `year_min/max`, `price_min/max`, `mileage_max`, `body`, `drivetrain`,
  `fuel`, `sort`, `page`, `per_page` 12/24/48, `view` list/grid), validated by
  `lib/validation/inventory.ts` (bad values ignored). Build links with `inventoryHref()`.
- Inventory layout: desktop filter bar across the top (each change applies at once); phones get
  the Filters bottom sheet with every filter. Results bar: count, sort, List/Grid toggle, per page,
  pager. List view = `vehicle-list-row.tsx` (photo + "Photos (N)" lightbox, spec table, price
  box); grid = `vehicle-card.tsx` (1/2/3/4 columns). The view is remembered in localStorage
  (`inventory-view`) and restored when the URL has no `?view`. Under the results: the
  `price_disclaimer`. Prices are all-in: never add "plus dealer/doc fees" wording.
- Homepage: hero carousel (text in one centered dark box), four quick-link tiles (labels in
  `site_settings.tile_*_label`), "Welcome to …" with `home_welcome_subheading`, About text and
  photo; one featured row only when `show_featured_on_home` is on.
- `/terms` and `/privacy` render `site_settings.terms_md` / `privacy_md` with react-markdown
  (raw HTML skipped, only http(s)/mailto/tel/internal links). A trigger bumps
  `terms_updated_at` / `privacy_updated_at` when the text changes. Drafts contain [placeholders];
  a lawyer should review before launch.
- Images: `next/image` with the Supabase bucket in `images.remotePatterns`; always pass `sizes`.
  Photo cards and galleries are 4:3 `object-cover`.
- `site_settings.hours` format: 7 entries Monday→Sunday,
  `[{ "day": "mon", "closed": false, "open": "09:00", "close": "18:00" }, …]`; the public site
  groups matching days via `formatHours()` (`lib/validation/site-settings.ts`).
- Hero, logo, favicon, About photo and share image come from the database (see Homepage editor).
  No hard-coded image references in components.

## Staff posting tool (Stage 4)

- VINs are typed (no barcode scanning, no check-digit validation — by decision). `normalizeVin`
  uppercases and maps O/Q→0, I→1. NHTSA prefill only fills empty fields.
- Drafts may lack details; the DB check `vehicles_listed_requires_details` requires VIN, year,
  make, model, price, mileage once not a draft. "≥1 photo to publish" is enforced in the server
  actions. Only admins can change `featured` (DB trigger + action).
- Photos: compressed in the browser (1920px, WebP; JPEG where the browser can't encode WebP,
  e.g. Safari), then uploaded by XHR (for progress), 3 at a time, to `POST /admin/api/uploads`,
  which checks and re-encodes them and records the photo row. Max 40. Worker script is self-hosted at
  `public/vendor/browser-image-compression-2.0.2.js` — update it with the package.
- New vehicle: the draft row is created on the first photo or first save. The URL stays
  `/admin/vehicles/new` until an explicit Save/Publish: server actions refresh the _current URL_,
  and switching to `[id]` mid-edit would remount the form and drop uploads.
- Autosave every 10s for drafts only; listed cars use "Save changes" (never auto-publish edits).
- Every vehicle/photo change calls `revalidatePath` for `/`, `/inventory`, `/inventory/[slug]`.
- Deleting a vehicle removes its storage files first (any staff member).
- E2E tests use a shared admin + poster (created and signed in once by
  `tests/e2e/global-setup.ts`, removed by global-teardown) — Supabase Auth rate-limits token
  verifications per IP. Tests that end sessions create their own user. Need `SUPABASE_SECRET_KEY`.
- Next 16: use `preload` / `loading="eager"` on images, not the deprecated `priority`.

## Vehicle Finder

- `/vehicle-finder` (public): form validated by `lib/validation/vehicle-request.ts` (client and
  server). Intro text: `site_settings.finder_intro` (Settings). Consent checkbox required.
- `submitVehicleRequest` (server action): honeypot → 3 per IP per hour (`rate_limit_hit`) →
  Turnstile (`TURNSTILE_SECRET_KEY`; skipped when unset) → Zod → insert with the secret key
  (`ip_hash` = HMAC, never the raw IP) → email via `after()` (`notifyNewRequest`). Visitors have
  **no** grants on `vehicle_requests`, so nobody can skip these checks via the API.
- `vehicle_requests`: status `new | contacted | found | closed`, `admin_notes`, `closed_at` (set by
  trigger when closed, cleared when reopened). Admins + posters with Requests access (RLS
  `has_permission('requests')`); visitors nothing.
- `/admin/requests` (Requests access): status chips, detail page with Call/Text/Email, status + notes,
  delete; status changes and deletes go to the activity log. "New" count badge in the staff nav.
  Phone tab bar: Vehicles, Add, Requests, Settings, Users (Homepage is linked from Settings,
  Activity from Users; Users is greyed out for posters).
- Closed requests are deleted 12 months after `closed_at` by the daily cron (`purge-requests.ts`).

## Admin pages (Stage 5)

- `/admin` dashboard (all staff): counts, 5 recently updated, Add vehicle.
- `/admin/users`, `/admin/activity` (admin only, in `(admin-only)/`): every page and action calls
  `requireAdmin()`. Posters see these nav items greyed out (not links); typed URLs redirect.
- `/admin/settings`, `/admin/homepage`, `/admin/requests`: admins, and posters an admin gave that
  area to (`requirePermission("settings" | "homepage" | "requests")`, migration 020). Without it
  the nav item is greyed out ("no access") and typed URLs redirect to the dashboard.
- Users page → Actions → **Access…** (posters only): three switches, saved by
  `setUserPermissions` (audited as `permissions_changed`). Nobody can change their own access.
- Users: invite (email or "Copy invite link" via `generateLink`), password reset (email or copy
  link), deactivate/reactivate, role change. Nobody can change their own role/active.
- Invite links land on `/admin/welcome` (set password). Copied links go through
  `/admin/auth/confirm` with a token hash, so they work without email/SMTP.

## Homepage editor

- `/admin/homepage` (Homepage access): hero slides (`hero_slides`), carousel autoplay/interval, homepage
  sections (welcome subheading, tile labels, featured toggle), and brand images in `site_settings` (`logo_path`, `logo_dark_path`, `favicon_path`, `about_image_path`,
  `og_default_image_path`). Every action calls `revalidatePath("/", "layout")`.
- Image paths: a leading `/` is a static file in `public/` (only the migration-seeded logos,
  `/brand/logo-full*.png`); anything else is in the `site-images` bucket. Always use
  `siteImageUrl()`. Static files are never deleted.
- Slide text (headline, one paragraph, one button) always sits in a centered dark box;
  `text_position` is kept in the DB but no longer used or editable. `overlay_strength` tints the image.
- Slides may have a portrait `mobile_image_path` (served below 768px via `<picture>` +
  `getImageProps()`); without one, the desktop image is cropped around `focal_point`. Button
  links are internal paths or `tel:+1…`.
- Uploads go through `POST /admin/api/uploads` (reusing `photo-upload.ts`): slides and About
  photo WebP 2400px, share image JPEG 1200px, logos/favicon stored as PNG. No SVG. Folders:
  `slides/`, `logos/`, `icons/`, `photos/`.
- Removing/replacing an image deletes the file only if no slide or setting still uses it
  (`removeUnusedFiles`); cancelled dialog uploads are discarded.
- `components/public/hero-slide.tsx` is shared by the public carousel and the admin previews; it
  uses container queries (`@2xl`, `@5xl`) so the scaled previews match the live layout.
- Public: visitors only see active slides inside their `starts_at`/`ends_at` window (RLS), so a
  promo appears/ends on the next page load. No live slides → plain fallback
  hero. Favicon falls back to `public/favicon.ico`; no share image → none.

## Theme

- Brand accent: `--brand` (`#b91c1c`) in `app/globals.css`, mapped to shadcn's `--primary` and
  `--ring`. Use `bg-primary` / `text-brand` rather than hard-coded colors.
- Logo: `components/public/logo.tsx` (async server component) shows `site_settings.logo_path`
  (`logo_dark_path` with `tone="light"`), else the dealership name as text.
- Neutral grays from shadcn's `neutral` base. Inter via `next/font`.
- Light mode only. Do not add a `.dark` class or dark palette.

## Commands

- `pnpm dev`, `pnpm build`
- `pnpm lint`, `pnpm typecheck`, `pnpm format`
- `pnpm test:e2e` (starts the dev server; runs at 360px and desktop; includes RLS and security
  tests. Running it several times within ~5 minutes can hit Supabase Auth rate limits — wait)
- `pnpm db:push` apply new migrations to the linked Supabase project
- `pnpm db:types` regenerate `lib/database.types.ts` after any schema change
- `pnpm db:seed-demo` / `pnpm db:remove-demo` add / remove demo vehicles (writes to the project in
  `.env.local`; re-runnable)

## Security

Full audit, fixes and the manual settings checklist: `docs/security-audit.md`. Backups:
`docs/restore.md`.

### Access (database — the final guard)

Roles live in `profiles.role` (`admin` | `poster`). `private.is_staff()` / `private.is_admin()`
(not exposed via the API) require `profiles.active` and a **live staff session**
(`private.staff_sessions`: not ended, idle ≤ 30 min, signed in ≤ 12 h). So every staff RLS rule
enforces session limits, even for someone with a valid token. No two-factor (removed by decision,
migration 017).

| Who                   | vehicles                                     | vehicle_photos + storage files        | profiles           | site_settings / hero_slides | audit_log | vehicle_requests                |
| --------------------- | -------------------------------------------- | ------------------------------------- | ------------------ | --------------------------- | --------- | ------------------------------- |
| Public (anon)         | Read available / pending / sold (not drafts) | Read photos of those; files by URL    | —                  | Read (live slides only)     | —         | — (the server inserts)          |
| Poster (live session) | Read all, create, edit, mark sold, delete    | Read, edit, delete rows; delete files | Read own row       | Read; edit with access ¹    | —         | With Requests access ¹          |
| Admin (live session)  | Same as poster + change `featured`           | Same as poster                        | Read all, edit all | Read, edit                  | Read      | Read, edit status/notes, delete |
| Idle / inactive       | Same as public                               | Same as public                        | Read own row       | Read                        | —         | —                               |

- ¹ Poster access areas (`profiles.permissions`, checked by `private.has_permission()`, which is
  always true for admins): **Settings** = site_settings fields except the homepage ones;
  **Homepage** = hero_slides, site-images files and the homepage fields of site_settings (logo,
  images, carousel, tiles, welcome subheading, featured toggle); **Requests** = vehicle_requests.
  One row holds both kinds of settings, so the `protect_site_settings_areas` trigger checks which
  fields changed. Add new homepage columns to its key list (migration 021).
- **Nobody** uploads to Storage from the browser: only `POST /admin/api/uploads` (secret key, after
  checks). No SVG anywhere. Buckets are public by URL, not listable, never overwritten.
- `audit_log` is insert-only for everyone (trigger blocks update/delete/truncate, even the secret
  key). Write it with `audit()` from `lib/security/audit.ts`; admins read it at `/admin/activity`.
- Nobody can change their own `role` or `active` (trigger). The first admin is created with
  `pnpm tsx scripts/create-admin.ts`. Public sign-ups are disabled; new auth users get `poster`.
- On INSERT, signed-in users may only set the vehicle columns granted in migration 015 (not
  `stock_no`, `created_by`, `published_at`, `sold_at`, `slug`, `is_demo`); triggers manage the rest.
- The secret key (`SUPABASE_SECRET_KEY`) bypasses all of the above. In app code it may ONLY be
  used via `createAdminClient()` (`lib/supabase/admin.ts`, server-only; ESLint enforces the env
  read) — after `requireAdmin()` / `checkStaff()`, in `lib/security/*` (audit log, rate limits),
  in a trusted job (cron), or in `submitVehicleRequest` after its spam checks. Local scripts/tests create their own client.
- Sold cars are purged 31 days after `sold_at` by the daily cron (`/api/cron/purge-sold`, Bearer
  `CRON_SECRET`, constant-time check), which also deletes Vehicle Finder requests closed > 12 months
  ago and cleans up rate-limit/session rows.

### Staff auth (app layer)

1. `proxy.ts` (`lib/supabase/middleware.ts`): per-request CSP nonce + headers; `/admin/**`
   signed out → login; > 12 h since sign-in → signed out;
   `/admin/api/*` answers 401 instead of redirecting. Optimistic only.
2. **Every** staff page and server action starts with `await requireStaff()` /
   `await requireAdmin()`; route handlers use `checkStaff()`. They verify the JWT (`getClaims()`,
   never `getSession()`), the active profile, and touch the server-side session (idle → signed
   out with `?error=idle`). Layout checks don't protect pages or actions.
3. RLS (above).

- Sign-in: password or magic link (both logged as "Signed in" in the activity log). No two-factor.
- Login protection: Turnstile (when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set; Supabase verifies it;
  the Vehicle Finder is verified by our server with `TURNSTILE_SECRET_KEY`),
  20 attempts/IP/15 min, 5 failures lock an account for 15 min, email links 5/IP/15 min and
  3/email/hour, generic messages only ("Invalid email or password", "If that email exists…").
  Per-IP limits trust Vercel's `x-real-ip`/`x-forwarded-for` (fine on Vercel only).
- Passwords ≥ 12 characters; changing one signs out every other session.
- Idle logout in the browser (`components/staff/idle-watcher.tsx`): warning at 25 min, sign-out at
  30, synced across tabs (BroadcastChannel); a 2-minute heartbeat keeps the server session alive.
  Limits live in `lib/security/session-limits.ts` and must match migration 015.
- Redirect targets (`next`) always go through `safeAdminPath()` (internal `/admin` paths only).

Posters may use `/admin` and `/admin/vehicles/**`, plus `/admin/requests/**`, `/admin/homepage`
and `/admin/settings` when given that area. Put every other staff page in
`app/(staff)/admin/(app)/(admin-only)/` and call `requireAdmin()` in it (or, if it belongs to an
area, `requirePermission()`).

### Rules for future changes

- New staff page / action / route: guard it (`requireStaff`/`requireAdmin`/`checkStaff`), validate
  input with Zod (ids with `z.uuid()`), and log security-relevant changes with `audit()`.
- New table: enable RLS, explicit grants, policies via `private.is_staff()` / `is_admin()`;
  `security definer` functions must `set search_path = ''`; functions the browser mustn't call get
  `revoke … from public, anon, authenticated`. Run `supabase db advisors` after migrating.
- Never render user/admin-provided URLs without checking the scheme (`isHttpsUrl`, internal paths).
  No `dangerouslySetInnerHTML`.
- No inline `<script>`s: anything that must run in the page comes from our bundle (CSP nonce +
  `'strict-dynamic'`). New third-party origins (images, APIs, frames) go in `lib/security/csp.ts`.
- Files: only through `/admin/api/uploads` (magic bytes + sharp). Never allow SVG.
- Secrets only in `.env.local` / Vercel; env vars are validated in `lib/env.ts` (add new ones
  there). Optional: `TURNSTILE_SECRET_KEY`, `RESEND_API_KEY` + `NOTIFY_EMAIL` (+ `NOTIFY_FROM` on a
  Resend-verified domain), `IP_HASH_SECRET` (else `CRON_SECRET` keys the IP hashes). Server-only modules import `"server-only"`. The gitleaks pre-commit hook and CI must pass.

## Rules

- Mobile-first; test layouts at 360px wide
- Server Components by default; `"use client"` only when needed
- All data access goes through Supabase with RLS; never use the secret key (`sb_secret_…`, formerly "service role") in client code
- Validate every form with Zod on both client and server
- Run `pnpm lint` and `pnpm typecheck` before saying a task is done
- Keep it simple: no features beyond the current stage's prompt

@AGENTS.md
