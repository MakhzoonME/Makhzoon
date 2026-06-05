-- ════════════════════════════════════════════════════════════════════════
-- 0026_banna_custom_fields.sql
-- Banna (بنّا) module: workspace custom field definitions.
-- Each row defines an extra field for assets, inventory, or requests.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists custom_fields (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  space_id        text,
  module          text not null check (module in ('assets', 'inventory', 'requests')),
  field_key       text not null,
  type            text not null check (type in ('text', 'number', 'select', 'multi_select', 'date', 'boolean', 'user')),
  label           text not null,
  label_ar        text,
  required        boolean not null default false,
  options         jsonb default '[]'::jsonb,
  placeholder     text,
  placeholder_ar  text,
  sort_order      integer not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index if not exists custom_fields_org_module_key_idx
  on custom_fields(organization_id, module, field_key);

create index if not exists custom_fields_org_module_idx
  on custom_fields(organization_id, module, sort_order);

alter table custom_fields enable row level security;

-- Org members can read custom fields for their org
drop policy if exists custom_fields_select on custom_fields;
create policy custom_fields_select on custom_fields
  for select using (public.belongs_to_org(organization_id));

-- Org admins can manage (insert/update/delete) custom fields
drop policy if exists custom_fields_manage on custom_fields;
create policy custom_fields_manage on custom_fields
  for all using (public.is_org_manager(organization_id))
  with check (public.is_org_manager(organization_id));

-- Platform admins can do everything
drop policy if exists custom_fields_platform_admin on custom_fields;
create policy custom_fields_platform_admin on custom_fields
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());
