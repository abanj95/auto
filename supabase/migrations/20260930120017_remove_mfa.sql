-- Two-factor removed (by decision). The role helpers no longer require the JWT's
-- aal = aal2; an active profile and a live staff session are still required.
-- Replacing in place keeps the function ids, so every policy picks this up.

create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
      select 1 from public.profiles
       where id = (select auth.uid()) and active
    )
    and private.session_is_live();
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
      select 1 from public.profiles
       where id = (select auth.uid()) and active and role = 'admin'
    )
    and private.session_is_live();
$$;
