-- KRV-style updates:
--   1. Vehicle Finder: vehicle_requests (admin-only; the server inserts after its checks).
--   2. Homepage: welcome subheading, quick-link tile labels, featured-row toggle.
--   3. Terms of Use / Privacy Policy as markdown in site_settings, with "last updated" dates.

-- ------------------------------------------------------------------ 1. vehicle requests

create type public.vehicle_request_status as enum ('new', 'contacted', 'found', 'closed');

create table public.vehicle_requests (
  id uuid primary key default gen_random_uuid(),
  -- Your details
  first_name text not null check (length(first_name) between 1 and 60),
  last_name text not null check (length(last_name) between 1 and 60),
  phone text not null check (length(phone) between 1 and 20),
  email text not null check (length(email) between 3 and 254),
  phone2 text check (length(phone2) <= 20),
  best_time text check (best_time in ('morning', 'afternoon', 'evening', 'any')),
  preferred_contact text check (preferred_contact in ('call', 'text', 'email')),
  -- Vehicle wanted
  year_from integer check (year_from between 1950 and 2100),
  year_to integer check (year_to between 1950 and 2100),
  make text check (length(make) <= 40),
  model text check (length(model) <= 60),
  engine text check (length(engine) <= 60),
  max_mileage integer check (max_mileage > 0), -- null = any
  budget_min integer check (budget_min >= 0),
  budget_max integer check (budget_max >= 0),
  body_type public.vehicle_body_type,
  notes text check (length(notes) <= 1000),
  consent boolean not null check (consent),
  -- Admin
  status public.vehicle_request_status not null default 'new',
  admin_notes text check (length(admin_notes) <= 4000),
  -- HMAC of the submitter's IP (never the raw address).
  ip_hash text check (length(ip_hash) <= 128),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicle_requests_years check (year_from is null or year_to is null or year_from <= year_to),
  constraint vehicle_requests_budget check (budget_min is null or budget_max is null or budget_min <= budget_max)
);
comment on table public.vehicle_requests is
  'Vehicle Finder submissions. Inserted by the server (secret key) after Turnstile, honeypot and rate-limit checks; admins read and manage them. Deleted 12 months after closing (daily cron).';

create index vehicle_requests_created_at_idx on public.vehicle_requests (created_at desc);
create index vehicle_requests_status_idx on public.vehicle_requests (status);
create index vehicle_requests_closed_at_idx on public.vehicle_requests (closed_at) where closed_at is not null;

/** updated_at, and closed_at: set when a request is closed, cleared when it's reopened. */
create function public.vehicle_requests_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.status = 'closed' then
    if tg_op = 'INSERT' or old.status is distinct from 'closed' then
      new.closed_at := now();
    end if;
  else
    new.closed_at := null;
  end if;
  return new;
end;
$$;

create trigger vehicle_requests_before_write
  before insert or update on public.vehicle_requests
  for each row execute function public.vehicle_requests_before_write();

alter table public.vehicle_requests enable row level security;

-- No access for visitors (not even insert: the server inserts with the secret key, so
-- nobody can skip Turnstile / rate limits by posting to the API directly).
revoke all on public.vehicle_requests from anon, authenticated;
grant select, delete on public.vehicle_requests to authenticated;
grant update (status, admin_notes) on public.vehicle_requests to authenticated;

create policy "Admins can view requests"
  on public.vehicle_requests for select
  to authenticated
  using ((select private.is_admin()));

create policy "Admins can edit requests"
  on public.vehicle_requests for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "Admins can delete requests"
  on public.vehicle_requests for delete
  to authenticated
  using ((select private.is_admin()));

-- ------------------------------------------------------------------ 2 + 3. site_settings

alter table public.site_settings
  add column finder_intro text not null
    default 'Don''t see what you''re looking for? Tell us what you want and we''ll search our sources for you. No obligation.'
    check (length(finder_intro) between 1 and 600),
  add column home_welcome_subheading text not null
    default 'Quality pre-owned vehicles, priced up front'
    check (length(home_welcome_subheading) between 1 and 120),
  add column tile_inventory_label text not null default 'View Inventory'
    check (length(tile_inventory_label) between 1 and 30),
  add column tile_finder_label text not null default 'Vehicle Finder'
    check (length(tile_finder_label) between 1 and 30),
  add column tile_visit_label text not null default 'Visit Us'
    check (length(tile_visit_label) between 1 and 30),
  add column tile_call_label text not null default 'Call Us'
    check (length(tile_call_label) between 1 and 30),
  add column show_featured_on_home boolean not null default false,
  add column terms_md text not null default '' check (length(terms_md) <= 50000),
  add column privacy_md text not null default '' check (length(privacy_md) <= 50000),
  add column terms_updated_at date not null default current_date,
  add column privacy_updated_at date not null default current_date;

/** Bump the "last updated" date whenever a legal page's text changes. */
create function public.site_settings_legal_dates()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.terms_md is distinct from old.terms_md then
    new.terms_updated_at := current_date;
  end if;
  if new.privacy_md is distinct from old.privacy_md then
    new.privacy_updated_at := current_date;
  end if;
  return new;
end;
$$;

create trigger site_settings_legal_dates
  before update on public.site_settings
  for each row execute function public.site_settings_legal_dates();

-- Starting drafts (placeholders in [brackets]; have a lawyer review before publishing).
update public.site_settings set
  terms_md = $terms$
## Agreement

These Terms of Use apply to this website, operated by [Business name] ("we", "us"). By using the site you agree to them. If you don't agree, please don't use the site.

## The website is provided "as is"

We work to keep the site accurate and available, but we provide it "as is" and "as available", without warranties of any kind. We don't promise that the site will always be available or free of errors.

## Vehicle information

Vehicle descriptions, photos, features, mileage and other details are accurate to the best of our knowledge, but mistakes can happen and details can change. Please confirm everything that matters to you with us, and inspect the vehicle, before you buy. A vehicle history report or an independent inspection is always a good idea.

## Availability

All vehicles are subject to prior sale. A vehicle shown on the site may already be sold or on hold.

## Prices

Listed prices include all dealer fees. They do not include sales tax, title and registration fees, which are added at the time of sale as required by law. Prices can change without notice, and we are not bound by a price shown in error.

## No warranty unless in writing

Unless we give you a written warranty, vehicles are sold as described in your purchase documents. Nothing on this website creates a warranty.

## Vehicle Finder

Submitting a Vehicle Finder request doesn't obligate you to buy, and it doesn't obligate us to find a vehicle. We'll contact you as described in our Privacy Policy.

## Links to other websites

The site may link to other websites, such as maps or social media. We don't control those sites and aren't responsible for their content or practices.

## Acceptable use

Please don't misuse the site: no attempts to break or overload it, to access areas you're not authorized to use, or to submit false information.

## Limitation of liability

To the fullest extent the law allows, we are not liable for any indirect or consequential damages arising from your use of the site.

## Governing law

These terms are governed by the laws of the State of [State], without regard to its conflict-of-law rules.

## Changes

We may update these terms from time to time. The date at the top of this page shows when they last changed.

## Contact us

[Business name]
[Address]
Email: [Contact email]
$terms$,
  privacy_md = $privacy$
This Privacy Policy explains what information [Business name] ("we", "us") collects through this website, why we collect it, and the choices you have.

## What we collect

- **Vehicle Finder requests.** When you ask us to find a vehicle, we collect your name, phone number(s), email address, the best time and way to contact you, and the details of the vehicle you're looking for.
- **When you contact us.** If you call, text or email us, we receive your phone number or email address and what you send us.
- **Basic analytics.** We use Vercel Web Analytics and Speed Insights to understand which pages are visited and how fast they load. These tools don't use cookies and don't identify you personally.
- **Server logs and security checks.** Like most websites, our hosting provider records technical information such as your IP address, browser type and the pages you request. We use Cloudflare Turnstile to block spam on our forms. We store only a scrambled (hashed) version of your IP address with a Vehicle Finder request, to prevent abuse.

## Why we use it

- To respond to your request and help you find a vehicle.
- To contact you the way you asked us to.
- To keep the website secure and prevent spam and abuse.
- To understand how the site is used and improve it.

## Who we share it with

We share information only with the service providers that help us run this website and respond to you: our website hosting and database providers, our email provider (which delivers request notifications to us), and our spam-protection provider. They may use it only to provide their services to us.

**We do not sell your personal information**, and we don't share it with third parties for their own marketing.

## Phone and text messages

If you submit a Vehicle Finder request and agree to be contacted, we may call, text or email you about your request. Message and data rates may apply. You can opt out of texts at any time by replying **STOP**, or by emailing us at [Contact email].

## How long we keep it

Vehicle Finder requests are deleted 12 months after we close them. Server logs and analytics are kept by our providers for a limited time under their own policies.

## Your choices and rights

You can ask us to show you, correct or delete the personal information we hold about you. Email us at [Contact email] and we'll respond within a reasonable time.

## Children's privacy

This website is not intended for children under 13, and we don't knowingly collect personal information from children.

## Cookies

This website uses only essential cookies, and only in the staff sign-in area. The public website does not set cookies. If you switch between list and grid views on our inventory page, your browser remembers that choice locally; it isn't sent to us.

## Changes to this policy

If we change this policy, we'll post the new version on this page and update the date at the top.

## Contact us

[Business name]
[Address]
Email: [Contact email]
$privacy$;
