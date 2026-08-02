-- ════════════════════════════════════════════════════════════════════════
-- 0049_pricing_model.sql
-- Phase 1 of the pricing/subscription overhaul: structured package allowances
-- (Usool/Raseed/Haraka slots/add-ons), per-subscription add-ons + limit
-- overrides + founding-cohort + billing anchor, and a trigger-maintained
-- usage_counters table. Additive and idempotent (safe to replay); legacy
-- `packages.limits`/`packages.features` and the ACTIVE/EXPIRED/SUSPENDED
-- statuses stay valid during the transition.
-- ════════════════════════════════════════════════════════════════════════

-- ── packages: structured allowances + add-on price config ──────────────────
alter table public.packages
  add column if not exists usool_included               integer,
  add column if not exists raseed_included              integer,
  add column if not exists purchases_requests_included  boolean not null default false,
  add column if not exists haraka_included_module_slots integer not null default 0,
  add column if not exists delivery_agents_included     boolean not null default false,
  add column if not exists warranty_certs_included      boolean not null default false,
  add column if not exists customization_included       boolean not null default false,
  add column if not exists spaces_included              integer,
  add column if not exists users_included               integer,
  add column if not exists reports_available            boolean not null default false,
  add column if not exists is_custom                    boolean not null default false,
  -- { extraHarakaModule, deliveryAgents, warrantyCerts, customization,
  --   purchasesRequests, extraUser, extraSpace } — monthly prices in the
  --   package currency. Populated from the Financial Plan; 0/absent = not priced.
  add column if not exists add_on_prices                jsonb   not null default '{}'::jsonb;

-- ── subscriptions: active modules/add-ons, per-org overrides, billing ───────
alter table public.subscriptions
  -- subset of ('pos','services','orders','retainers')
  add column if not exists active_haraka_modules text[]  not null default '{}',
  -- { deliveryAgents, warrantyCerts, customization, purchasesRequests,
  --   extraHarakaModules: text[], extraUsers: int, extraSpaces: int }
  add column if not exists active_add_ons        jsonb   not null default '{}'::jsonb,
  -- per-org limit overrides { usool, raseed, users, spaces }; when set, wins
  -- over the package's included value + purchased add-ons. Applied immediately.
  add column if not exists limit_overrides       jsonb   not null default '{}'::jsonb,
  -- { isFoundingCohort: bool, discountPercent: number, discountExpiresAt: iso|null }
  add column if not exists founding_cohort       jsonb   not null default '{}'::jsonb,
  add column if not exists billing_anchor_day    integer,
  add column if not exists grace_started_at      timestamptz;

-- Backfill the billing anchor from each subscription's start date (1..28 to
-- avoid short-month drift) so monthly billing has a stable day-of-month.
update public.subscriptions
  set billing_anchor_day = least(greatest(extract(day from start_date)::int, 1), 28)
  where billing_anchor_day is null;

-- NOTE: the SubscriptionStatus set gains GRACE and READ_ONLY at the app layer.
-- `status` is a free-text column (no DB enum/check), so no DDL is needed here.

-- ════════════════════════════════════════════════════════════════════════
-- usage_counters — denormalized per-org counts, maintained by triggers so
-- billing/limit checks never pay for a live COUNT(*) over large tables.
-- space_count stays 0 for now (spaces are still derived from asset.location;
-- the app computes it live) until a first-class spaces table exists.
-- ════════════════════════════════════════════════════════════════════════
create table if not exists public.usage_counters (
  organization_id   uuid primary key references public.organizations(id) on delete cascade,
  usool_asset_count integer     not null default 0,
  raseed_item_count integer     not null default 0,
  user_count        integer     not null default 0,
  space_count       integer     not null default 0,
  updated_at        timestamptz not null default now()
);

-- Service-role only — like the other *_counters tables (no public policies).
alter table public.usage_counters enable row level security;

-- Generic ±1 sync keyed by the target column name passed as a trigger arg.
create or replace function public.usage_counter_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_col   text := TG_ARGV[0];
  v_org   uuid;
  v_delta int;
begin
  if TG_OP = 'INSERT' then
    v_org := NEW.organization_id; v_delta := 1;
  elsif TG_OP = 'DELETE' then
    v_org := OLD.organization_id; v_delta := -1;
  else
    return null;
  end if;

  if v_org is null then
    return coalesce(NEW, OLD);
  end if;

  execute format(
    'insert into public.usage_counters (organization_id, %1$I, updated_at)
       values ($1, greatest($2, 0), now())
     on conflict (organization_id) do update
       set %1$I = greatest(public.usage_counters.%1$I + $2, 0),
           updated_at = now()',
    v_col)
  using v_org, v_delta;

  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists assets_usage_counter on public.assets;
create trigger assets_usage_counter
  after insert or delete on public.assets
  for each row execute function public.usage_counter_sync('usool_asset_count');

drop trigger if exists inventory_items_usage_counter on public.inventory_items;
create trigger inventory_items_usage_counter
  after insert or delete on public.inventory_items
  for each row execute function public.usage_counter_sync('raseed_item_count');

drop trigger if exists users_usage_counter on public.users;
create trigger users_usage_counter
  after insert or delete on public.users
  for each row execute function public.usage_counter_sync('user_count');

-- Backfill current counts for every org (idempotent — recomputes on replay).
insert into public.usage_counters
    (organization_id, usool_asset_count, raseed_item_count, user_count, space_count)
select
  o.id,
  (select count(*) from public.assets          a where a.organization_id = o.id),
  (select count(*) from public.inventory_items i where i.organization_id = o.id),
  (select count(*) from public.users           u where u.organization_id = o.id),
  0
from public.organizations o
on conflict (organization_id) do update set
  usool_asset_count = excluded.usool_asset_count,
  raseed_item_count = excluded.raseed_item_count,
  user_count        = excluded.user_count,
  updated_at        = now();
