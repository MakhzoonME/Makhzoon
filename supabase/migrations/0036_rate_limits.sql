-- Durable rate limiting (T1.1, docs/AUDIT_ACTION_PLAN_2026-07-05.md)
--
-- The previous limiter kept counters in a per-isolate in-memory Map, which is
-- ineffective on Cloudflare Workers (each ephemeral isolate has its own store).
-- This table + atomic upsert function give one shared counter per key across
-- all isolates. Accessed exclusively through the service-role client.

create table if not exists public.rate_limits (
  key      text primary key,
  count    integer not null default 1,
  reset_at timestamptz not null
);

-- Deny-all RLS: only the service role (which bypasses RLS) may touch this.
alter table public.rate_limits enable row level security;

create index if not exists rate_limits_reset_at_idx
  on public.rate_limits (reset_at);

-- Atomically bump the counter for `p_key`, starting a fresh window when the
-- previous one has lapsed. Returns whether the request is allowed plus window
-- metadata for Retry-After headers.
create or replace function public.increment_rate_limit(
  p_key text,
  p_limit integer,
  p_window_ms bigint
)
returns table (allowed boolean, current_count integer, reset_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_count integer;
  v_reset timestamptz;
begin
  insert into public.rate_limits as rl (key, count, reset_at)
  values (p_key, 1, v_now + make_interval(secs => p_window_ms / 1000.0))
  on conflict (key) do update
    set count    = case when rl.reset_at <= v_now then 1
                        else rl.count + 1 end,
        reset_at = case when rl.reset_at <= v_now
                        then v_now + make_interval(secs => p_window_ms / 1000.0)
                        else rl.reset_at end
  returning rl.count, rl.reset_at into v_count, v_reset;

  return query select v_count <= p_limit, v_count, v_reset;
end;
$$;

revoke all on function public.increment_rate_limit(text, integer, bigint) from public, anon, authenticated;

-- Housekeeping: drop lapsed windows. Same pattern as purge_expired_sessions
-- in 0003_auth.sql — schedule via pg_cron when available, otherwise the
-- existing cron worker route can call it.
create or replace function public.purge_expired_rate_limits()
returns void language sql security definer set search_path = public as $$
  delete from public.rate_limits where reset_at < now();
$$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'purge-expired-rate-limits', '30 * * * *',
      $cron$ select public.purge_expired_rate_limits(); $cron$);
  end if;
exception when others then
  -- pg_cron not available in this project; safe to ignore.
  null;
end $$;
