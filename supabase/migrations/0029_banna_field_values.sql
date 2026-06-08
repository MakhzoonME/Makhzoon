-- ════════════════════════════════════════════════════════════════════════
-- 0029_banna_field_values.sql
-- Banna (بنّا) module: stores the actual values for custom fields on records.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists custom_field_values (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  space_id        text,
  record_type     text not null check (record_type in ('assets', 'inventory', 'requests')),
  record_id       uuid not null,
  field_id        uuid not null references custom_fields(id) on delete cascade,
  value           jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- One value per record+field combination
create unique index if not exists custom_field_values_record_field_idx
  on custom_field_values(organization_id, record_type, record_id, field_id);

-- Fast lookup of all field values for a given record
create index if not exists custom_field_values_record_idx
  on custom_field_values(organization_id, record_type, record_id);

alter table custom_field_values enable row level security;

drop policy if exists custom_field_values_select on custom_field_values;
create policy custom_field_values_select on custom_field_values
  for select using (public.belongs_to_org(organization_id));

drop policy if exists custom_field_values_manage on custom_field_values;
create policy custom_field_values_manage on custom_field_values
  for all using (public.is_org_manager(organization_id))
  with check (public.is_org_manager(organization_id));

drop policy if exists custom_field_values_staff_upsert on custom_field_values;
create policy custom_field_values_staff_upsert on custom_field_values
  for insert with check (public.belongs_to_org(organization_id));

drop policy if exists custom_field_values_platform_admin on custom_field_values;
create policy custom_field_values_platform_admin on custom_field_values
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());
