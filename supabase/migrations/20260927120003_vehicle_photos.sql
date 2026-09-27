-- Photos for a vehicle. The photo with the lowest sort_order is the cover.

create table public.vehicle_photos (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  -- Path inside the 'vehicle-photos' bucket: {vehicle_id}/{uuid}.webp
  storage_path text not null unique check (storage_path like vehicle_id::text || '/%'),
  width int check (width > 0),
  height int check (height > 0),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index vehicle_photos_vehicle_id_sort_order_idx
  on public.vehicle_photos (vehicle_id, sort_order);
