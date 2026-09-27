-- Dealership-wide settings. Exactly one row (id is always true).

create table public.site_settings (
  id boolean primary key default true check (id),
  dealership_name text not null default 'McRowin Auto',
  phone text,
  sms_phone text,
  address text,
  city text,
  state text,
  zip text,
  hours jsonb not null default '[]'::jsonb,
  about_text text,
  price_disclaimer text not null
    default 'Price includes all dealer fees. Excludes tax, title and registration.',
  facebook_url text,
  google_maps_url text
);

insert into public.site_settings default values;
