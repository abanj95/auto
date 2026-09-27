-- Vehicle listings.

create type public.vehicle_body_type as enum (
  'sedan', 'suv', 'truck', 'coupe', 'hatchback', 'van', 'wagon', 'convertible', 'other'
);
create type public.vehicle_transmission as enum ('automatic', 'manual', 'cvt');
create type public.vehicle_drivetrain as enum ('fwd', 'rwd', 'awd', '4wd');
create type public.vehicle_fuel_type as enum ('gas', 'diesel', 'hybrid', 'electric', 'other');
create type public.vehicle_title_status as enum ('clean', 'rebuilt', 'salvage', 'other');
create type public.vehicle_status as enum ('draft', 'available', 'pending', 'sold');

create sequence public.vehicle_stock_no_seq;

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  stock_no text not null unique
    default ('MC-' || lpad(nextval('public.vehicle_stock_no_seq')::text, 4, '0')),
  -- Real VINs are 17 characters and never contain I, O or Q.
  vin text unique check (vin ~ '^[A-HJ-NPR-Z0-9]{17}$'),

  year int not null check (year between 1900 and 2100),
  make text not null check (length(trim(make)) > 0),
  model text not null check (length(trim(model)) > 0),
  trim text,
  body_type public.vehicle_body_type,

  mileage int check (mileage >= 0),
  -- Whole dollars; the all-in price including dealer fees.
  price int check (price >= 0),

  exterior_color text,
  interior_color text,
  engine text,
  transmission public.vehicle_transmission,
  drivetrain public.vehicle_drivetrain,
  fuel_type public.vehicle_fuel_type,
  title_status public.vehicle_title_status,
  features text[] not null default '{}',
  description text,

  status public.vehicle_status not null default 'draft',
  featured boolean not null default false,
  slug text not null unique,

  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  sold_at timestamptz
);

comment on column public.vehicles.price is 'Whole dollars, all-in price including dealer fees.';
comment on column public.vehicles.slug is 'year-make-model-trim-stock_no. Rebuilt while a draft; frozen once first published.';

create index vehicles_status_idx on public.vehicles (status);
create index vehicles_make_idx on public.vehicles (make);
create index vehicles_model_idx on public.vehicles (model);
create index vehicles_year_idx on public.vehicles (year);
create index vehicles_price_idx on public.vehicles (price);
create index vehicles_mileage_idx on public.vehicles (mileage);
create index vehicles_body_type_idx on public.vehicles (body_type);
create index vehicles_created_at_idx on public.vehicles (created_at);
create index vehicles_created_by_idx on public.vehicles (created_by);

-- "2021 Honda CR-V EX-L MC-0007" -> "2021-honda-cr-v-ex-l-mc-0007"
create function public.slugify(value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(both '-' from regexp_replace(lower(coalesce(value, '')), '[^a-z0-9]+', '-', 'g'));
$$;

-- Keeps derived and system-managed columns correct on every write.
create function public.vehicles_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.vin := nullif(upper(trim(new.vin)), '');

  if tg_op = 'UPDATE' then
    -- Never editable after creation.
    new.stock_no := old.stock_no;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    -- Managed below; ignore values sent by the client.
    new.published_at := old.published_at;
    new.sold_at := old.sold_at;
    new.updated_at := now();
  end if;

  -- Rebuild the slug until the listing is first published, then freeze it so
  -- shared links keep working.
  if tg_op = 'INSERT' or (old.status = 'draft' and old.published_at is null) then
    new.slug := public.slugify(
      concat_ws(' ', new.year, new.make, new.model, new.trim, new.stock_no)
    );
  else
    new.slug := old.slug;
  end if;

  if new.status = 'available' and new.published_at is null then
    new.published_at := now();
  end if;

  if new.status = 'sold' then
    if tg_op = 'INSERT' then
      new.sold_at := coalesce(new.sold_at, now());
    elsif old.status <> 'sold' then
      new.sold_at := now();
    end if;
  else
    new.sold_at := null;
  end if;

  return new;
end;
$$;

create trigger vehicles_before_write
  before insert or update on public.vehicles
  for each row execute function public.vehicles_before_write();
