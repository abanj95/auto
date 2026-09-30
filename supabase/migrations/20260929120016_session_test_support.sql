-- Lets automated tests prove the idle / 12-hour limits are enforced on the
-- server without waiting 30 minutes: ages a user's staff sessions. Secret key
-- (service_role) only — that role can already do anything, so this adds no access.
create function public.admin_age_staff_sessions(p_user_id uuid, p_idle_seconds integer, p_age_seconds integer)
returns void
language sql
security definer
set search_path = ''
as $$
  update private.staff_sessions
     set last_seen_at = last_seen_at - make_interval(secs => p_idle_seconds),
         signed_in_at = signed_in_at - make_interval(secs => p_age_seconds)
   where user_id = p_user_id and ended_at is null;
$$;

revoke all on function public.admin_age_staff_sessions(uuid, integer, integer)
  from public, anon, authenticated;
grant execute on function public.admin_age_staff_sessions(uuid, integer, integer) to service_role;
