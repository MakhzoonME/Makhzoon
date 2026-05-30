-- ── 0012: stock_audits + stock_audit_items ──────────────────────────────────
-- Stock-take feature under /raseed/audits (distinct from asset audits in
-- inventory_audits/0005, which check present/absent for assets). Stock items
-- have *quantities*, so an audit row carries an expected qty snapshot, the
-- counted qty, and an optional per-line note (damaged / expired / etc.).
--
-- RLS mirrors the inventory pattern from 0001/0002: platform_all + mgr_all +
-- staff_read.

create table if not exists public.stock_audits (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title           text not null,
  notes           text,
  status          text not null default 'in_progress'
                    check (status in ('draft', 'in_progress', 'completed')),
  total_items     integer not null default 0,
  counted_count   integer not null default 0,
  pending_count   integer not null default 0,
  variance_total  numeric not null default 0,
  started_by      uuid,
  started_by_name text,
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  created_by      uuid,
  updated_at      timestamptz not null default now(),
  updated_by      uuid
);
create index if not exists stock_audits_org_idx
  on public.stock_audits (organization_id, created_at desc);
create or replace trigger stock_audits_set_updated_at
  before update on public.stock_audits
  for each row execute function public.set_updated_at();

create table if not exists public.stock_audit_items (
  id                 uuid primary key default gen_random_uuid(),
  audit_id           uuid not null references public.stock_audits (id) on delete cascade,
  organization_id    uuid not null references public.organizations (id) on delete cascade,
  inventory_item_id  uuid references public.inventory_items (id) on delete set null,
  item_name          text not null,
  item_sku           text,
  item_unit          text,
  item_category      text,
  item_location      text,
  expected_quantity  numeric not null default 0,
  counted_quantity   numeric,
  note               text,
  status             text not null default 'pending'
                       check (status in ('pending', 'counted')),
  checked_at         timestamptz,
  checked_by         uuid,
  checked_by_name    text
);
create index if not exists stock_audit_items_audit_idx
  on public.stock_audit_items (audit_id, item_name);
create index if not exists stock_audit_items_item_idx
  on public.stock_audit_items (inventory_item_id);

alter table public.stock_audits      enable row level security;
alter table public.stock_audit_items enable row level security;

drop policy if exists stock_audits_platform_all on public.stock_audits;
create policy stock_audits_platform_all on public.stock_audits
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());
drop policy if exists stock_audits_mgr_all on public.stock_audits;
create policy stock_audits_mgr_all on public.stock_audits
  for all using (public.is_org_manager(organization_id))
  with check (public.is_org_manager(organization_id));
drop policy if exists stock_audits_staff_read on public.stock_audits;
create policy stock_audits_staff_read on public.stock_audits
  for select using (public.belongs_to_org(organization_id));

drop policy if exists stock_audit_items_platform_all on public.stock_audit_items;
create policy stock_audit_items_platform_all on public.stock_audit_items
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());
drop policy if exists stock_audit_items_mgr_all on public.stock_audit_items;
create policy stock_audit_items_mgr_all on public.stock_audit_items
  for all using (public.is_org_manager(organization_id))
  with check (public.is_org_manager(organization_id));
drop policy if exists stock_audit_items_staff_read on public.stock_audit_items;
create policy stock_audit_items_staff_read on public.stock_audit_items
  for select using (public.belongs_to_org(organization_id));
