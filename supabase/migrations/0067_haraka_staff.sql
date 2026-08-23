-- ════════════════════════════════════════════════════════════════════════
-- 0067_haraka_staff.sql
-- Step 1 of the Appointments rollout (docs/plans/2026-08-22-haraka-
-- appointments-services-design.md §2).
--
-- Generalizes `haraka_delivery_agents` into `haraka_staff`: a non-auth staff
-- directory (people who may not have login accounts) shared by deliveries,
-- service jobs, and appointments. A `capabilities` tag says what each person
-- can be assigned to, so one record can serve several flows.
--
-- Pure rename + one new column — no behavior change for delivery flows.
-- ════════════════════════════════════════════════════════════════════════

-- ── Rename the table (guarded so the migration is replay-safe) ───────────
DO $$
BEGIN
  IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'haraka_delivery_agents'
     )
     AND NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'haraka_staff'
     )
  THEN
    ALTER TABLE haraka_delivery_agents RENAME TO haraka_staff;
  END IF;
END $$;

-- ── Capability tags ──────────────────────────────────────────────────────
-- Multi-valued: 'delivery' | 'service_job' | 'appointment_provider'. Not a
-- CHECK constraint — new capabilities are expected as other Haraka modules
-- start assigning staff, and the zod schema is the enforcement point.
ALTER TABLE haraka_staff
  ADD COLUMN IF NOT EXISTS capabilities text[] NOT NULL DEFAULT '{}';

-- Backfill: every pre-existing row was a delivery agent.
UPDATE haraka_staff
  SET capabilities = ARRAY['delivery']::text[]
  WHERE capabilities = '{}';

CREATE INDEX IF NOT EXISTS haraka_staff_org_idx
  ON haraka_staff(organization_id);
-- GIN so `capabilities @> ARRAY['appointment_provider']` filtering stays cheap.
CREATE INDEX IF NOT EXISTS haraka_staff_capabilities_idx
  ON haraka_staff USING gin (capabilities);

-- ── Rename the service-job assignment column ─────────────────────────────
DO $$
BEGIN
  IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'haraka_service_job_agents'
          AND column_name = 'delivery_agent_id'
     )
  THEN
    ALTER TABLE haraka_service_job_agents RENAME COLUMN delivery_agent_id TO staff_id;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS haraka_service_job_agents_staff_idx
  ON haraka_service_job_agents(staff_id);

-- ── RLS ──────────────────────────────────────────────────────────────────
-- Policies survive a table rename under their original names; re-create them
-- under the new name so the catalog reads cleanly.
ALTER TABLE haraka_staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS haraka_delivery_agents_platform_all ON haraka_staff;
DROP POLICY IF EXISTS haraka_staff_platform_all ON haraka_staff;
CREATE POLICY haraka_staff_platform_all ON haraka_staff
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS haraka_delivery_agents_mgr_all ON haraka_staff;
DROP POLICY IF EXISTS haraka_staff_mgr_all ON haraka_staff;
CREATE POLICY haraka_staff_mgr_all ON haraka_staff
  FOR ALL USING (public.is_org_manager(organization_id))
  WITH CHECK (public.is_org_manager(organization_id));

DROP POLICY IF EXISTS haraka_delivery_agents_staff_read ON haraka_staff;
DROP POLICY IF EXISTS haraka_staff_staff_read ON haraka_staff;
CREATE POLICY haraka_staff_staff_read ON haraka_staff
  FOR SELECT USING (public.belongs_to_org(organization_id));
