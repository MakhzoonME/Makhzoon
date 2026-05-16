-- Makhzoon — Phase 3 module tables (batch 1: asset module + audit + auth tokens)
-- Columns derived from the real lib/db/* mappers, not guessed. RLS ports the
-- corresponding firestore.rules blocks. Re-runnable.

-- ── password_reset_tokens (service-role only) ──────────────────────────────
create table if not exists public.password_reset_tokens (
  hashed_token text primary key,
  uid          uuid not null,
  expires_at   timestamptz not null,
  created_at   timestamptz not null default now()
);
create index if not exists prt_expiry_idx on public.password_reset_tokens (expires_at);
alter table public.password_reset_tokens enable row level security;
-- no policies ⇒ only supabaseAdmin (service role) can touch it

-- ── audit_logs (append-only; reads gated; writes via service role) ─────────
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
alter table public.audit_logs enable row level security;
-- firestore: super_admin read; admin read own org; org_owner excluded; write:false
create policy audit_logs_read on public.audit_logs
  for select using (
    public.is_platform_admin()
    or (public.app_role() = 'admin' and public.app_org() = organization_id)
  );

-- ── warranties ─────────────────────────────────────────────────────────────
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
alter table public.warranties enable row level security;
create policy warranties_platform_all on public.warranties
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy warranties_mgr_all on public.warranties
  for all using (public.is_org_manager(organization_id))
  with check (public.is_org_manager(organization_id));
create policy warranties_staff_read on public.warranties
  for select using (public.belongs_to_org(organization_id));

-- ── requests ───────────────────────────────────────────────────────────────
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
alter table public.requests enable row level security;
create policy requests_platform_all on public.requests
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy requests_mgr_all on public.requests
  for all using (public.is_org_manager(organization_id))
  with check (public.is_org_manager(organization_id));
create policy requests_staff_read on public.requests
  for select using (public.belongs_to_org(organization_id));
create policy requests_staff_create on public.requests
  for insert with check (public.belongs_to_org(organization_id));

-- ── asset_notes ────────────────────────────────────────────────────────────
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
alter table public.asset_notes enable row level security;
create policy asset_notes_platform_all on public.asset_notes
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy asset_notes_mgr_all on public.asset_notes
  for all using (public.is_org_manager(organization_id))
  with check (public.is_org_manager(organization_id));
create policy asset_notes_staff_read on public.asset_notes
  for select using (public.belongs_to_org(organization_id));
create policy asset_notes_staff_create on public.asset_notes
  for insert with check (public.belongs_to_org(organization_id));
create policy asset_notes_staff_delete_own on public.asset_notes
  for delete using (
    public.belongs_to_org(organization_id) and created_by = auth.uid()
  );

-- ── maintenance_records ────────────────────────────────────────────────────
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
alter table public.maintenance_records enable row level security;
create policy maint_platform_all on public.maintenance_records
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy maint_mgr_all on public.maintenance_records
  for all using (public.is_org_manager(organization_id))
  with check (public.is_org_manager(organization_id));
create policy maint_staff_read on public.maintenance_records
  for select using (public.belongs_to_org(organization_id));

-- ── asset_checkouts ────────────────────────────────────────────────────────
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
alter table public.asset_checkouts enable row level security;
create policy checkouts_platform_all on public.asset_checkouts
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy checkouts_mgr_all on public.asset_checkouts
  for all using (public.is_org_manager(organization_id))
  with check (public.is_org_manager(organization_id));
create policy checkouts_staff_read on public.asset_checkouts
  for select using (public.belongs_to_org(organization_id));
create policy checkouts_staff_create on public.asset_checkouts
  for insert with check (public.belongs_to_org(organization_id));
create policy checkouts_staff_update on public.asset_checkouts
  for update using (public.belongs_to_org(organization_id))
  with check (public.belongs_to_org(organization_id));
