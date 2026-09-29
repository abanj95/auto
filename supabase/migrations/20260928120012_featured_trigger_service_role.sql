-- Fix: protect_vehicle_featured referenced private.is_admin() inside a single
-- AND expression. Postgres doesn't guarantee short-circuit evaluation there, so
-- inserts by the secret-key role (service_role, which has no USAGE on schema
-- private) could fail with "permission denied for schema private".
-- Nest the checks so is_admin() is only reached for signed-in users.
create or replace function public.protect_vehicle_featured()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- auth.uid() is null for the SQL editor / secret-key jobs: allowed.
  if (select auth.uid()) is null then
    return new;
  end if;

  if new.featured is distinct from (case when tg_op = 'UPDATE' then old.featured else false end) then
    if not (select private.is_admin()) then
      raise exception 'Only admins can change featured' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;
