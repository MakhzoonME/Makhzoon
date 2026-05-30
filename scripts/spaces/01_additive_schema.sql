-- ═══════════════════════════════════════════════════════════════════
-- Spaces feature — Script 1: Additive schema
-- ═══════════════════════════════════════════════════════════════════
-- WHAT THIS DOES
--   Creates the spaces + space_members tables, adds users.all_spaces,
--   and adds a nullable space_id column to every space-scoped table.
--   No data is changed. No constraints are tightened. No RLS changes.
--
-- WHEN TO RUN
--   Safe to run anytime — fully additive. Paste into the Supabase
--   SQL editor. Idempotent (safe to re-run).
--
-- PER-ENV CHECKLIST
--   [ ] dev      [ ] staging      [ ] prod
--
-- NEXT STEPS
--   Script 2 → backfill (Default space per org, set space_id, etc.)
--   Script 3 → constraints + RLS (set NOT NULL, FKs, can_access_space,
--              policies, default-space triggers, per-space uniqueness)
-- ═══════════════════════════════════════════════════════════════════


-- ── 1. spaces ─────────────────────────────────────────────────────
-- A "space" is a fully isolated sub-tenant inside an organization
-- (branch / warehouse / store).
create table if not exists public.spaces (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name            text not null,
  slug            text not null,
  status          text not null default 'active'
                   check (status in ('active', 'archived')),
  is_default      boolean not null default false,
  created_at      timestamptz not null default now(),
  created_by      uuid,
  updated_at      timestamptz not null default now(),
  updated_by      uuid
);

create index if not exists spaces_org_idx
  on public.spaces (organization_id);

create unique index if not exists spaces_org_slug_uidx
  on public.spaces (organization_id, lower(slug));

create unique index if not exists spaces_org_name_uidx
  on public.spaces (organization_id, lower(name));

-- Exactly one default space per org (partial unique). Enforced now so
-- backfill in Script 2 can't accidentally create a second default.
create unique index if not exists spaces_org_default_uidx
  on public.spaces (organization_id) where is_default;

create or replace trigger spaces_set_updated_at
  before update on public.spaces
  for each row execute function public.set_updated_at();


-- ── 2. space_members ──────────────────────────────────────────────
-- Per-user space assignment. Absence + users.all_spaces=true means the
-- user has access to every space in their org (see Script 3 RLS helper).
create table if not exists public.space_members (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  space_id        uuid not null references public.spaces (id) on delete cascade,
  user_id         uuid not null references public.users (id) on delete cascade,
  created_at      timestamptz not null default now(),
  created_by      uuid
);

create unique index if not exists space_members_space_user_uidx
  on public.space_members (space_id, user_id);
create index if not exists space_members_user_idx
  on public.space_members (user_id);
create index if not exists space_members_org_idx
  on public.space_members (organization_id);


-- ── 3. users.all_spaces ───────────────────────────────────────────
-- Owner default: true (changeable). Admin/staff default: false → use
-- space_members rows. Script 2 sets owners' rows to true on backfill.
alter table public.users
  add column if not exists all_spaces boolean not null default false;


-- ── 4. Nullable space_id on every space-scoped table ──────────────
-- Will be set by Script 2 (backfill) and tightened to NOT NULL +
-- FK + RLS in Script 3.

-- 4a. Assets + asset-related
alter table public.assets               add column if not exists space_id uuid;
alter table public.asset_notes          add column if not exists space_id uuid;
alter table public.asset_checkouts      add column if not exists space_id uuid;
alter table public.maintenance_records  add column if not exists space_id uuid;
alter table public.warranties           add column if not exists space_id uuid;

-- 4b. Inventory + related
alter table public.inventory_items        add column if not exists space_id uuid;
alter table public.inventory_transactions add column if not exists space_id uuid;
alter table public.inventory_audits       add column if not exists space_id uuid;
alter table public.inventory_audit_items  add column if not exists space_id uuid;
alter table public.stock_audits           add column if not exists space_id uuid;
alter table public.stock_audit_items      add column if not exists space_id uuid;
alter table public.purchases              add column if not exists space_id uuid;

-- 4c. Requests
alter table public.requests               add column if not exists space_id uuid;

-- 4d. POS (per-space)
alter table public.pos_sessions           add column if not exists space_id uuid;
alter table public.pos_transactions       add column if not exists space_id uuid;
alter table public.pos_customers          add column if not exists space_id uuid;
alter table public.pos_receipt_counters   add column if not exists space_id uuid;
-- NOTE: fawtara_counters and tax_rates stay org-wide (locked decision).

-- 4e. Audit logs (hard-scoped per locked decision)
alter table public.audit_logs             add column if not exists space_id uuid;


-- ── 5. Composite indexes on (organization_id, space_id) ───────────
-- Most queries filter by both org + space. Indexes are partial-safe
-- to add now even though space_id is still NULL on existing rows.

create index if not exists assets_org_space_idx
  on public.assets (organization_id, space_id);
create index if not exists asset_notes_org_space_idx
  on public.asset_notes (organization_id, space_id);
create index if not exists asset_checkouts_org_space_idx
  on public.asset_checkouts (organization_id, space_id);
create index if not exists maintenance_records_org_space_idx
  on public.maintenance_records (organization_id, space_id);
create index if not exists warranties_org_space_idx
  on public.warranties (organization_id, space_id);

create index if not exists inventory_items_org_space_idx
  on public.inventory_items (organization_id, space_id);
create index if not exists inventory_transactions_org_space_idx
  on public.inventory_transactions (organization_id, space_id);
create index if not exists inventory_audits_org_space_idx
  on public.inventory_audits (organization_id, space_id);
create index if not exists inventory_audit_items_org_space_idx
  on public.inventory_audit_items (organization_id, space_id);
create index if not exists stock_audits_org_space_idx
  on public.stock_audits (organization_id, space_id);
create index if not exists stock_audit_items_org_space_idx
  on public.stock_audit_items (organization_id, space_id);
create index if not exists purchases_org_space_idx
  on public.purchases (organization_id, space_id);

create index if not exists requests_org_space_idx
  on public.requests (organization_id, space_id);

create index if not exists pos_sessions_org_space_idx
  on public.pos_sessions (organization_id, space_id);
create index if not exists pos_transactions_org_space_idx
  on public.pos_transactions (organization_id, space_id);
create index if not exists pos_customers_org_space_idx
  on public.pos_customers (organization_id, space_id);
create index if not exists pos_receipt_counters_org_space_idx
  on public.pos_receipt_counters (organization_id, space_id);

create index if not exists audit_logs_org_space_idx
  on public.audit_logs (organization_id, space_id);


-- ═══════════════════════════════════════════════════════════════════
-- DONE. After running this on each env, the DB is ready for code that
-- treats space_id as optional. Nothing breaks because every column is
-- nullable and no policy/constraint has changed.
-- ═══════════════════════════════════════════════════════════════════
