-- DEVELOPMENT ONLY: 6 sample vehicles with placeholder photo rows.
-- Remove before launch with supabase/unseed.sql + `pnpm db:seed-photos --remove`.
-- Fixed ids (a0000000-… vehicles, b0000000-… photos) so they are easy to find and delete.
-- The image files are uploaded separately by `pnpm db:seed-photos`.

insert into public.vehicles (
  id, vin, year, make, model, trim, body_type, mileage, price,
  exterior_color, interior_color, engine, transmission, drivetrain, fuel_type, title_status,
  features, description, status, featured, created_at, published_at, sold_at
) values
(
  'a0000000-0000-4000-8000-000000000001', '4T1B11HK5KU123456',
  2019, 'Toyota', 'Camry', 'SE', 'sedan', 58420, 19995,
  'Celestial Silver', 'Black', '2.5L 4-cylinder', 'automatic', 'fwd', 'gas', 'clean',
  array['Backup camera', 'Apple CarPlay', 'Android Auto', 'Adaptive cruise control', 'Lane departure alert', 'Bluetooth'],
  'One-owner Camry SE with a clean history. Sporty trim, great fuel economy and Toyota Safety Sense. Fresh oil change and new wiper blades.',
  'available', true, now() - interval '20 days', now() - interval '19 days', null
),
(
  'a0000000-0000-4000-8000-000000000002', '7FARW2H86JE012345',
  2018, 'Honda', 'CR-V', 'EX-L', 'suv', 71300, 21450,
  'Modern Steel Metallic', 'Gray Leather', '1.5L turbo 4-cylinder', 'cvt', 'awd', 'gas', 'clean',
  array['Leather seats', 'Heated front seats', 'Sunroof', 'Power liftgate', 'Backup camera', 'Apple CarPlay'],
  'Well-kept CR-V EX-L with all-wheel drive, leather and a power moonroof. Plenty of room for the family and cargo.',
  'available', true, now() - interval '14 days', now() - interval '13 days', null
),
(
  'a0000000-0000-4000-8000-000000000003', '1FTEW1EP7HFA12345',
  2017, 'Ford', 'F-150', 'XLT SuperCrew', 'truck', 96800, 26900,
  'Oxford White', 'Medium Earth Gray', '2.7L EcoBoost V6', 'automatic', '4wd', 'gas', 'clean',
  array['Tow package', 'Bed liner', 'Backup camera', 'Remote start', 'Running boards', 'Bluetooth'],
  'Work-ready F-150 XLT with 4x4 and the towing package. Crew cab seats five comfortably.',
  'available', false, now() - interval '9 days', now() - interval '8 days', null
),
(
  'a0000000-0000-4000-8000-000000000004', '5N1AT2MV8LC123456',
  2020, 'Nissan', 'Rogue', 'SV AWD', 'suv', 44150, 18750,
  'Gun Metallic', 'Charcoal Cloth', '2.5L 4-cylinder', 'cvt', 'awd', 'gas', 'clean',
  array['Blind spot warning', 'Automatic emergency braking', 'Heated front seats', 'Apple CarPlay', 'Backup camera'],
  'Low-mileage Rogue SV with ProPILOT-ready safety features. Sale pending.',
  'pending', false, now() - interval '12 days', now() - interval '11 days', null
),
(
  'a0000000-0000-4000-8000-000000000005', '1G1ZE5ST9GF123456',
  2016, 'Chevrolet', 'Malibu', 'LT', 'sedan', 88000, 11995,
  'Summit White', 'Jet Black', '1.5L turbo 4-cylinder', 'automatic', 'fwd', 'gas', 'clean',
  array['Backup camera', 'Remote start', 'Bluetooth', 'Keyless entry'],
  'Reliable commuter with great mileage. Sold — thank you!',
  'sold', false, now() - interval '30 days', now() - interval '29 days', now() - interval '7 days'
),
(
  'a0000000-0000-4000-8000-000000000006', '1C4BJWEG5FL123456',
  2015, 'Jeep', 'Wrangler Unlimited', 'Sahara', 'suv', 102500, 22500,
  'Firecracker Red', 'Black', '3.6L V6', 'manual', '4wd', 'gas', 'rebuilt',
  array['Removable hard top', 'Tow hitch', 'Navigation', 'Alloy wheels'],
  'Draft listing — photos and description still in progress.',
  'draft', false, now() - interval '1 day', null, null
);

-- 3 photos per listed vehicle, 1 for the draft. sort_order 0 is the cover.
insert into public.vehicle_photos (id, vehicle_id, storage_path, width, height, sort_order)
select
  photo_id,
  vehicle_id,
  vehicle_id::text || '/' || photo_id::text || '.webp',
  1600,
  1200,
  n - 1
from (
  select
    v.id as vehicle_id,
    n,
    ('b0000000-0000-4000-8000-' || lpad((right(v.id::text, 1)::int * 10 + n)::text, 12, '0'))::uuid
      as photo_id
  from public.vehicles v
  cross join generate_series(1, 3) as n
  where v.id::text like 'a0000000-0000-4000-8000-%'
    and (v.status <> 'draft' or n = 1)
) as photos;
