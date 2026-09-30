-- Security hardening (docs/security-audit.md).
--   1. Staff sessions: idle (30 min) and absolute (12 h) limits enforced in the database.
--   2. Role helpers require MFA (aal2) and a live staff session → every staff RLS rule does.
--   3. audit_log: insert-only activity log, readable by admins.
--   4. Rate limiting + login lockout (called by the server with the secret key).
--   5. Uploads only through the server (no browser writes to Storage); no SVG.
--   6. Insert-time vehicle fields can't be spoofed (L2); https-only social links (L3).
-- Role helper, session and limit functions live in `private` (not exposed by the API);
-- functions the app calls are in `public` with EXECUTE granted explicitly.

-- ------------------------------------------------------------------ 1. staff sessions

-- One row per Supabase session (the JWT's session_id). Written only by the
-- security definer functions below.
create table private.staff_sessions (
  session_id uuid primary key,
  user_id uuid not null,
  signed_in_at timestamptz not null,
  last_seen_at timestamptz not null,
  ended_at timestamptz,
  ended_reason text
);
create index staff_sessions_user_idx on private.staff_sessions (user_id);

-- Limits. Keep in sync with lib/session-limits.ts.
create function private.session_idle_limit() returns interval
language sql immutable set search_path = '' as $$ select interval '30 minutes' $$;
create function private.session_max_age() returns interval
language sql immutable set search_path = '' as $$ select interval '12 hours' $$;

/** When the current session signed in: the earliest auth method in the JWT's amr claim. */
create function private.session_signed_in_at() returns timestamptz
language sql stable set search_path = '' as $$
  select coalesce(
    (select min(to_timestamp((e ->> 'timestamp')::bigint))
       from jsonb_array_elements(coalesce((select auth.jwt()) -> 'amr', '[]'::jsonb)) e),
    now()
  )
$$;

/**
 * Called by the app on every staff request (and by the idle heartbeat).
 * Returns 'ok', 'idle', 'expired', 'ended' or 'none' (no session). Ends the
 * session on idle/expiry so it can't be revived.
 */
create function public.touch_staff_session()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sid uuid := nullif((select auth.jwt()) ->> 'session_id', '')::uuid;
  v_uid uuid := (select auth.uid());
  v_row private.staff_sessions;
begin
  if v_sid is null or v_uid is null then
    return 'none';
  end if;

  select * into v_row from private.staff_sessions where session_id = v_sid for update;
  if not found then
    insert into private.staff_sessions (session_id, user_id, signed_in_at, last_seen_at)
    values (v_sid, v_uid, private.session_signed_in_at(), now())
    returning * into v_row;
  end if;

  if v_row.user_id <> v_uid or v_row.ended_at is not null then
    return 'ended';
  end if;
  if now() - v_row.signed_in_at > private.session_max_age() then
    update private.staff_sessions set ended_at = now(), ended_reason = 'expired'
      where session_id = v_sid;
    return 'expired';
  end if;
  if now() - v_row.last_seen_at > private.session_idle_limit() then
    update private.staff_sessions set ended_at = now(), ended_reason = 'idle'
      where session_id = v_sid;
    return 'idle';
  end if;

  update private.staff_sessions set last_seen_at = now()
    where session_id = v_sid and last_seen_at < now() - interval '15 seconds';
  return 'ok';
end;
$$;

/** Sign-out: end the current session (so a copied access token stops working). */
create function public.end_staff_session(p_reason text default 'signout')
returns void
language sql
security definer
set search_path = ''
as $$
  update private.staff_sessions
     set ended_at = now(), ended_reason = left(p_reason, 40)
   where session_id = nullif((select auth.jwt()) ->> 'session_id', '')::uuid
     and user_id = (select auth.uid())
     and ended_at is null;
$$;

/** Password change: end every other session of the current user. */
create function public.end_other_staff_sessions()
returns void
language sql
security definer
set search_path = ''
as $$
  update private.staff_sessions
     set ended_at = now(), ended_reason = 'password_changed'
   where user_id = (select auth.uid())
     and session_id is distinct from nullif((select auth.jwt()) ->> 'session_id', '')::uuid
     and ended_at is null;
$$;

/** Deactivation / MFA reset by an admin (server, secret key only). */
create function public.end_user_staff_sessions(p_user_id uuid, p_reason text)
returns void
language sql
security definer
set search_path = ''
as $$
  update private.staff_sessions
     set ended_at = now(), ended_reason = left(p_reason, 40)
   where user_id = p_user_id and ended_at is null;
$$;

revoke all on function public.touch_staff_session(), public.end_staff_session(text),
  public.end_other_staff_sessions(), public.end_user_staff_sessions(uuid, text)
  from public, anon, authenticated;
grant execute on function public.touch_staff_session(), public.end_staff_session(text),
  public.end_other_staff_sessions() to authenticated;
grant execute on function public.end_user_staff_sessions(uuid, text) to service_role;

/** True when the current request's session is live (not ended, idle or expired). */
create function private.session_is_live() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from private.staff_sessions s
     where s.session_id = nullif((select auth.jwt()) ->> 'session_id', '')::uuid
       and s.user_id = (select auth.uid())
       and s.ended_at is null
       and now() - s.last_seen_at <= private.session_idle_limit()
       and now() - s.signed_in_at <= private.session_max_age()
  )
$$;

-- ------------------------------------------------------------------ 2. role helpers

-- Replacing in place keeps the function ids, so every existing policy (tables
-- and storage) now also requires MFA (aal2) and a live session.
create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select auth.jwt()) ->> 'aal', '') = 'aal2'
    and exists (
      select 1 from public.profiles
       where id = (select auth.uid()) and active
    )
    and private.session_is_live();
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select auth.jwt()) ->> 'aal', '') = 'aal2'
    and exists (
      select 1 from public.profiles
       where id = (select auth.uid()) and active and role = 'admin'
    )
    and private.session_is_live();
$$;

-- ------------------------------------------------------------------ 3. audit log

create table public.audit_log (
  id bigint generated always as identity primary key,
  user_id uuid,
  action text not null check (length(action) <= 60),
  target_type text check (length(target_type) <= 40),
  target_id text check (length(target_id) <= 100),
  details jsonb not null default '{}'::jsonb,
  ip text check (length(ip) <= 64),
  user_agent text check (length(user_agent) <= 400),
  -- Shown on /admin/activity as needing attention (new device, role change, …).
  alert boolean not null default false,
  created_at timestamptz not null default now()
);
comment on table public.audit_log is 'Insert-only activity log. Written by the server (secret key); admins read it.';

create index audit_log_created_at_idx on public.audit_log (created_at desc);
create index audit_log_user_idx on public.audit_log (user_id, created_at desc);
create index audit_log_action_idx on public.audit_log (action, created_at desc);

alter table public.audit_log enable row level security;
revoke all on public.audit_log from anon, authenticated, service_role;
grant select on public.audit_log to authenticated;
grant insert, select on public.audit_log to service_role;

create policy "Admins can read the activity log"
  on public.audit_log for select
  to authenticated
  using ((select private.is_admin()));

-- Nobody (not even the table owner or the secret key) can change history.
create function private.audit_log_is_append_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit_log is append-only' using errcode = '42501';
end;
$$;

create trigger audit_log_no_update_delete
  before update or delete on public.audit_log
  for each row execute function private.audit_log_is_append_only();
create trigger audit_log_no_truncate
  before truncate on public.audit_log
  for each statement execute function private.audit_log_is_append_only();

-- ------------------------------------------------------------------ 4. rate limiting

create table private.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);

/** Fixed-window counter. Returns true while the caller is within p_limit hits per window. */
create function public.rate_limit_hit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz :=
    to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
begin
  insert into private.rate_limits (key, window_start, hits)
  values (left(p_key, 200), v_window, 1)
  on conflict (key, window_start) do update set hits = private.rate_limits.hits + 1
  returning hits into v_hits;
  return v_hits <= p_limit;
end;
$$;

-- Per-account lockout: 5 failures within 15 minutes → locked for 15 minutes.
-- Keyed by a hash of the email, for every email tried (existing or not), so
-- the lockout itself reveals nothing about which accounts exist.
create table private.login_failures (
  email_hash text primary key,
  failures integer not null default 0,
  first_failed_at timestamptz not null default now(),
  locked_until timestamptz
);

/** Seconds until the account unlocks (0 = not locked). */
create function public.login_locked_seconds(p_email_hash text)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select greatest(0, ceil(extract(epoch from locked_until - now())))::integer
       from private.login_failures
      where email_hash = p_email_hash and locked_until > now()),
    0
  )
$$;

/** Record a failed sign-in; returns the failure count in the current 15-minute window. */
create function public.login_record_failure(p_email_hash text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_failures integer;
begin
  insert into private.login_failures as f (email_hash, failures, first_failed_at)
  values (p_email_hash, 1, now())
  on conflict (email_hash) do update set
    failures = case when f.first_failed_at < now() - interval '15 minutes' then 1 else f.failures + 1 end,
    first_failed_at = case when f.first_failed_at < now() - interval '15 minutes' then now() else f.first_failed_at end
  returning failures into v_failures;

  if v_failures >= 5 then
    update private.login_failures
       set locked_until = now() + interval '15 minutes'
     where email_hash = p_email_hash;
  end if;
  return v_failures;
end;
$$;

create function public.login_record_success(p_email_hash text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from private.login_failures where email_hash = p_email_hash;
$$;

/** Housekeeping, called by the daily cron job. */
create function public.cleanup_security_tables()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from private.rate_limits where window_start < now() - interval '1 day';
  delete from private.login_failures
   where coalesce(locked_until, first_failed_at) < now() - interval '1 day';
  delete from private.staff_sessions where last_seen_at < now() - interval '30 days';
$$;

revoke all on function public.rate_limit_hit(text, integer, integer),
  public.login_locked_seconds(text), public.login_record_failure(text),
  public.login_record_success(text), public.cleanup_security_tables()
  from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer),
  public.login_locked_seconds(text), public.login_record_failure(text),
  public.login_record_success(text), public.cleanup_security_tables()
  to service_role;

-- Only the security definer functions above touch these tables.
revoke all on private.staff_sessions, private.rate_limits, private.login_failures
  from public, anon, authenticated;
alter table private.staff_sessions enable row level security;
alter table private.rate_limits enable row level security;
alter table private.login_failures enable row level security;

-- ------------------------------------------------------------------ 5. uploads

-- Files are checked (magic bytes), re-encoded with sharp and stored by the
-- server with the secret key. Browsers can no longer write to Storage.
drop policy "Staff can upload vehicle photo files" on storage.objects;
drop policy "Admins can upload site image files" on storage.objects;

update storage.buckets
   set allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png']
 where id = 'site-images';

-- ------------------------------------------------------------------ 6. data integrity

-- L2: on insert, signed-in users can't choose who created a listing, when, its
-- stock number, slug, publish/sold dates or the demo flag: they may only
-- insert these columns; defaults and vehicles_before_write fill in the rest.
-- (The secret-key role used by seed/import scripts keeps full access.)
revoke insert on public.vehicles from authenticated;
grant insert (
  vin, year, make, model, trim, body_type, mileage, price, exterior_color, interior_color,
  engine, transmission, drivetrain, fuel_type, title_status, features, description, status,
  featured
) on public.vehicles to authenticated;

-- L3: social / maps links must be https (the app also checks the host).
alter table public.site_settings
  add constraint site_settings_facebook_url_https
    check (facebook_url is null or facebook_url ~ '^https://[^\s]+$'),
  add constraint site_settings_google_maps_url_https
    check (google_maps_url is null or google_maps_url ~ '^https://[^\s]+$');
