-- Makhzoon — Phase 3 Haraka/POS + Raseed schema.
-- Columns from the real module repositories. Embedded Firestore arrays
-- (purchase lines, POS line items / payments) become jsonb. Counters keep a
-- single row per org. Re-runnable.

-- ── inventory_items: POS/Raseed extension columns ──────────────────────────
alter table public.inventory_items
  add column if not exists pos_enabled boolean not null default false,
  add column if not exists barcode     text,
  add column if not exists tax_rate_id uuid,
  add column if not exists pos_price   numeric;
create index if not exists inventory_items_org_barcode_idx
  on public.inventory_items (organization_id, barcode) where barcode is not null;

-- ── inventory_transactions: provenance columns ─────────────────────────────
alter table public.inventory_transactions
  add column if not exists source              text,
  add column if not exists purchase_id         uuid,
  add column if not exists pos_transaction_id  uuid;

-- ── organizations: embedded Fawtara config + private credential store ──────
alter table public.organizations
  add column if not exists fawtara jsonb;

create table if not exists public.organizations_private (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  fawtara         jsonb,
  updated_at      timestamptz not null default now()
);
alter table public.organizations_private enable row level security;
-- secrets: service-role only (no policies)

-- ── tax_rates ──────────────────────────────────────────────────────────────
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
alter table public.tax_rates enable row level security;
drop policy if exists tax_rates_platform_all on public.tax_rates;
create policy tax_rates_platform_all on public.tax_rates
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());
drop policy if exists tax_rates_mgr_all on public.tax_rates;
create policy tax_rates_mgr_all on public.tax_rates
  for all using (public.is_org_manager(organization_id))
  with check (public.is_org_manager(organization_id));
drop policy if exists tax_rates_staff_read on public.tax_rates;
create policy tax_rates_staff_read on public.tax_rates
  for select using (public.belongs_to_org(organization_id));

-- ── purchases (Raseed; lines embedded as jsonb) ────────────────────────────
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
alter table public.purchases enable row level security;
drop policy if exists purchases_platform_all on public.purchases;
create policy purchases_platform_all on public.purchases
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());
drop policy if exists purchases_mgr_all on public.purchases;
create policy purchases_mgr_all on public.purchases
  for all using (public.is_org_manager(organization_id))
  with check (public.is_org_manager(organization_id));
drop policy if exists purchases_staff_read on public.purchases;
create policy purchases_staff_read on public.purchases
  for select using (public.belongs_to_org(organization_id));

-- ── pos_sessions ───────────────────────────────────────────────────────────
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
alter table public.pos_sessions enable row level security;
drop policy if exists pos_sessions_platform_all on public.pos_sessions;
create policy pos_sessions_platform_all on public.pos_sessions
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());
drop policy if exists pos_sessions_mgr_all on public.pos_sessions;
create policy pos_sessions_mgr_all on public.pos_sessions
  for all using (public.is_org_manager(organization_id))
  with check (public.is_org_manager(organization_id));
drop policy if exists pos_sessions_staff_rw on public.pos_sessions;
create policy pos_sessions_staff_rw on public.pos_sessions
  for all using (public.belongs_to_org(organization_id))
  with check (public.belongs_to_org(organization_id));

-- ── pos_transactions (items + payments embedded as jsonb) ──────────────────
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
alter table public.pos_transactions enable row level security;
drop policy if exists pos_tx_platform_all on public.pos_transactions;
create policy pos_tx_platform_all on public.pos_transactions
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());
drop policy if exists pos_tx_mgr_all on public.pos_transactions;
create policy pos_tx_mgr_all on public.pos_transactions
  for all using (public.is_org_manager(organization_id))
  with check (public.is_org_manager(organization_id));
drop policy if exists pos_tx_staff_rw on public.pos_transactions;
create policy pos_tx_staff_rw on public.pos_transactions
  for all using (public.belongs_to_org(organization_id))
  with check (public.belongs_to_org(organization_id));

-- ── pos_customers ──────────────────────────────────────────────────────────
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
alter table public.pos_customers enable row level security;
drop policy if exists pos_customers_platform_all on public.pos_customers;
create policy pos_customers_platform_all on public.pos_customers
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());
drop policy if exists pos_customers_mgr_all on public.pos_customers;
create policy pos_customers_mgr_all on public.pos_customers
  for all using (public.is_org_manager(organization_id))
  with check (public.is_org_manager(organization_id));
drop policy if exists pos_customers_staff_rw on public.pos_customers;
create policy pos_customers_staff_rw on public.pos_customers
  for all using (public.belongs_to_org(organization_id))
  with check (public.belongs_to_org(organization_id));

-- ── counters (one row per org; service-role writes only) ───────────────────
create table if not exists public.pos_receipt_counters (
  organization_id      uuid primary key references public.organizations (id) on delete cascade,
  last_receipt_number  bigint not null default 0,
  updated_at           timestamptz not null default now()
);
alter table public.pos_receipt_counters enable row level security;

create table if not exists public.fawtara_counters (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  year            integer,
  last_sequence   bigint not null default 0,
  updated_at      timestamptz not null default now()
);
alter table public.fawtara_counters enable row level security;
drop policy if exists fawtara_counters_read on public.fawtara_counters;
create policy fawtara_counters_read on public.fawtara_counters
  for select using (
    public.is_platform_admin() or public.is_org_manager(organization_id)
  );
