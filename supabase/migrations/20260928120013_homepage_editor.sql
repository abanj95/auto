-- Homepage editor: hero slides, site images (logo, favicon, About photo,
-- share image) and carousel settings. Admins edit; everyone reads.
--
-- Image paths: a path starting with "/" is a static file shipped with the site
-- (only the seed values below); anything else is a file in the 'site-images'
-- bucket, e.g. slides/{uuid}.webp.

-- ------------------------------------------------------------------ hero_slides

create table public.hero_slides (
  id uuid primary key default gen_random_uuid(),
  image_path text not null check (length(image_path) between 1 and 300),
  image_width integer not null check (image_width > 0),
  image_height integer not null check (image_height > 0),
  headline text check (length(headline) <= 100),
  subheadline text check (length(subheadline) <= 200),
  button_label text check (length(button_label) <= 30),
  -- Internal links only: "/inventory?body=suv", "/inventory/2019-honda-cr-v-…".
  button_link text check (button_link ~ '^/([^/\\]|$)' and length(button_link) <= 300),
  text_position text not null default 'left' check (text_position in ('left', 'center')),
  overlay_strength text not null default 'dark' check (overlay_strength in ('none', 'light', 'dark')),
  sort_order integer not null default 0,
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hero_slides_button_complete
    check ((button_label is null) = (button_link is null)),
  constraint hero_slides_dates_ordered
    check (starts_at is null or ends_at is null or ends_at > starts_at)
);

comment on table public.hero_slides is 'Home page hero carousel. Edited by admins in /admin/homepage.';

create index hero_slides_sort_order_idx on public.hero_slides (sort_order);

create function public.hero_slides_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
  else
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger hero_slides_before_write
  before insert or update on public.hero_slides
  for each row execute function public.hero_slides_before_write();

alter table public.hero_slides enable row level security;

revoke all on public.hero_slides from anon, authenticated;
grant select on public.hero_slides to anon;
grant select, insert, update, delete on public.hero_slides to authenticated;

-- One SELECT policy per role (see migration 007).
create policy "Visitors can view live slides"
  on public.hero_slides for select
  to anon
  using (
    active
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
  );

create policy "Signed-in users can view live slides; admins can view all"
  on public.hero_slides for select
  to authenticated
  using (
    (
      active
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at > now())
    )
    or (select private.is_admin())
  );

create policy "Admins can add slides"
  on public.hero_slides for insert
  to authenticated
  with check ((select private.is_admin()));

create policy "Admins can edit slides"
  on public.hero_slides for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "Admins can delete slides"
  on public.hero_slides for delete
  to authenticated
  using ((select private.is_admin()));

-- ------------------------------------------------------------------ site_settings

-- Covered by the existing site_settings policies (anyone reads, admins update).
alter table public.site_settings
  add column logo_path text check (length(logo_path) <= 300),
  add column logo_dark_path text check (length(logo_dark_path) <= 300),
  add column favicon_path text check (length(favicon_path) <= 300),
  add column about_image_path text check (length(about_image_path) <= 300),
  add column og_default_image_path text check (length(og_default_image_path) <= 300),
  add column hero_autoplay boolean not null default true,
  add column hero_interval_seconds integer not null default 6
    check (hero_interval_seconds between 3 and 20);

-- ------------------------------------------------------------------ storage

-- Public bucket: files readable by URL. No public SELECT policy, so it can't be listed.
-- Folders: slides/, logos/ (SVG allowed here only), icons/, photos/.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-images', 'site-images', true, 8388608,
  array['image/webp', 'image/jpeg', 'image/png', 'image/svg+xml']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- The Storage API reads the object when deleting, so admins need SELECT too.
create policy "Admins can view site image files"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'site-images' and (select private.is_admin()));

create policy "Admins can upload site image files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'site-images'
    and (select private.is_admin())
    and array_length(storage.foldername(name), 1) = 1
    and (storage.foldername(name))[1] in ('slides', 'logos', 'icons', 'photos')
    and lower(storage.extension(name)) in ('webp', 'jpg', 'jpeg', 'png', 'svg')
    and (lower(storage.extension(name)) <> 'svg' or (storage.foldername(name))[1] = 'logos')
  );

create policy "Admins can delete site image files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'site-images' and (select private.is_admin()));

-- ------------------------------------------------------------------ seed

-- Keep the live site looking the same: the current hero and logo files.
insert into public.hero_slides
  (image_path, image_width, image_height, headline, subheadline, text_position, overlay_strength, sort_order)
select
  '/hero.jpg', 960, 640,
  'Like new, without the new price.',
  'Clean, inspected pre-owned cars, trucks and SUVs, priced up front with dealer fees included.',
  'left', 'dark', 0
where not exists (select 1 from public.hero_slides);

update public.site_settings
set logo_path = coalesce(logo_path, '/brand/logo-full.png'),
    logo_dark_path = coalesce(logo_dark_path, '/brand/logo-full-light.png')
where id;
