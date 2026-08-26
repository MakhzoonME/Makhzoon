-- ════════════════════════════════════════════════════════════════════════
-- 0080_zeyara_custom_fields.sql
-- Phase 3 of the Zeyara rollout
-- (docs/plans/2026-08-26-zeyara-clinic-vertical-design.md §6).
--
-- Lets orgs define configurable fields on BOOKINGS and CLINICAL RECORDS, the
-- way they already can on customers/assets/inventory. No new field-rendering
-- code is involved: the whole Banna stack — 7 field types, conditional
-- visibility, required/visible toggles, the admin CRUD page, and
-- CustomFieldValuesSection — applies as soon as these two CHECK constraints
-- accept the new scopes.
--
-- Same shape as 0043, which added 'customers'.
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE public.custom_fields
  DROP CONSTRAINT IF EXISTS custom_fields_module_check;
ALTER TABLE public.custom_fields
  ADD CONSTRAINT custom_fields_module_check
    CHECK (module IN ('assets', 'inventory', 'requests', 'customers', 'appointments', 'visits'));

ALTER TABLE public.custom_field_values
  DROP CONSTRAINT IF EXISTS custom_field_values_record_type_check;
ALTER TABLE public.custom_field_values
  ADD CONSTRAINT custom_field_values_record_type_check
    CHECK (record_type IN ('assets', 'inventory', 'requests', 'customers', 'appointments', 'visits'));
