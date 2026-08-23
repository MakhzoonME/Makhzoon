-- ════════════════════════════════════════════════════════════════════════
-- 0068_haraka_service_catalog_ext.sql
-- Step 2 of the Appointments rollout (design doc §3).
--
-- 1. Extends `haraka_services` with the two fields Appointments needs:
--    how long a service takes, and whether it may be booked as an
--    appointment at all.
-- 2. Adds `haraka_service_job_items` so Service Jobs can reference catalog
--    rows by FK instead of copying free text. Price/tax are SNAPSHOTS taken
--    at booking time — same rule as haraka_service_job_payments and
--    haraka_retainer_invoices: history must not move when the catalog does.
--
-- The legacy free-text `haraka_service_jobs.items` JSONB stays for existing
-- rows (read-only; new code writes the join table). No backfill — free text
-- can't be reliably mapped back to catalog IDs.
-- ════════════════════════════════════════════════════════════════════════

-- ── Catalog extension ────────────────────────────────────────────────────
-- Nullable: only appointment-bookable services need a duration. The "required
-- when appointment_bookable" rule lives in the zod schema, not a DB CHECK, so
-- the API returns a field-level validation error rather than a DB exception.
ALTER TABLE haraka_services
  ADD COLUMN IF NOT EXISTS duration_minutes integer;

ALTER TABLE haraka_services
  ADD COLUMN IF NOT EXISTS appointment_bookable boolean NOT NULL DEFAULT false;

-- Feeds the Appointments service picker.
CREATE INDEX IF NOT EXISTS haraka_services_org_bookable_idx
  ON haraka_services(organization_id, appointment_bookable)
  WHERE appointment_bookable = true;

-- ── Service job line items (FK-referenced) ───────────────────────────────
CREATE TABLE IF NOT EXISTS haraka_service_job_items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  job_id            uuid NOT NULL REFERENCES haraka_service_jobs(id) ON DELETE CASCADE,
  service_id        uuid NOT NULL REFERENCES haraka_services(id),

  quantity          integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  -- Snapshots taken from haraka_services at the moment the line was added.
  unit_price        numeric(14,4) NOT NULL,
  tax_rate          numeric(9,6),
  discount_amount   numeric(14,4) NOT NULL DEFAULT 0,

  created_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid
);

CREATE INDEX IF NOT EXISTS haraka_service_job_items_job_idx
  ON haraka_service_job_items(job_id);
CREATE INDEX IF NOT EXISTS haraka_service_job_items_service_idx
  ON haraka_service_job_items(service_id);

-- ── RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE haraka_service_job_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS haraka_service_job_items_platform_all ON haraka_service_job_items;
CREATE POLICY haraka_service_job_items_platform_all ON haraka_service_job_items
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS haraka_service_job_items_mgr_all ON haraka_service_job_items;
CREATE POLICY haraka_service_job_items_mgr_all ON haraka_service_job_items
  FOR ALL USING (public.is_org_manager(organization_id))
  WITH CHECK (public.is_org_manager(organization_id));

DROP POLICY IF EXISTS haraka_service_job_items_staff_read ON haraka_service_job_items;
CREATE POLICY haraka_service_job_items_staff_read ON haraka_service_job_items
  FOR SELECT USING (public.belongs_to_org(organization_id));
