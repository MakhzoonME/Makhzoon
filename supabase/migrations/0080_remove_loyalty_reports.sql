-- ════════════════════════════════════════════════════════════════════════
-- 0080_remove_loyalty_reports.sql
-- Removes the Loyalty and Reports features entirely — app code, UI, and API
-- routes were removed in the same change. This permanently drops any
-- existing loyalty program/member/points data for all organizations.
-- Idempotent — safe to replay.
-- ════════════════════════════════════════════════════════════════════════

-- ── Tables (Loyalty) ─────────────────────────────────────────────────────
drop table if exists public.loyalty_transactions cascade;
drop table if exists public.loyalty_members cascade;
drop table if exists public.loyalty_programs cascade;

-- ── Columns (Loyalty / Reports package allowances) ──────────────────────
alter table public.packages drop column if exists loyalty_included;
alter table public.packages drop column if exists reports_available;
