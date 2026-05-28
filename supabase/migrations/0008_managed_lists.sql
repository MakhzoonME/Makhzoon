-- ════════════════════════════════════════════════════════════════════════
-- 0008_managed_lists.sql
-- Generalized, config-driven dropdown lists (bilingual: EN + AR).
--
-- Two tiers:
--   • platform_list_items — superadmin-owned catalog + platform DEFAULTS.
--       Every org inherits the enabled defaults of each list_key.
--   • org_list_items       — per-org additions and overrides (relabel,
--       recolor, reorder, enable/disable a default, or add a custom item).
--
-- Item kinds:
--   • is_system = false → FREE lists (asset_category, location, asset_status,
--       inventory_unit, inventory_category, vendor, org_industry). Superadmin
--       and org-managers may add/remove/edit anything.
--   • is_system = true  → SYSTEM lists (request_status, purchase_status, …).
--       Code remains the source of truth for the VALUE; the row only carries
--       label/color/order/visibility. UI locks value + add/remove.
--
-- Roles & integration enums (Bucket C: user roles, fawtara env, printer width)
-- are intentionally NOT managed here — they stay hardcoded in code/RLS.
-- ════════════════════════════════════════════════════════════════════════

-- ── platform_list_items (superadmin catalog + defaults) ──────────────────
create table if not exists public.platform_list_items (
  id          uuid primary key default gen_random_uuid(),
  list_key    text not null,
  value       text not null,
  label       text not null,          -- English label
  label_ar    text,                   -- Arabic label (falls back to label)
  color       text,
  sort_order  int  not null default 0,
  enabled     boolean not null default true,
  is_system   boolean not null default false,
  created_at  timestamptz not null default now(),
  created_by  uuid,
  updated_at  timestamptz not null default now(),
  updated_by  uuid,
  unique (list_key, value)
);
create index if not exists platform_list_items_key_idx
  on public.platform_list_items (list_key, enabled, sort_order);
create or replace trigger platform_list_items_set_updated_at before update on public.platform_list_items
  for each row execute function public.set_updated_at();

-- ── org_list_items (per-org additions / overrides) ───────────────────────
create table if not exists public.org_list_items (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  list_key        text not null,
  value           text not null,
  label           text,
  label_ar        text,
  color           text,
  sort_order      int,
  enabled         boolean not null default true,
  is_custom       boolean not null default true,
  created_at      timestamptz not null default now(),
  created_by      uuid,
  updated_at      timestamptz not null default now(),
  updated_by      uuid,
  unique (organization_id, list_key, value)
);
create index if not exists org_list_items_org_key_idx
  on public.org_list_items (organization_id, list_key);
create or replace trigger org_list_items_set_updated_at before update on public.org_list_items
  for each row execute function public.set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────
alter table public.platform_list_items enable row level security;
alter table public.org_list_items      enable row level security;

drop policy if exists pli_read on public.platform_list_items;
create policy pli_read on public.platform_list_items
  for select using (auth.uid() is not null);
drop policy if exists pli_platform_all on public.platform_list_items;
create policy pli_platform_all on public.platform_list_items
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());

drop policy if exists oli_platform_all on public.org_list_items;
create policy oli_platform_all on public.org_list_items
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());
drop policy if exists oli_mgr_all on public.org_list_items;
create policy oli_mgr_all on public.org_list_items
  for all using (public.is_org_manager(organization_id))
  with check (public.is_org_manager(organization_id));
drop policy if exists oli_staff_read on public.org_list_items;
create policy oli_staff_read on public.org_list_items
  for select using (public.belongs_to_org(organization_id));

-- ════════════════════════════════════════════════════════════════════════
-- Seed platform DEFAULTS (idempotent, bilingual).
-- ════════════════════════════════════════════════════════════════════════

-- ── Bucket A: FREE lists (is_system = false) ─────────────────────────────
insert into public.platform_list_items (list_key, value, label, label_ar, color, sort_order, is_system) values
  ('asset_status', 'Active',      'Active',      'نشط',          '#22c55e', 1, false),
  ('asset_status', 'Inactive',    'Inactive',    'غير نشط',      '#9ca3af', 2, false),
  ('asset_status', 'Maintenance', 'Maintenance', 'قيد الصيانة',  '#f59e0b', 3, false),
  ('asset_status', 'Retired',     'Retired',     'متقاعد',       '#ef4444', 4, false),

  ('asset_category', 'Devices',   'Devices',   'أجهزة',  null, 1, false),
  ('asset_category', 'Hardware',  'Hardware',  'معدات',  null, 2, false),
  ('asset_category', 'Furniture', 'Furniture', 'أثاث',   null, 3, false),
  ('asset_category', 'Software',  'Software',  'برمجيات', null, 4, false),

  ('location', 'Main Office',   'Main Office',   'المكتب الرئيسي', null, 1, false),
  ('location', 'Warehouse',     'Warehouse',     'المستودع',       null, 2, false),
  ('location', 'Branch Office', 'Branch Office', 'مكتب فرعي',      null, 3, false),
  ('location', 'Remote',        'Remote',        'عن بُعد',        null, 4, false),

  ('inventory_unit', 'each',  'each',  'قطعة',  null, 1,  false),
  ('inventory_unit', 'box',   'box',   'صندوق', null, 2,  false),
  ('inventory_unit', 'pack',  'pack',  'عبوة',  null, 3,  false),
  ('inventory_unit', 'pair',  'pair',  'زوج',   null, 4,  false),
  ('inventory_unit', 'roll',  'roll',  'لفة',   null, 5,  false),
  ('inventory_unit', 'liter', 'liter', 'لتر',   null, 6,  false),
  ('inventory_unit', 'kg',    'kg',    'كجم',   null, 7,  false),
  ('inventory_unit', 'meter', 'meter', 'متر',   null, 8,  false),
  ('inventory_unit', 'sheet', 'sheet', 'ورقة',  null, 9,  false),
  ('inventory_unit', 'set',   'set',   'طقم',   null, 10, false),

  ('inventory_category', 'Stationery',  'Stationery',  'قرطاسية',   null, 1, false),
  ('inventory_category', 'Consumables', 'Consumables', 'مستهلكات',  null, 2, false),
  ('inventory_category', 'Spare Parts', 'Spare Parts', 'قطع غيار',  null, 3, false),
  ('inventory_category', 'Packaging',   'Packaging',   'تغليف',     null, 4, false),

  ('org_industry', 'Technology',    'Technology',    'تقنية',      null, 1, false),
  ('org_industry', 'Healthcare',    'Healthcare',    'رعاية صحية', null, 2, false),
  ('org_industry', 'Finance',       'Finance',       'مالية',      null, 3, false),
  ('org_industry', 'Retail',        'Retail',        'تجزئة',      null, 4, false),
  ('org_industry', 'Manufacturing', 'Manufacturing', 'تصنيع',      null, 5, false),
  ('org_industry', 'Education',     'Education',     'تعليم',      null, 6, false),
  ('org_industry', 'Government',    'Government',    'حكومي',      null, 7, false),
  ('org_industry', 'Non-Profit',    'Non-Profit',    'غير ربحي',   null, 8, false),
  ('org_industry', 'Other',         'Other',         'أخرى',       null, 9, false)
on conflict (list_key, value) do nothing;

-- ── Bucket B: SYSTEM lists (is_system = true; value locked) ──────────────
insert into public.platform_list_items (list_key, value, label, label_ar, color, sort_order, is_system) values
  ('request_status', 'PENDING',  'Pending',  'قيد الانتظار', '#f59e0b', 1, true),
  ('request_status', 'APPROVED', 'Approved', 'موافق',        '#22c55e', 2, true),
  ('request_status', 'REJECTED', 'Rejected', 'مرفوض',        '#ef4444', 3, true),

  ('request_type', 'REFILL',          'Refill',          'تعبئة',        null, 1, true),
  ('request_type', 'RETIRE',          'Retire',          'إخراج',        null, 2, true),
  ('request_type', 'BUY_NEW',         'Buy New',         'شراء جديد',    null, 3, true),
  ('request_type', 'EXTEND_WARRANTY', 'Extend Warranty', 'تمديد الضمان', null, 4, true),

  ('purchase_status', 'draft',     'Draft',     'مسودة', '#f59e0b', 1, true),
  ('purchase_status', 'received',  'Received',  'مستلم', '#22c55e', 2, true),
  ('purchase_status', 'cancelled', 'Cancelled', 'ملغي',  '#ef4444', 3, true),

  ('inventory_movement', 'in',         'In',         'وارد', null, 1, true),
  ('inventory_movement', 'out',        'Out',        'صادر', null, 2, true),
  ('inventory_movement', 'adjustment', 'Adjustment', 'تسوية', null, 3, true),

  ('pos_txn_status', 'completed', 'Completed', 'مكتمل',   '#22c55e', 1, true),
  ('pos_txn_status', 'refunded',  'Refunded',  'مسترجع',  '#f59e0b', 2, true),
  ('pos_txn_status', 'voided',    'Voided',    'ملغي',    '#ef4444', 3, true),

  ('pos_session_status', 'open',   'Open',   'مفتوح', '#22c55e', 1, true),
  ('pos_session_status', 'closed', 'Closed', 'مغلق',  '#9ca3af', 2, true),

  ('warranty_status', 'active',  'Active',  'نشط',   '#22c55e', 1, true),
  ('warranty_status', 'expired', 'Expired', 'منتهي', '#ef4444', 2, true),

  ('warranty_target', 'asset',     'Asset',     'أصل',   null, 1, true),
  ('warranty_target', 'inventory', 'Inventory', 'مخزون', null, 2, true),

  ('maintenance_type', 'repair',     'Repair',     'إصلاح', '#f97316', 1, true),
  ('maintenance_type', 'service',    'Service',    'خدمة',  '#3b82f6', 2, true),
  ('maintenance_type', 'inspection', 'Inspection', 'فحص',   '#a855f7', 3, true),
  ('maintenance_type', 'upgrade',    'Upgrade',    'ترقية', '#22c55e', 4, true),
  ('maintenance_type', 'other',      'Other',      'أخرى',  '#9ca3af', 5, true)
on conflict (list_key, value) do nothing;

-- ════════════════════════════════════════════════════════════════════════
-- Backfill existing per-org customizations from organization_configs so current
-- orgs keep their categories/locations. Values are the human names assets
-- already store; items matching a platform default collapse via the resolver.
-- asset_statuses are NOT backfilled — platform defaults cover them.
-- ════════════════════════════════════════════════════════════════════════
insert into public.org_list_items (organization_id, list_key, value, label, is_custom)
select oc.organization_id, 'asset_category', c->>'name', c->>'name', true
  from public.organization_configs oc,
       lateral jsonb_array_elements(oc.categories) c
 where coalesce(c->>'name', '') <> ''
on conflict (organization_id, list_key, value) do nothing;

insert into public.org_list_items (organization_id, list_key, value, label, is_custom)
select oc.organization_id, 'location', l->>'name', l->>'name', true
  from public.organization_configs oc,
       lateral jsonb_array_elements(oc.locations) l
 where coalesce(l->>'name', '') <> ''
on conflict (organization_id, list_key, value) do nothing;
