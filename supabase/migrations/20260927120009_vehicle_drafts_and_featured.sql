-- Stage 4 (staff posting tool):
-- 1. A draft can exist before its details are known (it is created on the first
--    photo or first save). Year/make/model become optional for drafts only.
-- 2. Anything that is not a draft must have the details buyers rely on.
--    (At least one photo is enforced by the server actions.)
-- 3. Only admins may change `featured`.

alter table public.vehicles
  alter column year drop not null,
  alter column make drop not null,
  alter column model drop not null;

alter table public.vehicles
  add constraint vehicles_listed_requires_details check (
    status = 'draft'
    or (
      vin is not null and year is not null and make is not null and model is not null
      and price is not null and mileage is not null
    )
  );

create function public.protect_vehicle_featured()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- auth.uid() is null for the SQL editor / secret-key scripts: allowed.
  if (select auth.uid()) is not null
     and new.featured is distinct from (case when tg_op = 'UPDATE' then old.featured else false end)
     and not (select private.is_admin()) then
    raise exception 'Only admins can change featured' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger protect_vehicle_featured
  before insert or update of featured on public.vehicles
  for each row execute function public.protect_vehicle_featured();
