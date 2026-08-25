-- ════════════════════════════════════════════════════════════════════════
-- 0077_custom_field_conditions.sql
-- Conditional visibility: a custom field can be shown only when another
-- field in the same module holds a given value. Chains are allowed
-- (B depends on A, C depends on B); cycle/dependent checks are enforced
-- in the application layer, not the database.
-- ════════════════════════════════════════════════════════════════════════

alter table custom_fields add column if not exists condition jsonb;
