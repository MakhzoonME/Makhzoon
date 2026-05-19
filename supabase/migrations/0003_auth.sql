-- Makhzoon — auth support objects (Phase 2)
-- Session revocation deny-list, keyed by the JWT `session_id` claim. Mirrors
-- the legacy Firestore `revokedSessions` collection + its TTL policy.

create table if not exists public.revoked_sessions (
  session_id text primary key,
  user_id    uuid not null,
  revoked_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists revoked_sessions_user_idx
  on public.revoked_sessions (user_id);
create index if not exists revoked_sessions_expiry_idx
  on public.revoked_sessions (expires_at);

-- Service-role only; the per-user client must never read/write this table.
alter table public.revoked_sessions enable row level security;
-- (no policies ⇒ anon/authenticated have no access; supabaseAdmin bypasses RLS)

-- Housekeeping: drop expired deny-list rows. Schedule via pg_cron if the
-- extension is enabled (Supabase: Dashboard → Database → Extensions), else
-- call public.purge_expired_sessions() from the existing cron route.
create or replace function public.purge_expired_sessions()
returns void language sql as $$
  delete from public.revoked_sessions where expires_at < now();
$$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'purge-expired-sessions', '0 * * * *',
      $cron$ select public.purge_expired_sessions(); $cron$);
  end if;
exception when others then
  -- pg_cron not available in this project; safe to ignore.
  null;
end $$;
