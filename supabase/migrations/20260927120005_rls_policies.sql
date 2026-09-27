-- Row-level security and table privileges.
-- anon = public visitors; authenticated = signed-in users (checked further via
-- is_staff() / is_admin(), which also require an active profile).

alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.vehicle_photos enable row level security;
alter table public.site_settings enable row level security;

-- Explicit privileges instead of relying on Supabase's defaults. RLS then
-- decides which rows each role can touch.
revoke all on public.profiles, public.vehicles, public.vehicle_photos, public.site_settings
  from anon, authenticated;

grant select on public.vehicles, public.vehicle_photos, public.site_settings to anon;
grant select, insert, update, delete on public.vehicles, public.vehicle_photos to authenticated;
grant select, update on public.profiles, public.site_settings to authenticated;
grant usage on sequence public.vehicle_stock_no_seq to authenticated;

-- vehicles -----------------------------------------------------------------

create policy "Anyone can view listed vehicles"
  on public.vehicles for select
  to anon, authenticated
  using (status in ('available', 'pending', 'sold'));

create policy "Staff can view all vehicles"
  on public.vehicles for select
  to authenticated
  using ((select public.is_staff()));

create policy "Staff can add vehicles"
  on public.vehicles for insert
  to authenticated
  with check ((select public.is_staff()));

create policy "Staff can edit vehicles"
  on public.vehicles for update
  to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

create policy "Admins can delete vehicles"
  on public.vehicles for delete
  to authenticated
  using ((select public.is_admin()));

-- vehicle_photos -------------------------------------------------------------

-- The subquery is itself filtered by vehicles' RLS, so visitors see photos of
-- listed vehicles and staff see photos of every vehicle.
create policy "Anyone can view photos of visible vehicles"
  on public.vehicle_photos for select
  to anon, authenticated
  using (exists (select 1 from public.vehicles v where v.id = vehicle_id));

create policy "Staff can add photos"
  on public.vehicle_photos for insert
  to authenticated
  with check ((select public.is_staff()));

create policy "Staff can edit photos"
  on public.vehicle_photos for update
  to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

create policy "Staff can delete photos"
  on public.vehicle_photos for delete
  to authenticated
  using ((select public.is_staff()));

-- profiles -------------------------------------------------------------------
-- No insert/delete policies: rows are created by the auth trigger and removed
-- when the auth user is deleted. Own role/active changes are blocked by the
-- protect_profile_fields trigger.

create policy "Users can view their own profile; admins can view all"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy "Admins can edit profiles"
  on public.profiles for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- site_settings --------------------------------------------------------------

create policy "Anyone can view site settings"
  on public.site_settings for select
  to anon, authenticated
  using (true);

create policy "Admins can edit site settings"
  on public.site_settings for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
