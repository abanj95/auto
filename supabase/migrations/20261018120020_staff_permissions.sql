-- Per-user access for posters (replaces 019's "all staff"): admins tick
-- Requests / Homepage / Settings per poster on the Users page. Admins always
-- have everything. Users, the activity log and `featured` stay admin-only.

-- ------------------------------------------------------------------ profiles.permissions

alter table public.profiles
  add column permissions text[] not null default '{}'
    check (permissions <@ array['requests', 'homepage', 'settings']::text[]);
comment on column public.profiles.permissions is
  'Extra areas a poster may manage: requests, homepage, settings. Ignored for admins (they have all).';

/** Admins: always. Posters: only areas ticked on the Users page. Needs a live staff session. */
create function private.has_permission(p_area text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
      select 1 from public.profiles
       where id = (select auth.uid())
         and active
         and (role = 'admin' or p_area = any (permissions))
    )
    and private.session_is_live();
$$;
revoke all on function private.has_permission(text) from public, anon;
grant execute on function private.has_permission(text) to authenticated;

-- Nobody changes their own permissions either (same rule as role / active).
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id or new.created_at is distinct from old.created_at then
    raise exception 'id and created_at cannot be changed' using errcode = '42501';
  end if;

  if old.id = (select auth.uid())
     and (new.role is distinct from old.role
          or new.active is distinct from old.active
          or new.permissions is distinct from old.permissions) then
    raise exception 'You cannot change your own role, access or active status' using errcode = '42501';
  end if;

  return new;
end;
$$;

-- ------------------------------------------------------------------ site_settings
-- One row holds both Settings and Homepage fields: the policy lets in anyone
-- with either area, and a trigger checks which fields actually changed.

drop policy "Staff can edit site settings" on public.site_settings;
create policy "Staff with Settings or Homepage access can edit site settings"
  on public.site_settings for update
  to authenticated
  using ((select private.has_permission('settings')) or (select private.has_permission('homepage')))
  with check ((select private.has_permission('settings')) or (select private.has_permission('homepage')));

create function public.protect_site_settings_areas()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  homepage_keys text[] := array[
    'hero_autoplay', 'hero_interval_seconds', 'home_welcome_subheading',
    'tile_inventory_label', 'tile_finder_label', 'tile_visit_label', 'tile_call_label',
    'show_featured_on_home', 'logo_path', 'logo_dark_path', 'favicon_path',
    'about_image_path', 'og_default_image_path'
  ];
  -- Kept up to date by triggers, not by people.
  managed_keys text[] := array['terms_updated_at', 'privacy_updated_at'];
  v_new jsonb := to_jsonb(new) - managed_keys;
  v_old jsonb := to_jsonb(old) - managed_keys;
begin
  -- SQL editor / secret-key jobs: allowed.
  if (select auth.uid()) is null then
    return new;
  end if;
  if (v_new - homepage_keys) is distinct from (v_old - homepage_keys)
     and not (select private.has_permission('settings')) then
    raise exception 'You need Settings access to change these fields' using errcode = '42501';
  end if;
  if (v_new - (v_new - homepage_keys)) is distinct from (v_old - (v_old - homepage_keys))
     and not (select private.has_permission('homepage')) then
    raise exception 'You need Homepage access to change these fields' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- Named to run before site_settings_legal_dates (triggers fire in name order).
create trigger protect_site_settings_areas
  before update on public.site_settings
  for each row execute function public.protect_site_settings_areas();

-- ------------------------------------------------------------------ hero_slides

drop policy "Signed-in users can view live slides; staff can view all" on public.hero_slides;
create policy "Signed-in users can view live slides; homepage editors can view all"
  on public.hero_slides for select
  to authenticated
  using (
    (
      active
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at > now())
    )
    or (select private.has_permission('homepage'))
  );

drop policy "Staff can add slides" on public.hero_slides;
create policy "Homepage editors can add slides"
  on public.hero_slides for insert
  to authenticated
  with check ((select private.has_permission('homepage')));

drop policy "Staff can edit slides" on public.hero_slides;
create policy "Homepage editors can edit slides"
  on public.hero_slides for update
  to authenticated
  using ((select private.has_permission('homepage')))
  with check ((select private.has_permission('homepage')));

drop policy "Staff can delete slides" on public.hero_slides;
create policy "Homepage editors can delete slides"
  on public.hero_slides for delete
  to authenticated
  using ((select private.has_permission('homepage')));

-- ------------------------------------------------------------------ site-images files

drop policy "Staff can view site image files" on storage.objects;
create policy "Homepage editors can view site image files"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'site-images' and (select private.has_permission('homepage')));

drop policy "Staff can delete site image files" on storage.objects;
create policy "Homepage editors can delete site image files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'site-images' and (select private.has_permission('homepage')));

-- ------------------------------------------------------------------ vehicle_requests

drop policy "Staff can view requests" on public.vehicle_requests;
create policy "Staff with Requests access can view requests"
  on public.vehicle_requests for select
  to authenticated
  using ((select private.has_permission('requests')));

drop policy "Staff can edit requests" on public.vehicle_requests;
create policy "Staff with Requests access can edit requests"
  on public.vehicle_requests for update
  to authenticated
  using ((select private.has_permission('requests')))
  with check ((select private.has_permission('requests')));

drop policy "Staff can delete requests" on public.vehicle_requests;
create policy "Staff with Requests access can delete requests"
  on public.vehicle_requests for delete
  to authenticated
  using ((select private.has_permission('requests')));

comment on table public.vehicle_requests is
  'Vehicle Finder submissions. Inserted by the server (secret key) after Turnstile, honeypot and rate-limit checks; admins and posters with Requests access manage them. Deleted 12 months after closing (daily cron).';
