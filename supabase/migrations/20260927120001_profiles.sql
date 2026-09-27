-- Staff profiles, one per auth user, plus the role helpers used by RLS policies.

create type public.user_role as enum ('admin', 'poster');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role public.user_role not null default 'poster',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Staff accounts. role and active control access via is_staff() / is_admin().';

-- Create a profile whenever an auth user is created (e.g. an admin invites someone).
-- Role is never read from user metadata, which the user controls.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Role helpers. security definer so they can read profiles without tripping
-- over profiles' own RLS; both require an active profile.
create function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and active
  );
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and active and role = 'admin'
  );
$$;

-- Nobody can change their own role or active flag (stops an admin locking
-- themselves out), and id / created_at never change.
-- auth.uid() is null in the SQL editor, so the first admin can be set there.
create function public.protect_profile_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id or new.created_at is distinct from old.created_at then
    raise exception 'id and created_at cannot be changed' using errcode = '42501';
  end if;

  if old.id = (select auth.uid())
     and (new.role is distinct from old.role or new.active is distinct from old.active) then
    raise exception 'You cannot change your own role or active status' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger protect_profile_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();
