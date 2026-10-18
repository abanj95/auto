-- Posters may now manage Vehicle Finder requests, the homepage editor and site
-- settings (by decision). Users, the activity log and `featured` stay admin-only.

-- ------------------------------------------------------------------ site_settings

drop policy "Admins can edit site settings" on public.site_settings;
create policy "Staff can edit site settings"
  on public.site_settings for update
  to authenticated
  using ((select private.is_staff()))
  with check ((select private.is_staff()));

-- ------------------------------------------------------------------ hero_slides

drop policy "Signed-in users can view live slides; admins can view all" on public.hero_slides;
create policy "Signed-in users can view live slides; staff can view all"
  on public.hero_slides for select
  to authenticated
  using (
    (
      active
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at > now())
    )
    or (select private.is_staff())
  );

drop policy "Admins can add slides" on public.hero_slides;
create policy "Staff can add slides"
  on public.hero_slides for insert
  to authenticated
  with check ((select private.is_staff()));

drop policy "Admins can edit slides" on public.hero_slides;
create policy "Staff can edit slides"
  on public.hero_slides for update
  to authenticated
  using ((select private.is_staff()))
  with check ((select private.is_staff()));

drop policy "Admins can delete slides" on public.hero_slides;
create policy "Staff can delete slides"
  on public.hero_slides for delete
  to authenticated
  using ((select private.is_staff()));

-- ------------------------------------------------------------------ site-images files
-- (Uploads still only go through the server route; these cover reading and
-- deleting unused files from the homepage editor.)

drop policy "Admins can view site image files" on storage.objects;
create policy "Staff can view site image files"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'site-images' and (select private.is_staff()));

drop policy "Admins can delete site image files" on storage.objects;
create policy "Staff can delete site image files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'site-images' and (select private.is_staff()));

-- ------------------------------------------------------------------ vehicle_requests

drop policy "Admins can view requests" on public.vehicle_requests;
create policy "Staff can view requests"
  on public.vehicle_requests for select
  to authenticated
  using ((select private.is_staff()));

drop policy "Admins can edit requests" on public.vehicle_requests;
create policy "Staff can edit requests"
  on public.vehicle_requests for update
  to authenticated
  using ((select private.is_staff()))
  with check ((select private.is_staff()));

drop policy "Admins can delete requests" on public.vehicle_requests;
create policy "Staff can delete requests"
  on public.vehicle_requests for delete
  to authenticated
  using ((select private.is_staff()));

comment on table public.vehicle_requests is
  'Vehicle Finder submissions. Inserted by the server (secret key) after Turnstile, honeypot and rate-limit checks; staff read and manage them. Deleted 12 months after closing (daily cron).';
