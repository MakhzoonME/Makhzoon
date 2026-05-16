-- Makhzoon — Phase 3 module tables (batch 2: platform/superadmin + billing +
-- support + inventory audits). Columns from the real lib/db mappers. lib/db/
-- usage.ts and reports.ts are pure aggregations over existing tables and need
-- no schema. Re-runnable.

-- ── backend_logs (platform-only request log) ───────────────────────────────
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
alter table public.backend_logs enable row level security;
create policy backend_logs_platform_read on public.backend_logs
  for select using (public.is_platform_admin());

-- ── contact_sales / early_access (public-form leads; platform reads) ────────
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
alter table public.contact_sales enable row level security;
create policy contact_sales_platform_read on public.contact_sales
  for select using (public.is_platform_admin());

create table if not exists public.early_access (
  id         uuid primary key default gen_random_uuid(),
  email      text,
  first_name text default '',
  last_name  text default '',
  ip         text,
  created_at timestamptz not null default now()
);
create index if not exists early_access_created_idx on public.early_access (created_at desc);
alter table public.early_access enable row level security;
create policy early_access_platform_read on public.early_access
  for select using (public.is_platform_admin());

-- ── superadmin_users (makhzoon staff directory; platform-only) ─────────────
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
alter table public.superadmin_users enable row level security;
create policy superadmin_users_platform_all on public.superadmin_users
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());

-- ── payment_logs ───────────────────────────────────────────────────────────
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
alter table public.payment_logs enable row level security;
create policy payment_logs_platform_all on public.payment_logs
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy payment_logs_mgr_read on public.payment_logs
  for select using (public.is_org_manager(organization_id));

-- ── inventory_audits + items ───────────────────────────────────────────────
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

alter table public.inventory_audits enable row level security;
alter table public.inventory_audit_items enable row level security;
create policy inv_audits_platform_all on public.inventory_audits
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy inv_audits_mgr_all on public.inventory_audits
  for all using (public.is_org_manager(organization_id))
  with check (public.is_org_manager(organization_id));
create policy inv_audits_staff_read on public.inventory_audits
  for select using (public.belongs_to_org(organization_id));
create policy inv_audit_items_platform_all on public.inventory_audit_items
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy inv_audit_items_mgr_all on public.inventory_audit_items
  for all using (public.is_org_manager(organization_id))
  with check (public.is_org_manager(organization_id));
create policy inv_audit_items_staff_read on public.inventory_audit_items
  for select using (public.belongs_to_org(organization_id));

-- ── support_tickets + ticket_messages ──────────────────────────────────────
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

-- organization_id denormalized onto messages so tenant RLS needs no join.
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

alter table public.support_tickets enable row level security;
alter table public.ticket_messages enable row level security;
create policy support_tickets_platform_all on public.support_tickets
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy support_tickets_mgr_all on public.support_tickets
  for all using (public.is_org_manager(organization_id))
  with check (public.is_org_manager(organization_id));
create policy support_tickets_staff_read on public.support_tickets
  for select using (public.belongs_to_org(organization_id));
create policy support_tickets_staff_create on public.support_tickets
  for insert with check (public.belongs_to_org(organization_id));
create policy ticket_messages_platform_all on public.ticket_messages
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy ticket_messages_org_all on public.ticket_messages
  for all using (public.belongs_to_org(organization_id))
  with check (public.belongs_to_org(organization_id));
