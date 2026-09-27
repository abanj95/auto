-- Stage 5: posters may delete whole vehicles too (decided by the owner).
-- Inactive users still can't (is_staff() requires an active profile).
drop policy "Admins can delete vehicles" on public.vehicles;

create policy "Staff can delete vehicles"
  on public.vehicles for delete
  to authenticated
  using ((select private.is_staff()));
