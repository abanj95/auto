# McRowin Auto

A simple used-car dealership website for McRowin Auto, replacing an old WordPress site.

## Product summary

- **Public buyers:** browse vehicle listings, filter, view a vehicle page with a photo gallery, tap
  Call or Text, and share a listing. No buyer accounts, no forms, no favorites.
- **Staff:** two roles.
  - `admin` manages everything: listings, site settings, users.
  - `poster` can only create, edit, and mark listings sold.
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
`@vercel/speed-insights`, `server-only`, `tsx`, `supabase` CLI. No VIN barcode scanning (by
decision) — VINs are typed.

## Folder layout

```
app/
  layout.tsx          Root layout (Inter font, metadata)
  globals.css         Theme tokens (brand color, grays)
  (public)/           Buyer site: home, inventory, inventory/[slug], about, contact
  not-found.tsx       Site-wide 404 (with public header/footer)
  (staff)/admin/      Staff area (noindex; toast container)
    auth/confirm/     Email-link callback (magic link, password reset)
    auth/signout/     Signs out; used when a profile is missing/inactive
    (auth)/           Public: login, forgot-password; reset-password (needs session)
    (app)/            Signed-in staff: top bar + bottom tabs / sidebar
      vehicles/       List (status chips, search), new, [id] edit; actions.ts = all vehicle/photo server actions
    api/vin/[vin]/    Staff-only NHTSA vPIC lookup (prefill)
      (admin-only)/   Admin-only pages (settings, users) — default home for new pages
components/
  ui/                 shadcn/ui components (generated; edit sparingly)
  public/             Buyer-site components (cards, filters, gallery, share, action bar)
  staff/              Staff-area components
    vehicle-form/     Posting form: photo-manager (upload queue, dnd reorder), photo-upload (compress + XHR upload)
lib/
  nhtsa.ts            VIN decode + mapping to our enums (server only)
  vehicle-options.ts  Feature checklist, color chips, description template
  public-data.ts      ALL public-site queries (cookie-free anon client) + photoUrl()
  format.ts           Price/mileage formatting, enum labels, tel:/sms: hrefs
  auth.ts             getStaff(), requireStaff(), requireAdmin() — server only
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
supabase/
  migrations/         SQL migrations (never edit one that has been pushed; add a new one)
  seed.sql            DEV ONLY: 6 sample vehicles (fixed ids a0000000-…)
  unseed.sql          Removes the sample data before launch
  config.toml         Supabase CLI config
tests/e2e/            Playwright smoke tests
```

## Public site

- Public pages read data only through `lib/public-data.ts` (anon client, never cookies), so
  they see exactly what a visitor sees and can be cached. Home/about/contact and vehicle pages
  use `revalidate = 300`; `/inventory` is dynamic (filters in the URL).
- Staff edits (later stages) must call `revalidatePath` for `/`, `/inventory/[slug]` etc.
- Inventory filters are plain GET forms with native `<select>`s; every filter lives in the
  URL (`make`, `model`, `year_min/max`, `price_min/max`, `mileage_max`, `body`, `drivetrain`,
  `fuel`, `sort`, `page`), validated by `lib/validation/inventory.ts` (bad values ignored).
- Images: `next/image` with the Supabase bucket in `images.remotePatterns`; always pass `sizes`.
  Photo cards and galleries are 4:3 `object-cover`.
- `site_settings.hours` format: `[{ "days": "Mon–Fri", "hours": "9:00 AM – 6:00 PM" }]`.
- Hero image: `public/hero.jpg` (CC0 placeholder, see `public/CREDITS.md`).

## Staff posting tool (Stage 4)

- VINs are typed (no barcode scanning, no check-digit validation — by decision). `normalizeVin`
  uppercases and maps O/Q→0, I→1. NHTSA prefill only fills empty fields.
- Drafts may lack details; the DB check `vehicles_listed_requires_details` requires VIN, year,
  make, model, price, mileage once not a draft. "≥1 photo to publish" is enforced in the server
  actions. Only admins can change `featured` (DB trigger + action).
- Photos: compressed in the browser (1920px, WebP; JPEG where the browser can't encode WebP,
  e.g. Safari). Canvas re-encode strips EXIF/GPS. Uploaded by XHR with the user's session (for
  progress), 3 at a time, then recorded via `addPhoto`. Max 40. Worker script is self-hosted at
  `public/vendor/browser-image-compression-2.0.2.js` — update it with the package.
- New vehicle: the draft row is created on the first photo or first save. The URL stays
  `/admin/vehicles/new` until an explicit Save/Publish: server actions refresh the _current URL_,
  and switching to `[id]` mid-edit would remount the form and drop uploads.
- Autosave every 10s for drafts only; listed cars use "Save changes" (never auto-publish edits).
- Every vehicle/photo change calls `revalidatePath` for `/`, `/inventory`, `/inventory/[slug]`.
- Deleting a vehicle removes its storage files first (admin only).
- E2E tests create/delete their own poster user and vehicles; they need `SUPABASE_SECRET_KEY`.
- Next 16: use `preload` / `loading="eager"` on images, not the deprecated `priority`.

## Theme

- Brand accent: `--brand` (`#b91c1c`) in `app/globals.css`, mapped to shadcn's `--primary` and
  `--ring`. Use `bg-primary` / `text-brand` rather than hard-coded colors.
- Neutral grays from shadcn's `neutral` base. Inter via `next/font`.
- Light mode only. Do not add a `.dark` class or dark palette.

## Commands

- `pnpm dev`, `pnpm build`
- `pnpm lint`, `pnpm typecheck`, `pnpm format`
- `pnpm test:e2e` (starts the dev server; runs at 360px and desktop)
- `pnpm db:push` apply new migrations to the linked Supabase project
- `pnpm db:types` regenerate `lib/database.types.ts` after any schema change
- `pnpm db:seed-photos [--remove]` upload/remove placeholder photos for the seed vehicles

## Security

Roles live in `profiles.role` (`admin` | `poster`). `private.is_staff()` / `private.is_admin()` (not exposed via the API) require
`profiles.active = true`, so deactivating a profile revokes access immediately.

| Who                    | vehicles                                     | vehicle_photos + storage files     | profiles           | site_settings |
| ---------------------- | -------------------------------------------- | ---------------------------------- | ------------------ | ------------- |
| Public (anon)          | Read available / pending / sold (not drafts) | Read photos of those; files by URL | —                  | Read          |
| Poster (active)        | Read all, create, edit (incl. mark sold)     | Read, add, edit, delete            | Read own row       | Read          |
| Admin (active)         | Everything posters can + delete              | Same as poster                     | Read all, edit all | Read, edit    |
| Inactive / other users | Same as public                               | Same as public                     | Read own row       | Read          |

- Nobody can change their own `role` or `active` (trigger). The first admin is created with
  `pnpm tsx scripts/create-admin.ts` (or in the SQL editor).
- Public sign-ups are disabled; staff are invited by an admin. New auth users get a `poster`
  profile automatically — role is never taken from user metadata.
- `stock_no`, `slug` (after first publish), `published_at`, `sold_at`, `created_by`, `created_at`
  and `updated_at` are set by triggers; client values are ignored.
- Storage bucket `vehicle-photos` is public-read by URL but not listable. Uploads must be
  `{vehicle_id}/{file}` for an existing vehicle, webp or jpeg, max 5 MB.
- Deleting a vehicle cascades its photo rows but NOT the storage files — delete those first.
- The secret key (`SUPABASE_SECRET_KEY`) bypasses all of the above. Only use it in local scripts
  or server-only code that has already checked the user is an admin.

### Staff auth (app layer)

Three layers, all required:

1. `proxy.ts` — signed-out requests to `/admin/**` go to `/admin/login` (except `/admin/login`,
   `/admin/forgot-password`, `/admin/auth/*`). Optimistic only.
2. **Every** staff page and server action starts with `await requireStaff()` or
   `await requireAdmin()` from `lib/auth.ts`. Layouts also call them, but a layout check does not
   protect its pages or actions. Missing/inactive profile -> signed out, "Your account is disabled."
   Poster on an admin page -> `/admin?denied=1` (toast).
3. RLS in the database is the final guard.

Posters may only use `/admin` and `/admin/vehicles/**`. Put every other staff page in
`app/(staff)/admin/(app)/(admin-only)/` and call `requireAdmin()` in it.

Email links use Supabase's token-hash templates -> `/admin/auth/confirm` (works across devices).
Email forms never reveal whether an account exists.

## Rules

- Mobile-first; test layouts at 360px wide
- Server Components by default; `"use client"` only when needed
- All data access goes through Supabase with RLS; never use the secret key (`sb_secret_…`, formerly "service role") in client code
- Validate every form with Zod on both client and server
- Run `pnpm lint` and `pnpm typecheck` before saying a task is done
- Keep it simple: no features beyond the current stage's prompt

@AGENTS.md
