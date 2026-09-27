-- The vehicles_before_write trigger always sets slug; the default only lets
-- inserts omit it (and keeps generated insert types honest).
alter table public.vehicles alter column slug set default '';
