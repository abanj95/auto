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

Also installed for later stages: `@zxing/browser` + `@zxing/library` (VIN barcode scan),
`browser-image-compression` (photo uploads), `@dnd-kit/*` (photo reordering), `sonner` (toasts),
`@vercel/analytics`, `@vercel/speed-insights`, `server-only`, `tsx`, `supabase` CLI.

## Folder layout

```
app/
  layout.tsx          Root layout (Inter font, metadata)
  globals.css         Theme tokens (brand color, grays)
  (public)/           Buyer site
  (staff)/admin/      Staff area (noindex; toast container)
    auth/confirm/     Email-link callback (magic link, password reset)
    auth/signout/     Signs out; used when a profile is missing/inactive
    (auth)/           Public: login, forgot-password; reset-password (needs session)
    (app)/            Signed-in staff: top bar + bottom tabs / sidebar
      (admin-only)/   Admin-only pages (settings, users) — default home for new pages
components/
  ui/                 shadcn/ui components (generated; edit sparingly)
  public/             Buyer-site components
  staff/              Staff-area components
lib/
  auth.ts             getStaff(), requireStaff(), requireAdmin() — server only
  auth-paths.ts       Staff route constants, public-path list, safe redirect helper
  database.types.ts   Generated DB types (`pnpm db:types`) — do not edit by hand
  supabase/
    server.ts         Server Components / Server Actions / Route Handlers
    client.ts         Client Components (browser)
    middleware.ts     Session refresh, called from proxy.ts
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
