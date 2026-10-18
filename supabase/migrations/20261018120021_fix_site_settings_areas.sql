-- Fix 020: protect_site_settings_areas used `jsonb - jsonb`, which doesn't
-- exist, so every site_settings update by a signed-in user failed. Compare the
-- homepage keys one by one instead.

create or replace function public.protect_site_settings_areas()
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
  -- Settings fields: everything except the homepage keys.
  if (v_new - homepage_keys) is distinct from (v_old - homepage_keys)
     and not (select private.has_permission('settings')) then
    raise exception 'You need Settings access to change these fields' using errcode = '42501';
  end if;
  -- Homepage fields.
  if exists (
       select 1 from unnest(homepage_keys) as k
        where v_new -> k is distinct from v_old -> k
     )
     and not (select private.has_permission('homepage')) then
    raise exception 'You need Homepage access to change these fields' using errcode = '42501';
  end if;
  return new;
end;
$$;
