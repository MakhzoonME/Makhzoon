-- ════════════════════════════════════════════════════════════════════════
-- 0070_haraka_appointments.sql
-- Steps 3 + 5 of the Appointments rollout (design doc §3.3, §4, §5).
--
-- Bookable time slots for clinics and paid service providers. Follows the
-- same counter + main-table + payments shape as Service Jobs and Retainers,
-- and snapshots duration/price/tax at booking time so a later catalog edit
-- never rewrites history.
--
-- Also resolves design-doc open question §10 (timezone): availability rows
-- are timezone-naive `time` values, so the org needs a governing IANA zone to
-- compare them against an appointment's timestamptz. `organizations.timezone`
-- is that field.
-- ════════════════════════════════════════════════════════════════════════

-- ── Organization timezone ────────────────────────────────────────────────
-- Governs how haraka_staff_availability's `time` columns are interpreted
-- relative to haraka_appointments.scheduled_at. Default matches the platform's
-- primary market; orgs elsewhere change it in settings.
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Asia/Amman';

-- ── Appointment number sequence ──────────────────────────────────────────
-- One row per (org, space). Produces APT-000001.
CREATE TABLE IF NOT EXISTS haraka_appointment_counters (
  organization_id         uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  space_id                text NOT NULL DEFAULT '',
  last_appointment_number integer NOT NULL DEFAULT 0,
  updated_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT haraka_appointment_counters_pk PRIMARY KEY (organization_id, space_id)
);

-- ── Appointment invoice sequence ─────────────────────────────────────────
-- Keyed by org + year so numbering restarts annually (APT-INV-2026-000001).
CREATE TABLE IF NOT EXISTS haraka_appointment_invoice_counters (
  organization_id uuid    NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  year            integer NOT NULL,
  last_sequence   bigint  NOT NULL DEFAULT 0,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT haraka_appointment_invoice_counters_pk PRIMARY KEY (organization_id, year)
);

-- ── Appointments ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS haraka_appointments (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  space_id           text,

  appointment_number text NOT NULL,   -- APT-000001
  invoice_number     text,            -- APT-INV-YYYY-NNNNNN, allocated once completed

  -- Optional: walk-ins have no customer record (design doc §10). Ad-hoc name
  -- and phone are always captured so the appointment is identifiable either way.
  customer_id        uuid REFERENCES pos_customers(id) ON DELETE SET NULL,
  customer_name      text NOT NULL,
  customer_phone     text,

  service_id         uuid NOT NULL REFERENCES haraka_services(id),
  staff_id           uuid NOT NULL REFERENCES haraka_staff(id),

  scheduled_at       timestamptz NOT NULL,
  -- Snapshots from haraka_services at booking time.
  duration_minutes   integer NOT NULL CHECK (duration_minutes > 0),
  price              numeric(14,4) NOT NULL DEFAULT 0,
  tax_rate           numeric(9,6),

  -- Driven by the 'appointment_status' managed list:
  -- scheduled → confirmed → completed, or scheduled|confirmed → cancelled|no_show.
  status             text NOT NULL DEFAULT 'scheduled',

  -- Derived totals, kept in sync by the service layer.
  tax_amount         numeric(14,4) NOT NULL DEFAULT 0,
  total              numeric(14,4) NOT NULL DEFAULT 0,
  payment_status     text NOT NULL DEFAULT 'unpaid'
                       CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  amount_paid        numeric(14,4) NOT NULL DEFAULT 0,

  notes              text,

  created_at         timestamptz NOT NULL DEFAULT now(),
  created_by         uuid,
  updated_at         timestamptz NOT NULL DEFAULT now(),
  updated_by         uuid
);

CREATE INDEX IF NOT EXISTS haraka_appointments_org_idx
  ON haraka_appointments(organization_id);
CREATE INDEX IF NOT EXISTS haraka_appointments_org_status_idx
  ON haraka_appointments(organization_id, status);
-- Drives both the calendar's date-range query and the overlap check.
CREATE INDEX IF NOT EXISTS haraka_appointments_staff_scheduled_idx
  ON haraka_appointments(staff_id, scheduled_at);
CREATE INDEX IF NOT EXISTS haraka_appointments_org_scheduled_idx
  ON haraka_appointments(organization_id, scheduled_at);
CREATE INDEX IF NOT EXISTS haraka_appointments_customer_idx
  ON haraka_appointments(customer_id)
  WHERE customer_id IS NOT NULL;

CREATE OR REPLACE TRIGGER haraka_appointments_set_updated_at
  BEFORE UPDATE ON haraka_appointments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Split payment entries (mirrors haraka_service_job_payments) ──────────
CREATE TABLE IF NOT EXISTS haraka_appointment_payments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  uuid NOT NULL REFERENCES haraka_appointments(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  amount          numeric(14,4) NOT NULL,
  payment_method  text,
  note            text,
  paid_at         timestamptz NOT NULL DEFAULT now(),
  created_by      uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS haraka_appointment_payments_appointment_idx
  ON haraka_appointment_payments(appointment_id);

-- ── Appointment document config in org settings ──────────────────────────
ALTER TABLE organization_configs
  ADD COLUMN IF NOT EXISTS appointment_document_config jsonb;

-- ── RLS ──────────────────────────────────────────────────────────────────

-- Counters — service-role only (no public policies, same as the service-job
-- and retainer counters).
ALTER TABLE haraka_appointment_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE haraka_appointment_invoice_counters ENABLE ROW LEVEL SECURITY;

ALTER TABLE haraka_appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS haraka_appointments_platform_all ON haraka_appointments;
CREATE POLICY haraka_appointments_platform_all ON haraka_appointments
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS haraka_appointments_mgr_all ON haraka_appointments;
CREATE POLICY haraka_appointments_mgr_all ON haraka_appointments
  FOR ALL USING (public.is_org_manager(organization_id))
  WITH CHECK (public.is_org_manager(organization_id));

DROP POLICY IF EXISTS haraka_appointments_staff_read ON haraka_appointments;
CREATE POLICY haraka_appointments_staff_read ON haraka_appointments
  FOR SELECT USING (public.belongs_to_org(organization_id));

ALTER TABLE haraka_appointment_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS haraka_appointment_payments_platform_all ON haraka_appointment_payments;
CREATE POLICY haraka_appointment_payments_platform_all ON haraka_appointment_payments
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS haraka_appointment_payments_mgr_all ON haraka_appointment_payments;
CREATE POLICY haraka_appointment_payments_mgr_all ON haraka_appointment_payments
  FOR ALL USING (public.is_org_manager(organization_id))
  WITH CHECK (public.is_org_manager(organization_id));

DROP POLICY IF EXISTS haraka_appointment_payments_staff_read ON haraka_appointment_payments;
CREATE POLICY haraka_appointment_payments_staff_read ON haraka_appointment_payments
  FOR SELECT USING (public.belongs_to_org(organization_id));

-- ── Managed list seeds ───────────────────────────────────────────────────

-- appointment_status: SYSTEM list — the codes drive the status machine
-- (only 'completed' unlocks invoicing), labels/colors/order stay editable.
INSERT INTO platform_list_items (list_key, value, label, label_ar, color, sort_order, is_system) VALUES
  ('appointment_status', 'scheduled', 'Scheduled', 'مجدول',       '#3b82f6', 1, true),
  ('appointment_status', 'confirmed', 'Confirmed', 'مؤكد',        '#6366f1', 2, true),
  ('appointment_status', 'completed', 'Completed', 'مكتمل',       '#22c55e', 3, true),
  ('appointment_status', 'cancelled', 'Cancelled', 'ملغي',        '#ef4444', 4, true),
  ('appointment_status', 'no_show',   'No Show',   'لم يحضر',     '#f97316', 5, true)
ON CONFLICT (list_key, value) DO NOTHING;
