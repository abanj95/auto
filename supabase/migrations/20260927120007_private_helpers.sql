-- Fixes from `supabase db advisors`:
-- 1. Role helpers and the auth trigger function were callable via /rest/v1/rpc.
--    Move them to a schema the API does not expose. Policies reference
--    functions by id, so they keep working after the move.
-- 2. vehicles had two permissive SELECT policies for authenticated users;
--    use one policy per role instead.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

alter function public.is_staff() set schema private;
alter function public.is_admin() set schema private;
alter function public.handle_new_user() set schema private;

-- Only signed-in users' policies call the helpers; nobody calls the trigger directly.
revoke execute on function private.is_staff(), private.is_admin() from public, anon;
grant execute on function private.is_staff(), private.is_admin() to authenticated;
revoke execute on function private.handle_new_user() from public, anon, authenticated;

-- vehicles: one SELECT policy per role.
drop policy "Anyone can view listed vehicles" on public.vehicles;
drop policy "Staff can view all vehicles" on public.vehicles;

create policy "Visitors can view listed vehicles"
  on public.vehicles for select
  to anon
  using (status in ('available', 'pending', 'sold'));

create policy "Signed-in users can view listed vehicles; staff can view all"
  on public.vehicles for select
  to authenticated
  using (status in ('available', 'pending', 'sold') or (select private.is_staff()));
