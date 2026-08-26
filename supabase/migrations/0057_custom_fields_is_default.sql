-- ════════════════════════════════════════════════════════════════════════
-- 0057_custom_fields_is_default.sql
-- Marks built-in field rows (Name, Phone, Email, Tax number, Notes on
-- customers) so they can be surfaced on the custom-fields page alongside
-- user-created fields, without being deletable or fully editable.
-- ════════════════════════════════════════════════════════════════════════

alter table public.custom_fields
  add column if not exists is_default boolean not null default false;
