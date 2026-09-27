-- Removes the sample data from supabase/seed.sql. Run once before launch,
-- AFTER `pnpm db:seed-photos --remove` (which deletes the image files and needs
-- the photo rows to still exist).
--
-- Run in the Supabase dashboard SQL editor, or:
--   pnpm supabase db query --linked -f supabase/unseed.sql

-- Photo rows are removed by the on delete cascade.
delete from public.vehicles
where id::text like 'a0000000-0000-4000-8000-%';

-- If no real vehicles exist yet, start stock numbers again from MC-0001.
select setval('public.vehicle_stock_no_seq', 1, false)
where not exists (select 1 from public.vehicles);
