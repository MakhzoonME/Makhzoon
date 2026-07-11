-- ── 0030: add banna feature flag to all packages ─────────────────────────────
-- Migration 0010 seeded packages without the 'banna' key in features because
-- the banna module was added later (migration 0026). This migration backfills
-- banna: true into every existing package's features JSONB so the nav item
-- appears without a superadmin needing to manually toggle it per org.

update public.packages
set features = features || '{"banna": true}'::jsonb
where (features ->> 'banna') is null;
