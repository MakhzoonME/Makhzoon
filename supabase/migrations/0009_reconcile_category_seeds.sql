-- ════════════════════════════════════════════════════════════════════════
-- 0009_reconcile_category_seeds.sql
-- Reconcile pre-existing category values with the managed-lists system
-- introduced in 0008. Two parts:
--   1. Normalize known seed values (lowercase asset cats, "supplies"/"tools"
--      inventory cats) to the canonical platform defaults so dropdowns show
--      a single, clean option per category.
--   2. Safety net: for any remaining category value that isn't a platform
--      default for that list_key, register it as a per-org override so the
--      <ConfigSelect> in Usool/Raseed forms still shows it.
--
-- Idempotent — safe to re-run.
-- Depends on: 0008_managed_lists.sql (platform_list_items, org_list_items).
-- ════════════════════════════════════════════════════════════════════════

-- ── Part 1: normalize known seed values ─────────────────────────────────

-- Asset categories: seed used lowercase ('devices','hardware','furniture','software'),
-- platform defaults use Title Case. Title-case the seeded rows.
update public.assets
   set category = initcap(category)
 where lower(category) in ('devices','hardware','furniture','software')
   and category <> initcap(category);

-- Inventory categories: seed used 'supplies' and 'tools' — neither is a platform
-- default. Map to the closest canonical value.
update public.inventory_items set category = 'Consumables' where category = 'supplies';
update public.inventory_items set category = 'Spare Parts' where category = 'tools';

-- ── Part 2: safety-net org overrides ────────────────────────────────────
-- For every distinct (org, category) pair that exists in operational tables
-- but isn't a platform default for that list_key, register it as a per-org
-- override so the dropdown still shows it. is_custom=true marks it as
-- org-contributed (vs a pure platform default).

insert into public.org_list_items (organization_id, list_key, value, label, is_custom)
select distinct
       a.organization_id,
       'asset_category'::text,
       a.category,
       a.category,
       true
  from public.assets a
 where a.category is not null
   and a.category <> ''
   and not exists (
     select 1 from public.platform_list_items p
      where p.list_key = 'asset_category' and p.value = a.category
   )
on conflict (organization_id, list_key, value) do nothing;

insert into public.org_list_items (organization_id, list_key, value, label, is_custom)
select distinct
       i.organization_id,
       'inventory_category'::text,
       i.category,
       i.category,
       true
  from public.inventory_items i
 where i.category is not null
   and i.category <> ''
   and not exists (
     select 1 from public.platform_list_items p
      where p.list_key = 'inventory_category' and p.value = i.category
   )
on conflict (organization_id, list_key, value) do nothing;

-- Same safety net for inventory_unit (in case any seeded/manually-entered unit
-- string isn't a platform default).
insert into public.org_list_items (organization_id, list_key, value, label, is_custom)
select distinct
       i.organization_id,
       'inventory_unit'::text,
       i.unit,
       i.unit,
       true
  from public.inventory_items i
 where i.unit is not null
   and i.unit <> ''
   and not exists (
     select 1 from public.platform_list_items p
      where p.list_key = 'inventory_unit' and p.value = i.unit
   )
on conflict (organization_id, list_key, value) do nothing;

-- Locations: safety net only — seed values already match platform defaults.
insert into public.org_list_items (organization_id, list_key, value, label, is_custom)
select distinct
       a.organization_id,
       'location'::text,
       a.location,
       a.location,
       true
  from public.assets a
 where a.location is not null
   and a.location <> ''
   and not exists (
     select 1 from public.platform_list_items p
      where p.list_key = 'location' and p.value = a.location
   )
on conflict (organization_id, list_key, value) do nothing;
