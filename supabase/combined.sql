-- ════════════════════════════════════════════
-- Makhzoon — Combined Schema + Seed
-- Merged from: 0001_init.sql, 0002_rls.sql, 0003_auth.sql,
--              0004_modules.sql, 0005_modules.sql, 0006_haraka.sql,
--              seed-test-data.sql
-- Safe to run in Supabase SQL Editor (uses IF NOT EXISTS / exception guards)
-- ════════════════════════════════════════════

-- ═════════════════════════════════════════════════════════════════════════════
-- 0001_init.sql — Foundation + core tenant tables
-- ═════════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

do $$ begin
  create type public.user_role as enum (
    'super_admin', 'makhzoon_admin', 'makhzoon_support',
    'org_owner', 'admin', 'staff'
  );
exception when duplicate_object then null; end $$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create table if not exists public.organizations (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  subdomain          text not null unique,
  contact_email      text not null,
  description        text,
  category           text,
  package_details    jsonb not null default '{}'::jsonb,
  assigned_member_id uuid,
  created_at         timestamptz not null default now(),
  created_by         uuid,
  updated_at         timestamptz not null default now(),
  updated_by         uuid
);
create index if not exists organizations_category_idx on public.organizations (category);
create index if not exists organizations_name_trgm_idx on public.organizations using gin (name gin_trgm_ops);
create or replace trigger organizations_set_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();

create table if not exists public.users (
  id              uuid primary key references auth.users (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete cascade,
  email           text not null,
  username        text,
  display_name    text,
  role            public.user_role not null,
  status          text not null default 'active',
  permissions     jsonb,
  created_at      timestamptz not null default now(),
  created_by      uuid,
  updated_at      timestamptz not null default now(),
  updated_by      uuid
);
create index if not exists users_org_idx on public.users (organization_id);
create unique index if not exists users_org_username_uidx
  on public.users (organization_id, lower(username)) where username is not null;
create or replace trigger users_set_updated_at before update on public.users
  for each row execute function public.set_updated_at();

create table if not exists public.packages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text not null default '',
  is_active   boolean not null default true,
  limits      jsonb not null default '{}'::jsonb,
  features    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  created_by  uuid,
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);
create index if not exists packages_active_idx on public.packages (is_active);
create or replace trigger packages_set_updated_at before update on public.packages
  for each row execute function public.set_updated_at();

create table if not exists public.subscriptions (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  package_id      uuid references public.packages (id) on delete set null,
  features        jsonb not null default '{}'::jsonb,
  notes           text,
  package_details jsonb not null default '{}'::jsonb,
  start_date      timestamptz not null,
  end_date        timestamptz not null,
  status          text not null,
  created_at      timestamptz not null default now(),
  created_by      uuid,
  updated_at      timestamptz not null default now(),
  updated_by      uuid
);
create index if not exists subscriptions_org_idx on public.subscriptions (organization_id);
create or replace trigger subscriptions_set_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

create table if not exists public.assets (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name            text not null,
  category        text,
  status          text,
  serial_number   text,
  purchase_date   timestamptz,
  purchase_cost   numeric,
  assigned_to     text,
  location        text,
  notes           text,
  created_at      timestamptz not null default now(),
  created_by      uuid,
  created_by_email text,
  created_by_name  text,
  created_by_role  text,
  updated_at      timestamptz not null default now(),
  updated_by      uuid,
  updated_by_email text,
  updated_by_name  text,
  updated_by_role  text
);
create index if not exists assets_org_idx on public.assets (organization_id);
create index if not exists assets_org_status_idx on public.assets (organization_id, status);
create index if not exists assets_org_category_idx on public.assets (organization_id, category);
create or replace trigger assets_set_updated_at before update on public.assets
  for each row execute function public.set_updated_at();

create table if not exists public.inventory_items (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations (id) on delete cascade,
  name              text not null,
  category          text,
  sku               text,
  unit              text,
  quantity_on_hand  integer not null default 0,
  minimum_threshold integer not null default 0,
  reorder_quantity  integer,
  location          text,
  supplier          text,
  unit_cost         numeric,
  notes             text,
  stock_status      text not null default 'ok',
  created_at        timestamptz not null default now(),
  created_by        uuid,
  created_by_email  text,
  created_by_name   text,
  updated_at        timestamptz not null default now(),
  updated_by        uuid,
  updated_by_email  text,
  updated_by_name   text
);
create index if not exists inventory_items_org_idx on public.inventory_items (organization_id);
create index if not exists inventory_items_org_category_idx on public.inventory_items (organization_id, category);
create or replace trigger inventory_items_set_updated_at before update on public.inventory_items
  for each row execute function public.set_updated_at();

create table if not exists public.inventory_transactions (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations (id) on delete cascade,
  item_id            uuid not null references public.inventory_items (id) on delete cascade,
  item_name          text,
  type               text not null check (type in ('in', 'out', 'adjustment')),
  quantity           integer not null,
  quantity_before    integer not null,
  quantity_after     integer not null,
  reason             text,
  note               text,
  performed_at       timestamptz not null default now(),
  performed_by       uuid,
  performed_by_email text,
  performed_by_name  text,
  performed_by_role  text
);
create index if not exists inv_tx_item_idx on public.inventory_transactions (item_id, performed_at desc);
create index if not exists inv_tx_org_idx on public.inventory_transactions (organization_id);

create table if not exists public.invites (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  email            text,
  username         text,
  display_name     text,
  role             public.user_role not null,
  token            text not null unique,
  status           text not null default 'pending'
                     check (status in ('pending', 'accepted', 'revoked')),
  invited_by       uuid,
  invited_by_email text,
  invited_by_name  text,
  expires_at       timestamptz not null,
  accepted_at      timestamptz,
  accepted_by      uuid,
  revoked_at       timestamptz,
  revoked_by       uuid,
  created_at       timestamptz not null default now(),
  permissions      jsonb
);
create index if not exists invites_org_idx on public.invites (organization_id, created_at desc);
create index if not exists invites_org_email_status_idx
  on public.invites (organization_id, lower(email), status);

create table if not exists public.organization_configs (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  asset_statuses  jsonb not null default '[]'::jsonb,
  locations       jsonb not null default '[]'::jsonb,
  categories      jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now(),
  created_by      uuid,
  updated_at      timestamptz not null default now(),
  updated_by      uuid
);
create or replace trigger organization_configs_set_updated_at before update on public.organization_configs
  for each row execute function public.set_updated_at();

create or replace function public.app_role()
returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.users where id = auth.uid()
$$;

create or replace function public.app_org()
returns uuid
language sql stable security definer set search_path = public as $$
  select organization_id from public.users where id = auth.uid()
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    public.app_role() in ('super_admin', 'makhzoon_admin', 'makhzoon_support'),
    false)
$$;

create or replace function public.is_org_manager(org uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    public.app_role() in ('admin', 'org_owner') and public.app_org() = org,
    false)
$$;

create or replace function public.belongs_to_org(org uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.app_org() = org, false)
$$;

-- ═════════════════════════════════════════════════════════════════════════════
-- 0002_rls.sql — Row Level Security
-- ═════════════════════════════════════════════════════════════════════════════

do $$ begin
  alter table public.organizations enable row level security;
exception when others then null; end $$;

do $$ begin
  alter table public.users enable row level security;
exception when others then null; end $$;

do $$ begin
  alter table public.packages enable row level security;
exception when others then null; end $$;

do $$ begin
  alter table public.subscriptions enable row level security;
exception when others then null; end $$;

do $$ begin
  alter table public.assets enable row level security;
exception when others then null; end $$;

do $$ begin
  alter table public.inventory_items enable row level security;
exception when others then null; end $$;

do $$ begin
  alter table public.inventory_transactions enable row level security;
exception when others then null; end $$;

do $$ begin
  alter table public.invites enable row level security;
exception when others then null; end $$;

do $$ begin
  alter table public.organization_configs enable row level security;
exception when others then null; end $$;

do $$ begin
  drop policy if exists organizations_platform_all on public.organizations;
  create policy organizations_platform_all on public.organizations
    for all using (public.is_platform_admin()) with check (public.is_platform_admin());
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists subscriptions_platform_all on public.subscriptions;
  create policy subscriptions_platform_all on public.subscriptions
    for all using (public.is_platform_admin()) with check (public.is_platform_admin());
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists subscriptions_mgr_read on public.subscriptions;
  create policy subscriptions_mgr_read on public.subscriptions
    for select using (public.is_org_manager(organization_id));
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists users_platform_all on public.users;
  create policy users_platform_all on public.users
    for all using (public.is_platform_admin()) with check (public.is_platform_admin());
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists users_mgr_all on public.users;
  create policy users_mgr_all on public.users
    for all using (public.is_org_manager(organization_id))
    with check (public.is_org_manager(organization_id));
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists users_staff_read on public.users;
  create policy users_staff_read on public.users
    for select using (public.belongs_to_org(organization_id));
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists packages_read on public.packages;
  create policy packages_read on public.packages
    for select using (auth.uid() is not null);
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists packages_platform_write on public.packages;
  create policy packages_platform_write on public.packages
    for all using (public.is_platform_admin()) with check (public.is_platform_admin());
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists assets_platform_all on public.assets;
  create policy assets_platform_all on public.assets
    for all using (public.is_platform_admin()) with check (public.is_platform_admin());
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists assets_mgr_all on public.assets;
  create policy assets_mgr_all on public.assets
    for all using (public.is_org_manager(organization_id))
    with check (public.is_org_manager(organization_id));
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists assets_staff_read on public.assets;
  create policy assets_staff_read on public.assets
    for select using (public.belongs_to_org(organization_id));
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists inv_items_platform_all on public.inventory_items;
  create policy inv_items_platform_all on public.inventory_items
    for all using (public.is_platform_admin()) with check (public.is_platform_admin());
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists inv_items_mgr_all on public.inventory_items;
  create policy inv_items_mgr_all on public.inventory_items
    for all using (public.is_org_manager(organization_id))
    with check (public.is_org_manager(organization_id));
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists inv_items_staff_read on public.inventory_items;
  create policy inv_items_staff_read on public.inventory_items
    for select using (public.belongs_to_org(organization_id));
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists inv_tx_platform_all on public.inventory_transactions;
  create policy inv_tx_platform_all on public.inventory_transactions
    for all using (public.is_platform_admin()) with check (public.is_platform_admin());
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists inv_tx_mgr_all on public.inventory_transactions;
  create policy inv_tx_mgr_all on public.inventory_transactions
    for all using (public.is_org_manager(organization_id))
    with check (public.is_org_manager(organization_id));
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists inv_tx_staff_read on public.inventory_transactions;
  create policy inv_tx_staff_read on public.inventory_transactions
    for select using (public.belongs_to_org(organization_id));
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists invites_platform_all on public.invites;
  create policy invites_platform_all on public.invites
    for all using (public.is_platform_admin()) with check (public.is_platform_admin());
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists invites_mgr_all on public.invites;
  create policy invites_mgr_all on public.invites
    for all using (public.is_org_manager(organization_id))
    with check (public.is_org_manager(organization_id));
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists org_cfg_platform_all on public.organization_configs;
  create policy org_cfg_platform_all on public.organization_configs
    for all using (public.is_platform_admin()) with check (public.is_platform_admin());
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists org_cfg_mgr_all on public.organization_configs;
  create policy org_cfg_mgr_all on public.organization_configs
    for all using (public.is_org_manager(organization_id))
    with check (public.is_org_manager(organization_id));
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists org_cfg_staff_read on public.organization_configs;
  create policy org_cfg_staff_read on public.organization_configs
    for select using (public.belongs_to_org(organization_id));
exception when duplicate_object then null; end $$;

-- ═════════════════════════════════════════════════════════════════════════════
-- 0003_auth.sql — Auth support objects
-- ═════════════════════════════════════════════════════════════════════════════

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

do $$ begin
  alter table public.revoked_sessions enable row level security;
exception when others then null; end $$;

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
  null;
end $$;

-- ═════════════════════════════════════════════════════════════════════════════
-- 0004_modules.sql — Module tables (batch 1)
-- ═════════════════════════════════════════════════════════════════════════════

create table if not exists public.password_reset_tokens (
  hashed_token text primary key,
  uid          uuid not null,
  expires_at   timestamptz not null,
  created_at   timestamptz not null default now()
);
create index if not exists prt_expiry_idx on public.password_reset_tokens (expires_at);

do $$ begin
  alter table public.password_reset_tokens enable row level security;
exception when others then null; end $$;

create table if not exists public.audit_logs (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid,
  user_id         uuid,
  role            text,
  action          text,
  module          text,
  record_id       text,
  old_value       jsonb,
  new_value       jsonb,
  timestamp       timestamptz not null default now(),
  transfer_mode   boolean
);
create index if not exists audit_logs_org_ts_idx on public.audit_logs (organization_id, timestamp desc);
create index if not exists audit_logs_user_idx on public.audit_logs (user_id);
create index if not exists audit_logs_action_idx on public.audit_logs (action);

do $$ begin
  alter table public.audit_logs enable row level security;
exception when others then null; end $$;

do $$ begin
  drop policy if exists audit_logs_read on public.audit_logs;
  create policy audit_logs_read on public.audit_logs
    for select using (
      public.is_platform_admin()
      or (public.app_role() = 'admin' and public.app_org() = organization_id)
    );
exception when duplicate_object then null; end $$;

create table if not exists public.warranties (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations (id) on delete cascade,
  asset_id          uuid,
  inventory_item_id uuid,
  vendor            text,
  start_date        timestamptz not null,
  end_date          timestamptz not null,
  reminder          boolean not null default true,
  notes             text,
  created_at        timestamptz not null default now(),
  created_by        uuid,
  updated_at        timestamptz not null default now(),
  updated_by        uuid
);
create index if not exists warranties_org_idx on public.warranties (organization_id);
create index if not exists warranties_org_asset_idx on public.warranties (organization_id, asset_id);
create index if not exists warranties_org_end_idx on public.warranties (organization_id, end_date);
create or replace trigger warranties_set_updated_at before update on public.warranties
  for each row execute function public.set_updated_at();

do $$ begin
  alter table public.warranties enable row level security;
exception when others then null; end $$;

do $$ begin
  drop policy if exists warranties_platform_all on public.warranties;
  create policy warranties_platform_all on public.warranties
    for all using (public.is_platform_admin()) with check (public.is_platform_admin());
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists warranties_mgr_all on public.warranties;
  create policy warranties_mgr_all on public.warranties
    for all using (public.is_org_manager(organization_id))
    with check (public.is_org_manager(organization_id));
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists warranties_staff_read on public.warranties;
  create policy warranties_staff_read on public.warranties
    for select using (public.belongs_to_org(organization_id));
exception when duplicate_object then null; end $$;

create table if not exists public.requests (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations (id) on delete cascade,
  type                text,
  asset_id            uuid,
  warranty_id         uuid,
  inventory_item_id   uuid,
  inventory_item_name text,
  description         text,
  status              text,
  decision_by         uuid,
  decision_at         timestamptz,
  created_at          timestamptz not null default now(),
  created_by          uuid,
  updated_at          timestamptz not null default now(),
  updated_by          uuid
);
create index if not exists requests_org_idx on public.requests (organization_id);
create index if not exists requests_org_status_idx on public.requests (organization_id, status);
create index if not exists requests_org_creator_idx on public.requests (organization_id, created_by);
create or replace trigger requests_set_updated_at before update on public.requests
  for each row execute function public.set_updated_at();

do $$ begin
  alter table public.requests enable row level security;
exception when others then null; end $$;

do $$ begin
  drop policy if exists requests_platform_all on public.requests;
  create policy requests_platform_all on public.requests
    for all using (public.is_platform_admin()) with check (public.is_platform_admin());
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists requests_mgr_all on public.requests;
  create policy requests_mgr_all on public.requests
    for all using (public.is_org_manager(organization_id))
    with check (public.is_org_manager(organization_id));
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists requests_staff_read on public.requests;
  create policy requests_staff_read on public.requests
    for select using (public.belongs_to_org(organization_id));
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists requests_staff_create on public.requests;
  create policy requests_staff_create on public.requests
    for insert with check (public.belongs_to_org(organization_id));
exception when duplicate_object then null; end $$;

create table if not exists public.asset_notes (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  asset_id         uuid not null,
  text             text not null,
  created_by       uuid,
  created_by_email text,
  created_at       timestamptz not null default now()
);
create index if not exists asset_notes_org_asset_idx
  on public.asset_notes (organization_id, asset_id, created_at desc);

do $$ begin
  alter table public.asset_notes enable row level security;
exception when others then null; end $$;

do $$ begin
  drop policy if exists asset_notes_platform_all on public.asset_notes;
  create policy asset_notes_platform_all on public.asset_notes
    for all using (public.is_platform_admin()) with check (public.is_platform_admin());
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists asset_notes_mgr_all on public.asset_notes;
  create policy asset_notes_mgr_all on public.asset_notes
    for all using (public.is_org_manager(organization_id))
    with check (public.is_org_manager(organization_id));
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists asset_notes_staff_read on public.asset_notes;
  create policy asset_notes_staff_read on public.asset_notes
    for select using (public.belongs_to_org(organization_id));
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists asset_notes_staff_create on public.asset_notes;
  create policy asset_notes_staff_create on public.asset_notes
    for insert with check (public.belongs_to_org(organization_id));
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists asset_notes_staff_delete_own on public.asset_notes;
  create policy asset_notes_staff_delete_own on public.asset_notes
    for delete using (
      public.belongs_to_org(organization_id) and created_by = auth.uid()
    );
exception when duplicate_object then null; end $$;

create table if not exists public.maintenance_records (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  asset_id         uuid not null,
  type             text,
  description      text,
  performed_by     text,
  cost             numeric,
  date             timestamptz not null,
  created_by       uuid,
  created_by_email text,
  created_at       timestamptz not null default now()
);
create index if not exists maint_org_asset_idx
  on public.maintenance_records (organization_id, asset_id, date desc);

do $$ begin
  alter table public.maintenance_records enable row level security;
exception when others then null; end $$;

do $$ begin
  drop policy if exists maint_platform_all on public.maintenance_records;
  create policy maint_platform_all on public.maintenance_records
    for all using (public.is_platform_admin()) with check (public.is_platform_admin());
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists maint_mgr_all on public.maintenance_records;
  create policy maint_mgr_all on public.maintenance_records
    for all using (public.is_org_manager(organization_id))
    with check (public.is_org_manager(organization_id));
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists maint_staff_read on public.maintenance_records;
  create policy maint_staff_read on public.maintenance_records
    for select using (public.belongs_to_org(organization_id));
exception when duplicate_object then null; end $$;

create table if not exists public.asset_checkouts (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references public.organizations (id) on delete cascade,
  asset_id             uuid not null,
  checked_out_to       text,
  checked_out_by       uuid,
  checked_out_by_email text,
  due_date             timestamptz,
  notes                text,
  checked_out_at       timestamptz not null default now(),
  returned_at          timestamptz,
  returned_by          uuid,
  returned_by_email    text
);
create index if not exists checkouts_org_asset_idx
  on public.asset_checkouts (organization_id, asset_id, checked_out_at desc);

do $$ begin
  alter table public.asset_checkouts enable row level security;
exception when others then null; end $$;

do $$ begin
  drop policy if exists checkouts_platform_all on public.asset_checkouts;
  create policy checkouts_platform_all on public.asset_checkouts
    for all using (public.is_platform_admin()) with check (public.is_platform_admin());
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists checkouts_mgr_all on public.asset_checkouts;
  create policy checkouts_mgr_all on public.asset_checkouts
    for all using (public.is_org_manager(organization_id))
    with check (public.is_org_manager(organization_id));
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists checkouts_staff_read on public.asset_checkouts;
  create policy checkouts_staff_read on public.asset_checkouts
    for select using (public.belongs_to_org(organization_id));
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists checkouts_staff_create on public.asset_checkouts;
  create policy checkouts_staff_create on public.asset_checkouts
    for insert with check (public.belongs_to_org(organization_id));
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists checkouts_staff_update on public.asset_checkouts;
  create policy checkouts_staff_update on public.asset_checkouts
    for update using (public.belongs_to_org(organization_id))
    with check (public.belongs_to_org(organization_id));
exception when duplicate_object then null; end $$;

-- ═════════════════════════════════════════════════════════════════════════════
-- 0005_modules.sql — Module tables (batch 2)
-- ═════════════════════════════════════════════════════════════════════════════

create table if not exists public.backend_logs (
  id                uuid primary key default gen_random_uuid(),
  timestamp         timestamptz not null default now(),
  method            text,
  path              text,
  status_code       integer,
  level             text,
  duration_ms       integer,
  user_id           uuid,
  user_display_name text,
  organization_id   uuid,
  organization_name text,
  role              text,
  error_message     text,
  request_summary   text,
  response_summary  text
);
create index if not exists backend_logs_ts_idx on public.backend_logs (timestamp desc);
create index if not exists backend_logs_org_idx on public.backend_logs (organization_id);
create index if not exists backend_logs_level_idx on public.backend_logs (level);

do $$ begin
  alter table public.backend_logs enable row level security;
exception when others then null; end $$;

do $$ begin
  drop policy if exists backend_logs_platform_read on public.backend_logs;
  create policy backend_logs_platform_read on public.backend_logs
    for select using (public.is_platform_admin());
exception when duplicate_object then null; end $$;

create table if not exists public.contact_sales (
  id                uuid primary key default gen_random_uuid(),
  name              text,
  first_name        text default '',
  last_name         text default '',
  organization_name text,
  phone             text,
  email             text,
  notes             text,
  ip                text,
  created_at        timestamptz not null default now()
);
create index if not exists contact_sales_created_idx on public.contact_sales (created_at desc);

do $$ begin
  alter table public.contact_sales enable row level security;
exception when others then null; end $$;

do $$ begin
  drop policy if exists contact_sales_platform_read on public.contact_sales;
  create policy contact_sales_platform_read on public.contact_sales
    for select using (public.is_platform_admin());
exception when duplicate_object then null; end $$;

create table if not exists public.early_access (
  id         uuid primary key default gen_random_uuid(),
  email      text,
  first_name text default '',
  last_name  text default '',
  ip         text,
  created_at timestamptz not null default now()
);
create index if not exists early_access_created_idx on public.early_access (created_at desc);

do $$ begin
  alter table public.early_access enable row level security;
exception when others then null; end $$;

do $$ begin
  drop policy if exists early_access_platform_read on public.early_access;
  create policy early_access_platform_read on public.early_access
    for select using (public.is_platform_admin());
exception when duplicate_object then null; end $$;

create table if not exists public.superadmin_users (
  id           uuid primary key,
  email        text not null,
  display_name text,
  role         text not null,
  status       text not null default 'active',
  permissions  jsonb,
  created_by   uuid,
  updated_by   uuid,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create or replace trigger superadmin_users_set_updated_at before update on public.superadmin_users
  for each row execute function public.set_updated_at();

do $$ begin
  alter table public.superadmin_users enable row level security;
exception when others then null; end $$;

do $$ begin
  drop policy if exists superadmin_users_platform_all on public.superadmin_users;
  create policy superadmin_users_platform_all on public.superadmin_users
    for all using (public.is_platform_admin()) with check (public.is_platform_admin());
exception when duplicate_object then null; end $$;

create table if not exists public.payment_logs (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  subscription_id uuid,
  amount          numeric,
  currency        text,
  method          text,
  reference       text,
  paid_at         timestamptz not null,
  notes           text,
  created_at      timestamptz not null default now(),
  created_by      uuid,
  updated_at      timestamptz not null default now(),
  updated_by      uuid
);
create index if not exists payment_logs_org_idx on public.payment_logs (organization_id, paid_at desc);
create or replace trigger payment_logs_set_updated_at before update on public.payment_logs
  for each row execute function public.set_updated_at();

do $$ begin
  alter table public.payment_logs enable row level security;
exception when others then null; end $$;

do $$ begin
  drop policy if exists payment_logs_platform_all on public.payment_logs;
  create policy payment_logs_platform_all on public.payment_logs
    for all using (public.is_platform_admin()) with check (public.is_platform_admin());
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists payment_logs_mgr_read on public.payment_logs;
  create policy payment_logs_mgr_read on public.payment_logs
    for select using (public.is_org_manager(organization_id));
exception when duplicate_object then null; end $$;

create table if not exists public.inventory_audits (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title           text,
  status          text not null default 'in_progress',
  notes           text,
  total_assets    integer not null default 0,
  found_count     integer not null default 0,
  missing_count   integer not null default 0,
  pending_count   integer not null default 0,
  started_by      uuid,
  started_by_name text,
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists inv_audits_org_idx on public.inventory_audits (organization_id, created_at desc);
create or replace trigger inv_audits_set_updated_at before update on public.inventory_audits
  for each row execute function public.set_updated_at();

create table if not exists public.inventory_audit_items (
  id                 uuid primary key default gen_random_uuid(),
  audit_id           uuid not null references public.inventory_audits (id) on delete cascade,
  organization_id    uuid not null references public.organizations (id) on delete cascade,
  asset_id           uuid,
  asset_name         text,
  asset_category     text,
  asset_serial       text,
  asset_location     text,
  asset_assigned_to  text,
  status             text not null default 'pending',
  note               text,
  checked_at         timestamptz,
  checked_by         uuid,
  checked_by_name    text
);
create index if not exists inv_audit_items_audit_idx on public.inventory_audit_items (audit_id, asset_name);

do $$ begin
  alter table public.inventory_audits enable row level security;
exception when others then null; end $$;

do $$ begin
  alter table public.inventory_audit_items enable row level security;
exception when others then null; end $$;

do $$ begin
  drop policy if exists inv_audits_platform_all on public.inventory_audits;
  create policy inv_audits_platform_all on public.inventory_audits
    for all using (public.is_platform_admin()) with check (public.is_platform_admin());
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists inv_audits_mgr_all on public.inventory_audits;
  create policy inv_audits_mgr_all on public.inventory_audits
    for all using (public.is_org_manager(organization_id))
    with check (public.is_org_manager(organization_id));
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists inv_audits_staff_read on public.inventory_audits;
  create policy inv_audits_staff_read on public.inventory_audits
    for select using (public.belongs_to_org(organization_id));
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists inv_audit_items_platform_all on public.inventory_audit_items;
  create policy inv_audit_items_platform_all on public.inventory_audit_items
    for all using (public.is_platform_admin()) with check (public.is_platform_admin());
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists inv_audit_items_mgr_all on public.inventory_audit_items;
  create policy inv_audit_items_mgr_all on public.inventory_audit_items
    for all using (public.is_org_manager(organization_id))
    with check (public.is_org_manager(organization_id));
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists inv_audit_items_staff_read on public.inventory_audit_items;
  create policy inv_audit_items_staff_read on public.inventory_audit_items
    for select using (public.belongs_to_org(organization_id));
exception when duplicate_object then null; end $$;

create table if not exists public.support_tickets (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  subject         text,
  description     text,
  status          text not null default 'OPEN',
  priority        text not null default 'MEDIUM',
  created_by      uuid,
  resolved_at     timestamptz,
  resolved_by     uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  updated_by      uuid
);
create index if not exists support_tickets_org_idx on public.support_tickets (organization_id, created_at desc);
create or replace trigger support_tickets_set_updated_at before update on public.support_tickets
  for each row execute function public.set_updated_at();

create table if not exists public.ticket_messages (
  id              uuid primary key default gen_random_uuid(),
  ticket_id       uuid not null references public.support_tickets (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  body            text,
  author_id       uuid,
  author_name     text,
  author_role     text,
  created_at      timestamptz not null default now()
);
create index if not exists ticket_messages_ticket_idx on public.ticket_messages (ticket_id, created_at);

do $$ begin
  alter table public.support_tickets enable row level security;
exception when others then null; end $$;

do $$ begin
  alter table public.ticket_messages enable row level security;
exception when others then null; end $$;

do $$ begin
  drop policy if exists support_tickets_platform_all on public.support_tickets;
  create policy support_tickets_platform_all on public.support_tickets
    for all using (public.is_platform_admin()) with check (public.is_platform_admin());
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists support_tickets_mgr_all on public.support_tickets;
  create policy support_tickets_mgr_all on public.support_tickets
    for all using (public.is_org_manager(organization_id))
    with check (public.is_org_manager(organization_id));
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists support_tickets_staff_read on public.support_tickets;
  create policy support_tickets_staff_read on public.support_tickets
    for select using (public.belongs_to_org(organization_id));
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists support_tickets_staff_create on public.support_tickets;
  create policy support_tickets_staff_create on public.support_tickets
    for insert with check (public.belongs_to_org(organization_id));
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists ticket_messages_platform_all on public.ticket_messages;
  create policy ticket_messages_platform_all on public.ticket_messages
    for all using (public.is_platform_admin()) with check (public.is_platform_admin());
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists ticket_messages_org_all on public.ticket_messages;
  create policy ticket_messages_org_all on public.ticket_messages
    for all using (public.belongs_to_org(organization_id))
    with check (public.belongs_to_org(organization_id));
exception when duplicate_object then null; end $$;

-- ═════════════════════════════════════════════════════════════════════════════
-- 0006_haraka.sql — Haraka/POS + Raseed schema
-- ═════════════════════════════════════════════════════════════════════════════

alter table public.inventory_items
  add column if not exists pos_enabled boolean not null default false,
  add column if not exists barcode     text,
  add column if not exists tax_rate_id uuid,
  add column if not exists pos_price   numeric;
create index if not exists inventory_items_org_barcode_idx
  on public.inventory_items (organization_id, barcode) where barcode is not null;

alter table public.inventory_transactions
  add column if not exists source              text,
  add column if not exists purchase_id         uuid,
  add column if not exists pos_transaction_id  uuid;

alter table public.organizations
  add column if not exists fawtara jsonb;

create table if not exists public.organizations_private (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  fawtara         jsonb,
  updated_at      timestamptz not null default now()
);

do $$ begin
  alter table public.organizations_private enable row level security;
exception when others then null; end $$;

create table if not exists public.tax_rates (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name            text not null,
  rate            numeric not null default 0,
  is_default      boolean not null default false,
  created_at      timestamptz not null default now(),
  created_by      uuid,
  updated_at      timestamptz not null default now(),
  updated_by      uuid
);
create index if not exists tax_rates_org_idx on public.tax_rates (organization_id);
create or replace trigger tax_rates_set_updated_at before update on public.tax_rates
  for each row execute function public.set_updated_at();

do $$ begin
  alter table public.tax_rates enable row level security;
exception when others then null; end $$;

do $$ begin
  drop policy if exists tax_rates_platform_all on public.tax_rates;
  create policy tax_rates_platform_all on public.tax_rates
    for all using (public.is_platform_admin()) with check (public.is_platform_admin());
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists tax_rates_mgr_all on public.tax_rates;
  create policy tax_rates_mgr_all on public.tax_rates
    for all using (public.is_org_manager(organization_id))
    with check (public.is_org_manager(organization_id));
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists tax_rates_staff_read on public.tax_rates;
  create policy tax_rates_staff_read on public.tax_rates
    for select using (public.belongs_to_org(organization_id));
exception when duplicate_object then null; end $$;

create table if not exists public.purchases (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references public.organizations (id) on delete cascade,
  supplier_name        text not null,
  supplier_contact     text,
  invoice_number       text,
  invoice_date         timestamptz not null,
  received_date        timestamptz,
  status               text not null default 'draft',
  lines                jsonb not null default '[]'::jsonb,
  subtotal             numeric not null default 0,
  tax_total            numeric not null default 0,
  total                numeric not null default 0,
  notes                text,
  update_item_unit_cost boolean not null default false,
  created_at           timestamptz not null default now(),
  created_by           uuid,
  created_by_email     text,
  created_by_name      text,
  updated_at           timestamptz not null default now(),
  updated_by           uuid,
  updated_by_email     text,
  updated_by_name      text,
  received_by          uuid,
  received_by_name     text
);
create index if not exists purchases_org_idx on public.purchases (organization_id, invoice_date desc);
create or replace trigger purchases_set_updated_at before update on public.purchases
  for each row execute function public.set_updated_at();

do $$ begin
  alter table public.purchases enable row level security;
exception when others then null; end $$;

do $$ begin
  drop policy if exists purchases_platform_all on public.purchases;
  create policy purchases_platform_all on public.purchases
    for all using (public.is_platform_admin()) with check (public.is_platform_admin());
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists purchases_mgr_all on public.purchases;
  create policy purchases_mgr_all on public.purchases
    for all using (public.is_org_manager(organization_id))
    with check (public.is_org_manager(organization_id));
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists purchases_staff_read on public.purchases;
  create policy purchases_staff_read on public.purchases
    for select using (public.belongs_to_org(organization_id));
exception when duplicate_object then null; end $$;

create table if not exists public.pos_sessions (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  location_id     text not null default 'default',
  cashier_id      uuid,
  cashier_name    text,
  opened_at       timestamptz not null default now(),
  closed_at       timestamptz,
  status          text not null default 'open',
  opening_float   numeric not null default 0,
  closing_float   numeric,
  expected_float  numeric,
  discrepancy     numeric,
  close_notes     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists pos_sessions_org_cashier_idx
  on public.pos_sessions (organization_id, cashier_id, status);
create or replace trigger pos_sessions_set_updated_at before update on public.pos_sessions
  for each row execute function public.set_updated_at();

do $$ begin
  alter table public.pos_sessions enable row level security;
exception when others then null; end $$;

do $$ begin
  drop policy if exists pos_sessions_platform_all on public.pos_sessions;
  create policy pos_sessions_platform_all on public.pos_sessions
    for all using (public.is_platform_admin()) with check (public.is_platform_admin());
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists pos_sessions_mgr_all on public.pos_sessions;
  create policy pos_sessions_mgr_all on public.pos_sessions
    for all using (public.is_org_manager(organization_id))
    with check (public.is_org_manager(organization_id));
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists pos_sessions_staff_rw on public.pos_sessions;
  create policy pos_sessions_staff_rw on public.pos_sessions
    for all using (public.belongs_to_org(organization_id))
    with check (public.belongs_to_org(organization_id));
exception when duplicate_object then null; end $$;

create table if not exists public.pos_transactions (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations (id) on delete cascade,
  session_id            uuid,
  location_id           text not null default 'default',
  cashier_id            uuid,
  cashier_name          text,
  customer_id           uuid,
  customer_name         text,
  items                 jsonb not null default '[]'::jsonb,
  subtotal              numeric not null default 0,
  tax_amount            numeric not null default 0,
  discount_amount       numeric not null default 0,
  total                 numeric not null default 0,
  payments              jsonb not null default '[]'::jsonb,
  change                numeric not null default 0,
  status                text not null default 'completed',
  receipt_number        text,
  offline_id            text,
  synced_at             timestamptz,
  parent_transaction_id uuid,
  fawtara               jsonb,
  refund_reason         text,
  voided_by             uuid,
  voided_at             timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists pos_tx_org_created_idx on public.pos_transactions (organization_id, created_at desc);
create index if not exists pos_tx_session_idx on public.pos_transactions (session_id);
create index if not exists pos_tx_offline_idx on public.pos_transactions (organization_id, offline_id);
create index if not exists pos_tx_parent_idx on public.pos_transactions (parent_transaction_id);
create or replace trigger pos_tx_set_updated_at before update on public.pos_transactions
  for each row execute function public.set_updated_at();

do $$ begin
  alter table public.pos_transactions enable row level security;
exception when others then null; end $$;

do $$ begin
  drop policy if exists pos_tx_platform_all on public.pos_transactions;
  create policy pos_tx_platform_all on public.pos_transactions
    for all using (public.is_platform_admin()) with check (public.is_platform_admin());
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists pos_tx_mgr_all on public.pos_transactions;
  create policy pos_tx_mgr_all on public.pos_transactions
    for all using (public.is_org_manager(organization_id))
    with check (public.is_org_manager(organization_id));
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists pos_tx_staff_rw on public.pos_transactions;
  create policy pos_tx_staff_rw on public.pos_transactions
    for all using (public.belongs_to_org(organization_id))
    with check (public.belongs_to_org(organization_id));
exception when duplicate_object then null; end $$;

create table if not exists public.pos_customers (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name            text not null default '',
  phone           text,
  email           text,
  tax_number      text,
  notes           text,
  created_at      timestamptz not null default now(),
  created_by      uuid,
  updated_at      timestamptz not null default now(),
  updated_by      uuid
);
create index if not exists pos_customers_org_idx on public.pos_customers (organization_id);
create or replace trigger pos_customers_set_updated_at before update on public.pos_customers
  for each row execute function public.set_updated_at();

do $$ begin
  alter table public.pos_customers enable row level security;
exception when others then null; end $$;

do $$ begin
  drop policy if exists pos_customers_platform_all on public.pos_customers;
  create policy pos_customers_platform_all on public.pos_customers
    for all using (public.is_platform_admin()) with check (public.is_platform_admin());
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists pos_customers_mgr_all on public.pos_customers;
  create policy pos_customers_mgr_all on public.pos_customers
    for all using (public.is_org_manager(organization_id))
    with check (public.is_org_manager(organization_id));
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists pos_customers_staff_rw on public.pos_customers;
  create policy pos_customers_staff_rw on public.pos_customers
    for all using (public.belongs_to_org(organization_id))
    with check (public.belongs_to_org(organization_id));
exception when duplicate_object then null; end $$;

create table if not exists public.pos_receipt_counters (
  organization_id      uuid primary key references public.organizations (id) on delete cascade,
  last_receipt_number  bigint not null default 0,
  updated_at           timestamptz not null default now()
);

do $$ begin
  alter table public.pos_receipt_counters enable row level security;
exception when others then null; end $$;

create table if not exists public.fawtara_counters (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  year            integer,
  last_sequence   bigint not null default 0,
  updated_at      timestamptz not null default now()
);

do $$ begin
  alter table public.fawtara_counters enable row level security;
exception when others then null; end $$;

do $$ begin
  drop policy if exists fawtara_counters_read on public.fawtara_counters;
  create policy fawtara_counters_read on public.fawtara_counters
    for select using (
      public.is_platform_admin() or public.is_org_manager(organization_id)
    );
exception when duplicate_object then null; end $$;

-- ═════════════════════════════════════════════════════════════════════════════
-- seed-test-data.sql — Test data (20 orgs, 60 users, 300+ assets)
-- ═════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════
-- Makhzoon — Seed Test Data
-- 20 Organizations × (Owner + Admin + Staff) × 15+ Assets each
-- Covers all statuses, types, and configurations.
--
-- Password for ALL users: QAZwsx@1212
-- Emails: *@test.com
--
-- Run in Supabase SQL Editor (service_role — bypasses RLS).
-- ═══════════════════════════════════════════════════════════════════════

do $$
declare
  org_ids            uuid[] := '{}';
  owner_ids          uuid[] := '{}';
  admin_ids          uuid[] := '{}';
  staff_ids          uuid[] := '{}';
  org_asset_ids      uuid[];
  org_warranty_ids   uuid[];
  org_inv_item_ids   uuid[];

  org_id     uuid;
  owner_id   uuid;
  admin_id   uuid;
  staff_id   uuid;
  asset_id   uuid;
  warranty_id uuid;
  inv_item_id uuid;

  i int; j int; k int;

  cats       text[] := array['devices','hardware','furniture','software'];
  locs       text[] := array['Main Office','Warehouse','Branch Office','Remote'];
  vendors_t  text[] := array['TechMart Solutions','Office Depot Pro','Global Systems Inc','Digital Warehouse','Corporate Supplies Co'];
  units_t    text[] := array['each','box','pack','pair','roll'];
  asset_pool text[] := array[
    'Dell Latitude 5430 Laptop','HP LaserJet Pro M404dn','Standing Desk Pro','Office Chair Ergonomic',
    'Cisco Meraki MX64 Firewall','MacBook Pro 16" M3','Samsung 27" Monitor','Logitech C920 Webcam',
    'Server Rack 42U','UPS APC 1500VA','Canon ImageRUNNER C3530i','Conference Room Speaker',
    'Apple iPad Pro 12.9"','BenQ Projector MH760','Poly Studio Soundbar','LG 65" 4K Display',
    'Samsung Galaxy Tab S9','Dell Precision 5820 Tower','HP EliteBook 840 G10','Asus ZenBook Pro',
    'MikroTik Router CCR1036','Synology DS1823xs+ NAS','Cisco Catalyst 9200 Switch','APC Smart-UPS 3000',
    'Herman Miller Aeron Chair','IKEA Bekant Desk 160cm','Yealink MP56 Teams Phone','Logitech Zone Wireless Headset'
  ];

  superadmin_id uuid := gen_random_uuid();
  pkg_starter   uuid;
  pkg_business  uuid;
  pkg_enterprise uuid;

begin
  -- ═══════════════════════════════════════════════════════════════════════════
  -- 1. Packages (3 tiers)
  -- ═══════════════════════════════════════════════════════════════════════════
  pkg_starter := gen_random_uuid();
  insert into public.packages (id, name, description, is_active, limits, features) values
    (pkg_starter, 'Starter', 'For small teams just getting started', true,
     '{"maxAssets":50,"maxUsers":5,"maxWarranties":25,"maxRequests":10}'::jsonb,
     '{"dashboard":true,"assets":true,"inventory":false,"warranties":false,"requests":false,"reports":false,"support":true,"auditLogs":false,"maintenance":false,"assetCheckouts":false,"assetNotes":false,"pos":false}'::jsonb);

  pkg_business := gen_random_uuid();
  insert into public.packages (id, name, description, is_active, limits, features) values
    (pkg_business, 'Business', 'Growing organizations that need full asset tracking',
     true,
     '{"maxAssets":500,"maxUsers":25,"maxWarranties":200,"maxRequests":100}'::jsonb,
     '{"dashboard":true,"assets":true,"inventory":true,"warranties":true,"requests":true,"reports":true,"support":true,"auditLogs":true,"maintenance":true,"assetCheckouts":true,"assetNotes":true,"pos":false}'::jsonb);

  pkg_enterprise := gen_random_uuid();
  insert into public.packages (id, name, description, is_active, limits, features) values
    (pkg_enterprise, 'Enterprise', 'Full platform with POS and unlimited everything',
     true,
     '{"maxAssets":-1,"maxUsers":-1,"maxWarranties":-1,"maxRequests":-1}'::jsonb,
     '{"dashboard":true,"assets":true,"inventory":true,"warranties":true,"requests":true,"reports":true,"support":true,"auditLogs":true,"maintenance":true,"assetCheckouts":true,"assetNotes":true,"pos":true}'::jsonb);

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 2. Superadmin (platform access)
  -- ═══════════════════════════════════════════════════════════════════════════
  insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, role, aud, created_at, updated_at)
    values (superadmin_id, 'superadmin@test.com',
            crypt('QAZwsx@1212', gen_salt('bf', 10)),
            now(), '{"display_name":"Super Admin"}'::jsonb,
            'authenticated', 'authenticated', now(), now());
  insert into public.users (id, email, display_name, role, status) values
    (superadmin_id, 'superadmin@test.com', 'Super Admin', 'super_admin', 'active');
  insert into public.superadmin_users (id, email, display_name, role, status) values
    (superadmin_id, 'superadmin@test.com', 'Super Admin', 'super_admin', 'active');

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 3. Loop: 20 Organizations
  -- ═══════════════════════════════════════════════════════════════════════════
  <<org_loop>>
  for i in 1..20 loop
    -- ── Organization ──────────────────────────────────────────────────────
    org_id := gen_random_uuid();
    org_ids := array_append(org_ids, org_id);

    insert into public.organizations (id, name, subdomain, contact_email, description, category, package_details, created_by)
    values (
      org_id,
      'Org-' || i || ' ' || case (i % 4)
        when 1 then 'Tech Solutions'
        when 2 then 'Retail Hub'
        when 3 then 'HealthCare Plus'
        else 'EduLearn Academy'
      end,
      'org' || i,
      'org' || i || '@test.com',
      'Seed organization #' || i || ' for testing all modules and statuses.',
      case (i % 4) when 1 then 'technology' when 2 then 'retail' when 3 then 'healthcare' else 'education' end,
      '{}'::jsonb,
      superadmin_id
    );

    -- ── Organization Config ───────────────────────────────────────────────
    insert into public.organization_configs (organization_id, asset_statuses, locations, categories, created_by)
    values (
      org_id,
      '[
        {"id":"active","label":"Active","color":"#22c55e"},
        {"id":"inactive","label":"Inactive","color":"#9ca3af"},
        {"id":"maintenance","label":"Under Maintenance","color":"#f59e0b"},
        {"id":"retired","label":"Retired","color":"#ef4444"}
      ]'::jsonb,
      format(
        '[
          {"id":"loc-%s-1","name":"Main Office"},
          {"id":"loc-%s-2","name":"Warehouse"},
          {"id":"loc-%s-3","name":"Branch Office"},
          {"id":"loc-%s-4","name":"Remote"}
        ]', i, i, i, i)::jsonb,
      '[
        {"id":"devices","name":"Devices"},
        {"id":"hardware","name":"Hardware"},
        {"id":"furniture","name":"Furniture"},
        {"id":"software","name":"Software"}
      ]'::jsonb,
      superadmin_id
    );

    -- ── Subscription (rotate through statuses) ────────────────────────────
    insert into public.subscriptions (organization_id, package_id, features, package_details, start_date, end_date, status, created_by)
    values (
      org_id,
      case
        when i <= 7  then pkg_starter
        when i <= 14 then pkg_business
        else              pkg_enterprise
      end,
      '{}'::jsonb,
      '{}'::jsonb,
      '2025-01-01'::timestamptz,
      case
        when i % 3 = 1 then '2026-12-31'::timestamptz   -- ACTIVE
        when i % 3 = 2 then '2024-12-31'::timestamptz   -- EXPIRED
        else                 '2026-06-30'::timestamptz   -- ACTIVE (different end)
      end,
      case (i % 3) when 1 then 'ACTIVE' when 2 then 'EXPIRED' else 'SUSPENDED' end,
      superadmin_id
    );

    -- ── Tax Rates ─────────────────────────────────────────────────────────
    insert into public.tax_rates (organization_id, name, rate, is_default, created_by) values
      (org_id, 'VAT 15%', 0.15, true, superadmin_id),
      (org_id, 'VAT 5%',  0.05, false, superadmin_id);

    -- ── Auth: Owner ──────────────────────────────────────────────────────
    owner_id := gen_random_uuid();
    owner_ids := array_append(owner_ids, owner_id);
    insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, role, aud, created_at, updated_at)
      values (owner_id, 'owner' || i || '@test.com',
              crypt('QAZwsx@1212', gen_salt('bf', 10)),
              now(), format('{"display_name":"Owner %s"}', i)::jsonb,
              'authenticated', 'authenticated', now(), now());
    insert into public.users (id, organization_id, email, display_name, role, status, created_by) values
      (owner_id, org_id, 'owner' || i || '@test.com', 'Owner ' || i, 'org_owner', 'active', superadmin_id);

    -- ── Auth: Admin ──────────────────────────────────────────────────────
    admin_id := gen_random_uuid();
    admin_ids := array_append(admin_ids, admin_id);
    insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, role, aud, created_at, updated_at)
      values (admin_id, 'admin' || i || '@test.com',
              crypt('QAZwsx@1212', gen_salt('bf', 10)),
              now(), format('{"display_name":"Admin %s"}', i)::jsonb,
              'authenticated', 'authenticated', now(), now());
    insert into public.users (id, organization_id, email, display_name, role, status, created_by) values
      (admin_id, org_id, 'admin' || i || '@test.com', 'Admin ' || i, 'admin', 'active', owner_id);

    -- ── Auth: Staff ──────────────────────────────────────────────────────
    staff_id := gen_random_uuid();
    staff_ids := array_append(staff_ids, staff_id);
    insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, role, aud, created_at, updated_at)
      values (staff_id, 'staff' || i || '@test.com',
              crypt('QAZwsx@1212', gen_salt('bf', 10)),
              now(), format('{"display_name":"Staff %s"}', i)::jsonb,
              'authenticated', 'authenticated', now(), now());
    insert into public.users (id, organization_id, email, display_name, role, status, created_by) values
      (staff_id, org_id, 'staff' || i || '@test.com', 'Staff ' || i, 'staff', 'active', superadmin_id);

    -- ──────────────────────────────────────────────────────────────────────
    -- Assets (15-18 per org = 300+ total)
    -- Cover statuses: active, inactive, maintenance, retired
    -- ──────────────────────────────────────────────────────────────────────
    org_asset_ids := '{}';
    for j in 1..15 + (i % 4) loop
      asset_id := gen_random_uuid();
      org_asset_ids := array_append(org_asset_ids, asset_id);

      insert into public.assets (
        id, organization_id, name, category, status, serial_number,
        purchase_date, purchase_cost, assigned_to, location, notes,
        created_by, created_by_email, created_by_name, created_by_role
      ) values (
        asset_id, org_id,
        asset_pool[1 + ((j - 1 + i) % array_length(asset_pool, 1))],
        cats[1 + ((j - 1) % array_length(cats, 1))],
        case (j % 4)
          when 0 then 'active'
          when 1 then 'active'
          when 2 then 'inactive'
          when 3 then 'maintenance'
          else        'retired'
        end,
        'SN-' || i || '-' || lpad(j::text, 4, '0'),
        '2024-01-01'::timestamptz + make_interval(months => j - 1),
        ((j * 700 + 200 + i * 100) % 15000 + 200)::numeric,
        case when j % 3 = 0 then 'Staff Member' else null end,
        locs[1 + ((j - 1) % array_length(locs, 1))],
        'Asset #' || j || ' for organization ' || i,
        admin_id, 'admin' || i || '@test.com', 'Admin ' || i, 'admin'
      );
    end loop;

    -- ──────────────────────────────────────────────────────────────────────
    -- Asset Notes (1 per asset for first 10 assets)
    -- ──────────────────────────────────────────────────────────────────────
    for j in 1..least(10, array_length(org_asset_ids, 1)) loop
      insert into public.asset_notes (organization_id, asset_id, text, created_by, created_by_email)
      values (org_id, org_asset_ids[j], 'Initial setup note for asset', admin_id, 'admin' || i || '@test.com');
    end loop;

    -- ──────────────────────────────────────────────────────────────────────
    -- Maintenance Records (1 per asset for first 8 assets)
    -- ──────────────────────────────────────────────────────────────────────
    for j in 1..least(8, array_length(org_asset_ids, 1)) loop
      insert into public.maintenance_records (
        organization_id, asset_id, type, description, performed_by, cost, date, created_by, created_by_email
      ) values (
        org_id, org_asset_ids[j],
        case (j % 3) when 1 then 'repair' when 2 then 'inspection' else 'upgrade' end,
        'Routine ' || case (j % 3) when 1 then 'repair' when 2 then 'inspection' else 'upgrade' end || ' performed',
        'Tech Support Team',
        (50 + j * 100 + i * 50)::numeric,
        '2025-06-01'::timestamptz + make_interval(months => j - 1),
        admin_id, 'admin' || i || '@test.com'
      );
    end loop;

    -- ──────────────────────────────────────────────────────────────────────
    -- Asset Checkouts (1 per asset for first 6 assets)
    -- ──────────────────────────────────────────────────────────────────────
    for j in 1..least(6, array_length(org_asset_ids, 1)) loop
      insert into public.asset_checkouts (
        organization_id, asset_id, checked_out_to, checked_out_by, checked_out_by_email,
        due_date, notes, checked_out_at, returned_at, returned_by
      ) values (
        org_id, org_asset_ids[j],
        'Employee #' || j,
        admin_id, 'admin' || i || '@test.com',
        '2025-12-31'::timestamptz,
        'Checked out for project work',
        '2025-01-15'::timestamptz + make_interval(months => j - 1),
        case when j % 2 = 0 then '2025-06-15'::timestamptz + make_interval(months => j - 1) else null end,
        case when j % 2 = 0 then staff_id else null end
      );
    end loop;

    -- ──────────────────────────────────────────────────────────────────────
    -- Warranties (1 per asset for first 12 assets)
    -- ──────────────────────────────────────────────────────────────────────
    org_warranty_ids := '{}';
    for j in 1..least(12, array_length(org_asset_ids, 1)) loop
      warranty_id := gen_random_uuid();
      org_warranty_ids := array_append(org_warranty_ids, warranty_id);
      insert into public.warranties (
        id, organization_id, asset_id, vendor, start_date, end_date, reminder, notes, created_by
      ) values (
        warranty_id, org_id, org_asset_ids[j],
        vendors_t[1 + ((j - 1) % array_length(vendors_t, 1))],
        '2024-06-01'::timestamptz + make_interval(months => j - 1),
        case (j % 4)
          when 0 then '2027-06-01'::timestamptz   -- active (far future)
          when 1 then '2026-08-01'::timestamptz   -- active (near future)
          when 2 then '2025-06-01'::timestamptz   -- expired
          else        '2026-11-01'::timestamptz   -- expiring soon
        end,
        true, 'Warranty for ' || asset_pool[1 + ((j - 1 + i) % array_length(asset_pool, 1))],
        admin_id
      );
    end loop;

    -- ──────────────────────────────────────────────────────────────────────
    -- Requests (4 per org)
    -- ──────────────────────────────────────────────────────────────────────
    insert into public.requests (organization_id, type, description, status, created_by, updated_by)
    values (org_id, 'BUY_NEW', 'Request to purchase new equipment', 'APPROVED', staff_id, admin_id);

    insert into public.requests (organization_id, type, asset_id, description, status, decision_by, decision_at, created_by)
    values (org_id, 'RETIRE', org_asset_ids[1], 'Request to retire old asset', 'PENDING', null, null, staff_id);

    insert into public.requests (organization_id, type, inventory_item_id, description, status, created_by)
    values (org_id, 'REFILL', null, 'Request to restock supplies', 'REJECTED', staff_id);

    insert into public.requests (organization_id, type, asset_id, warranty_id, description, status, created_by)
    values (org_id, 'EXTEND_WARRANTY', org_asset_ids[2], org_warranty_ids[1], 'Request to extend warranty coverage', 'PENDING', staff_id);

    -- ──────────────────────────────────────────────────────────────────────
    -- Inventory Items (6 per org)
    -- ──────────────────────────────────────────────────────────────────────
    org_inv_item_ids := '{}';
    for j in 1..6 loop
      inv_item_id := gen_random_uuid();
      org_inv_item_ids := array_append(org_inv_item_ids, inv_item_id);
      insert into public.inventory_items (
        id, organization_id, name, category, sku, unit,
        quantity_on_hand, minimum_threshold, reorder_quantity,
        location, supplier, unit_cost, stock_status, created_by,
        created_by_email, created_by_name
      ) values (
        inv_item_id, org_id,
        case j
          when 1 then 'Premium Copy Paper A4 (5000 sheets)'
          when 2 then 'Ballpoint Pens (Blue, Box of 50)'
          when 3 then 'Heavy Duty Stapler'
          when 4 then 'Sticky Notes 3x3 (Pack of 12)'
          when 5 then 'Expanding File Folders (Box of 25)'
          else        'Office Glue Sticks (Pack of 20)'
        end,
        case j when 1 then 'supplies' when 2 then 'supplies' when 3 then 'tools' when 4 then 'supplies' when 5 then 'supplies' else 'supplies' end,
        'SKU-' || i || '-' || lpad(j::text, 3, '0'),
        units_t[1 + ((j - 1) % array_length(units_t, 1))],
        case (j % 3)
          when 0 then 100   -- ok
          when 1 then 5     -- low  (threshold = 10)
          else        0     -- out
        end,
        10,  -- threshold
        50,  -- reorder qty
        'Warehouse Shelf ' || j,
        vendors_t[1 + ((j - 1) % array_length(vendors_t, 1))],
        (5 + j * 15 + i)::numeric,
        case (j % 3) when 0 then 'ok' when 1 then 'low' else 'out' end,
        admin_id, 'admin' || i || '@test.com', 'Admin ' || i
      );

      -- ── Inventory Transactions (1 per item) ─────────────────────────────
      insert into public.inventory_transactions (
        organization_id, item_id, item_name, type, quantity,
        quantity_before, quantity_after, reason, note,
        performed_by, performed_by_email, performed_by_name, performed_by_role
      ) values (
        org_id, inv_item_id,
        case j
          when 1 then 'Premium Copy Paper A4 (5000 sheets)'
          when 2 then 'Ballpoint Pens (Blue, Box of 50)'
          when 3 then 'Heavy Duty Stapler'
          when 4 then 'Sticky Notes 3x3 (Pack of 12)'
          when 5 then 'Expanding File Folders (Box of 25)'
          else        'Office Glue Sticks (Pack of 20)'
        end,
        case (j % 3) when 0 then 'in' when 1 then 'out' else 'adjustment' end,
        case (j % 3) when 0 then 50 when 1 then 10 else 5 end,
        case (j % 3) when 0 then 50 else 105 end,
        case (j % 3) when 0 then 100 when 1 then 95 else 100 end,
        'Initial stock setup',
        case (j % 3) when 0 then 'Purchase order received' when 1 then 'Staff consumption' else 'Inventory count adjustment' end,
        admin_id, 'admin' || i || '@test.com', 'Admin ' || i, 'admin'
      );
    end loop;

    -- ──────────────────────────────────────────────────────────────────────
    -- Purchases (2 per org)
    -- ──────────────────────────────────────────────────────────────────────
    insert into public.purchases (
      organization_id, supplier_name, supplier_contact, invoice_number,
      invoice_date, status, lines, subtotal, tax_total, total,
      update_item_unit_cost, created_by, created_by_email, created_by_name
    ) values (
      org_id, vendors_t[1 + (i % array_length(vendors_t, 1))], '+966-55-123-4567',
      'INV-' || i || '-001',
      '2025-03-15'::timestamptz, 'received',
      format(
        '[{"itemId":"%s","itemName":"Premium Copy Paper A4","sku":"SKU-%s-001","barcode":null,"quantity":10,"unitCost":25,"taxRateId":null,"taxAmount":0,"lineTotal":250,"notes":null}]',
        org_inv_item_ids[1], i
      )::jsonb,
      250, 0, 250, true,
      admin_id, 'admin' || i || '@test.com', 'Admin ' || i
    );

    insert into public.purchases (
      organization_id, supplier_name, invoice_number,
      invoice_date, status, lines, subtotal, tax_total, total,
      update_item_unit_cost, created_by, created_by_email, created_by_name
    ) values (
      org_id, vendors_t[1 + ((i + 1) % array_length(vendors_t, 1))],
      'INV-' || i || '-002',
      '2025-05-01'::timestamptz, 'draft',
      format(
        '[{"itemId":"%s","itemName":"Office Chairs","sku":"SKU-%s-002","barcode":null,"quantity":5,"unitCost":350,"taxRateId":null,"taxAmount":0,"lineTotal":1750,"notes":"Pending approval"}]',
        org_inv_item_ids[2], i
      )::jsonb,
      1750, 0, 1750, false,
      admin_id, 'admin' || i || '@test.com', 'Admin ' || i
    );

    -- ──────────────────────────────────────────────────────────────────────
    -- POS Customers (3 per org)
    -- ──────────────────────────────────────────────────────────────────────
    insert into public.pos_customers (organization_id, name, phone, email, created_by) values
      (org_id, 'Ahmed Al-Saud', '+966-50-111-1111', 'ahmed.a@example.com', admin_id),
      (org_id, 'Sara Al-Qahtani', '+966-55-222-2222', 'sara.q@example.com', admin_id),
      (org_id, 'Khalid Al-Otaibi', '+966-53-333-3333', 'khalid.o@example.com', admin_id);

    -- ──────────────────────────────────────────────────────────────────────
    -- POS Sessions (1 per org)
    -- ──────────────────────────────────────────────────────────────────────
    insert into public.pos_sessions (organization_id, location_id, cashier_id, cashier_name, opened_at, status) values
      (org_id, 'Main Office', staff_id, 'Staff ' || i, '2025-06-01 08:00:00+00', 'open');

    -- ──────────────────────────────────────────────────────────────────────
    -- Support Ticket (1 per org)
    -- ──────────────────────────────────────────────────────────────────────
    declare
      ticket_id uuid := gen_random_uuid();
    begin
      insert into public.support_tickets (id, organization_id, subject, description, status, priority, created_by) values
        (ticket_id, org_id, 'Need help with asset setup', 'We are having trouble setting up our new assets in the system.', 'OPEN', 'MEDIUM', owner_id);
      insert into public.ticket_messages (ticket_id, organization_id, body, author_id, author_name, author_role) values
        (ticket_id, org_id, 'Hi team, can you please guide us through the asset import process?', owner_id, 'Owner ' || i, 'org_owner'),
        (ticket_id, org_id, 'Sure, I will send you the documentation shortly.', superadmin_id, 'Super Admin', 'super_admin');
    end;

    -- ──────────────────────────────────────────────────────────────────────
    -- Audit Log (2 per org)
    -- ──────────────────────────────────────────────────────────────────────
    insert into public.audit_logs (organization_id, user_id, role, action, module, record_id, new_value, timestamp) values
      (org_id, admin_id, 'admin', 'create', 'asset', org_asset_ids[1]::text,
        json_build_object('name', asset_pool[1 + (i % array_length(asset_pool, 1))])::jsonb, now()),
      (org_id, admin_id, 'admin', 'update', 'asset', org_asset_ids[2]::text,
       format('{"status":"inactive"}')::jsonb, now());

  end loop org_loop;

  raise notice '✅ Seed complete: 20 orgs, 60 users, 300+ assets, warranties, inventory & more.';
  raise notice '   Password for all accounts: QAZwsx@1212';
  raise notice '   Superadmin: superadmin@test.com';
  raise notice '   Org owners: owner1@test.com … owner20@test.com';
  raise notice '   Admins:     admin1@test.com … admin20@test.com';
  raise notice '   Staff:      staff1@test.com … staff20@test.com';
end $$;
