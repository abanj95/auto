-- Public bucket for vehicle photos. Path: {vehicle_id}/{uuid}.webp
-- Public bucket = files are readable by URL without a policy. There is
-- deliberately no public SELECT policy, so visitors cannot list the bucket.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vehicle-photos', 'vehicle-photos', true, 5242880, array['image/webp', 'image/jpeg'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Staff need SELECT as well: the Storage API reads the object when deleting.
create policy "Staff can view vehicle photo files"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'vehicle-photos' and (select public.is_staff()));

-- Uploads must go in a folder named after an existing vehicle id.
create policy "Staff can upload vehicle photo files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'vehicle-photos'
    and (select public.is_staff())
    and array_length(storage.foldername(name), 1) = 1
    and exists (
      select 1 from public.vehicles v
      where v.id::text = (storage.foldername(name))[1]
    )
  );

create policy "Staff can delete vehicle photo files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'vehicle-photos' and (select public.is_staff()));
