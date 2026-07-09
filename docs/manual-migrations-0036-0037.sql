-- ═══════════════════════════════════════════════════════════════════════
-- Manual apply of migrations 0036 + 0037 via the Supabase dashboard SQL editor
-- (no terminal needed). Safe to run more than once — every statement is
-- idempotent (IF NOT EXISTS / CREATE OR REPLACE / the UPDATE is guarded).
--
-- HOW: Supabase dashboard → your project → SQL Editor → New query →
--      paste ALL of this → Run. Do it once per project:
--        dev  = ltujtoabnewoypittoku
--        prod/staging = ncjzozvzjtyycdlwohtr  (still shared until the split)
-- ═══════════════════════════════════════════════════════════════════════


-- ── 0036: durable rate limiting ────────────────────────────────────────
create table if not exists public.rate_limits (
  key      text primary key,
  count    integer not null default 1,
  reset_at timestamptz not null
);

alter table public.rate_limits enable row level security;

create index if not exists rate_limits_reset_at_idx
  on public.rate_limits (reset_at);

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
  null;
end $$;


-- ── 0037: delivery-token lifecycle ─────────────────────────────────────
alter table haraka_orders
  add column if not exists delivery_token_expires_at timestamptz,
  add column if not exists delivery_token_revoked_at timestamptz;

update haraka_orders
   set delivery_token_expires_at = now() + interval '14 days'
 where delivery_token is not null
   and delivery_token_expires_at is null;


-- ── Verify (should return has_0036 = true, has_0037 = true) ─────────────
select
  to_regclass('public.rate_limits') is not null as has_0036,
  (select count(*) from information_schema.columns
     where table_name = 'haraka_orders'
       and column_name = 'delivery_token_expires_at') = 1 as has_0037;
