-- Makhzoon — Supabase Postgres schema (Phase 1: foundation + core tenant tables)
-- Greenfield migration from Firestore. No data is migrated.
--
-- Scope of this file: extensions, enums, RLS helper functions, the shared
-- audit-column convention, and the CORE tables that were precisely mapped
-- from the existing Firestore data layer:
--   organizations, users, packages, subscriptions, assets,
--   inventory_items, inventory_transactions, invites, organization_configs
--
-- Module tables (warranties, requests, audit_logs, asset_notes,
-- maintenance_records, asset_checkouts, tax_rates, purchases, pos_sessions,
-- pos_transactions, pos_customers, fawtara_counters, payment_logs,
-- support_tickets, backend_logs, early_access, contact_sales,
-- password_reset_tokens, usage, reports, superadmin_users, inventory_audits)
-- are intentionally NOT defined here. They are added in their own migration
-- alongside the Phase 3 rewrite of each module repository, so columns come
-- from the real code rather than guesswork.

create extension if not exists "pgcrypto";          -- gen_random_uuid()
create extension if not exists "pg_trgm";           -- case-insensitive search

-- ── Roles ──────────────────────────────────────────────────────────────────
-- Mirrors UserRole in types/. Platform (makhzoon-side) roles are not scoped to
-- an organization; org roles always are.
do $$ begin
  create type public.user_role as enum (
    'super_admin', 'makhzoon_admin', 'makhzoon_support',  -- platform
    'org_owner', 'admin', 'staff'                          -- tenant
  );
exception when duplicate_object then null; end $$;

-- ── updated_at trigger ─────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ── Auth helpers ───────────────────────────────────────────────────────────
-- NOTE: the SECURITY DEFINER helpers (app_role/app_org/is_platform_admin/
-- is_org_manager/belongs_to_org) are defined at the END of this file, AFTER
-- the tables. LANGUAGE sql function bodies are validated at creation time, so
-- they cannot reference public.users before it exists.

-- ── organizations ──────────────────────────────────────────────────────────
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

-- ── users (app profile; auth lives in auth.users) ──────────────────────────
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

-- ── packages (platform plans) ──────────────────────────────────────────────
create table if not exists public.packages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text not null default '',
  is_active   boolean not null default true,
  -- { maxAssets, maxUsers, maxWarranties, maxRequests } ; -1 = unlimited
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

-- ── subscriptions (one active per org) ─────────────────────────────────────
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

-- ── assets ─────────────────────────────────────────────────────────────────
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

-- ── inventory_items ────────────────────────────────────────────────────────
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
  -- 'ok' | 'low' | 'out' ; kept denormalized like the Firestore model
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

-- ── inventory_transactions (append-only ledger) ────────────────────────────
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

-- ── invites ────────────────────────────────────────────────────────────────
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

-- ── organization_configs (one row per org; PK = org id) ────────────────────
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

-- ── Auth helpers (SECURITY DEFINER) ────────────────────────────────────────
-- Defined after the tables (see note above). The legacy app treats the users
-- record as authoritative for role/org (token claims only refresh at sign-in);
-- RLS resolves the caller's role/org from public.users by auth.uid(), NOT from
-- JWT claims. Order matters: app_role/app_org first, then the predicates that
-- call them.

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

-- Platform staff: full cross-tenant access (super_admin & makhzoon_*).
create or replace function public.is_platform_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    public.app_role() in ('super_admin', 'makhzoon_admin', 'makhzoon_support'),
    false)
$$;

-- Org manager: admin or org_owner within the given org.
create or replace function public.is_org_manager(org uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    public.app_role() in ('admin', 'org_owner') and public.app_org() = org,
    false)
$$;

-- Any member (incl. staff) of the given org.
create or replace function public.belongs_to_org(org uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.app_org() = org, false)
$$;
