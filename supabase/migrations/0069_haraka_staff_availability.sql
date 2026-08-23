-- ════════════════════════════════════════════════════════════════════════
-- 0069_haraka_staff_availability.sql
-- Step 4 of the Appointments rollout (design doc §2.3).
--
-- Working hours for staff tagged `appointment_provider`. Two layers:
--   • haraka_staff_availability            — the recurring weekly pattern.
--     Several rows per weekday are allowed (split shifts).
--   • haraka_staff_availability_exceptions — one date overriding the pattern.
--     NULL start/end = day off; both set = different hours that day.
--
-- `time` columns are timezone-naive and interpreted in the organization's
-- timezone (organizations.timezone) when compared against an appointment's
-- timestamptz `scheduled_at` — see lib/modules/haraka/appointments/availability.ts.
-- ════════════════════════════════════════════════════════════════════════

-- ── Recurring weekly hours ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS haraka_staff_availability (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  staff_id          uuid NOT NULL REFERENCES haraka_staff(id) ON DELETE CASCADE,

  -- 0 = Sunday … 6 = Saturday (matches JS Date#getDay).
  day_of_week       smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time        time NOT NULL,
  end_time          time NOT NULL,

  created_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  updated_by        uuid,

  CONSTRAINT haraka_staff_availability_range CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS haraka_staff_availability_staff_idx
  ON haraka_staff_availability(staff_id, day_of_week);
CREATE INDEX IF NOT EXISTS haraka_staff_availability_org_idx
  ON haraka_staff_availability(organization_id);

CREATE OR REPLACE TRIGGER haraka_staff_availability_set_updated_at
  BEFORE UPDATE ON haraka_staff_availability
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Per-date overrides ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS haraka_staff_availability_exceptions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  staff_id          uuid NOT NULL REFERENCES haraka_staff(id) ON DELETE CASCADE,

  exception_date    date NOT NULL,
  -- Both NULL  → full day off.
  -- Both set   → replaces the weekly hours for this date.
  start_time        time,
  end_time          time,
  reason            text,

  created_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  updated_by        uuid,

  CONSTRAINT haraka_staff_availability_exceptions_unique UNIQUE (staff_id, exception_date),
  -- Reject a half-specified override (start without end, or end without start).
  CONSTRAINT haraka_staff_availability_exceptions_pair CHECK (
    (start_time IS NULL AND end_time IS NULL)
    OR (start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
  )
);

CREATE INDEX IF NOT EXISTS haraka_staff_availability_exceptions_staff_idx
  ON haraka_staff_availability_exceptions(staff_id, exception_date);
CREATE INDEX IF NOT EXISTS haraka_staff_availability_exceptions_org_idx
  ON haraka_staff_availability_exceptions(organization_id);

CREATE OR REPLACE TRIGGER haraka_staff_availability_exceptions_set_updated_at
  BEFORE UPDATE ON haraka_staff_availability_exceptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE haraka_staff_availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS haraka_staff_availability_platform_all ON haraka_staff_availability;
CREATE POLICY haraka_staff_availability_platform_all ON haraka_staff_availability
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS haraka_staff_availability_mgr_all ON haraka_staff_availability;
CREATE POLICY haraka_staff_availability_mgr_all ON haraka_staff_availability
  FOR ALL USING (public.is_org_manager(organization_id))
  WITH CHECK (public.is_org_manager(organization_id));

DROP POLICY IF EXISTS haraka_staff_availability_staff_read ON haraka_staff_availability;
CREATE POLICY haraka_staff_availability_staff_read ON haraka_staff_availability
  FOR SELECT USING (public.belongs_to_org(organization_id));

ALTER TABLE haraka_staff_availability_exceptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS haraka_staff_availability_exceptions_platform_all ON haraka_staff_availability_exceptions;
CREATE POLICY haraka_staff_availability_exceptions_platform_all ON haraka_staff_availability_exceptions
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS haraka_staff_availability_exceptions_mgr_all ON haraka_staff_availability_exceptions;
CREATE POLICY haraka_staff_availability_exceptions_mgr_all ON haraka_staff_availability_exceptions
  FOR ALL USING (public.is_org_manager(organization_id))
  WITH CHECK (public.is_org_manager(organization_id));

DROP POLICY IF EXISTS haraka_staff_availability_exceptions_staff_read ON haraka_staff_availability_exceptions;
CREATE POLICY haraka_staff_availability_exceptions_staff_read ON haraka_staff_availability_exceptions
  FOR SELECT USING (public.belongs_to_org(organization_id));
