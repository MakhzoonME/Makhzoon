-- ════════════════════════════════════════════════════════════════════════
-- 0034_haraka_service_jobs.sql
-- Haraka Service Jobs — for businesses that sell services rather than
-- physical goods. Covers repair shops, consultants, salons, field-service
-- companies, marketing agencies, and similar single-engagement services.
-- Includes invoice generation and split payment tracking.
-- ════════════════════════════════════════════════════════════════════════

-- ── Job number sequence ───────────────────────────────────────────────────
-- One row per (org, space). Atomically incremented on each new job.
CREATE TABLE IF NOT EXISTS haraka_service_job_counters (
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  space_id          text NOT NULL DEFAULT '',
  last_job_number   integer NOT NULL DEFAULT 0,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT haraka_service_job_counters_pk PRIMARY KEY (organization_id, space_id)
);

-- ── Service invoice number sequence ──────────────────────────────────────
-- Keyed by org + year so invoice numbers restart each year (SVI-2026-000001).
CREATE TABLE IF NOT EXISTS haraka_service_invoice_counters (
  organization_id uuid    NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  year            integer NOT NULL,
  last_sequence   bigint  NOT NULL DEFAULT 0,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT haraka_service_invoice_counters_pk PRIMARY KEY (organization_id, year)
);

-- ── Service jobs ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS haraka_service_jobs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  space_id          text,

  -- Reference number allocated from haraka_service_job_counters (e.g. SVC-000042)
  job_number        text NOT NULL,

  -- Invoice number allocated on demand once job is done (e.g. SVI-2026-000001)
  invoice_number    text,

  -- Free tag from service_job_type list (repair / appointment / professional /
  -- field / campaign / other). Org can add custom values.
  service_type      text,

  -- Lifecycle: new → confirmed → in_progress → done | cancelled
  status            text NOT NULL DEFAULT 'new',

  -- Customer — can link pos_customers or be ad-hoc name + phone
  customer_id       uuid REFERENCES pos_customers(id) ON DELETE SET NULL,
  customer_name     text NOT NULL,
  customer_phone    text,

  -- Org member assigned to deliver the service
  staff_member_id   uuid,
  staff_member_name text,

  -- Service line items — free-text, NOT linked to inventory items.
  -- Shape per element:
  --   { name, description, quantity, unitPrice, taxRate,
  --     taxAmount, discountAmount, lineTotal }
  items             jsonb NOT NULL DEFAULT '[]',

  -- Totals
  subtotal          numeric(14,4) NOT NULL DEFAULT 0,
  discount_amount   numeric(14,4) NOT NULL DEFAULT 0,
  tax_amount        numeric(14,4) NOT NULL DEFAULT 0,
  total             numeric(14,4) NOT NULL DEFAULT 0,

  -- Payment tracking
  payment_status    text NOT NULL DEFAULT 'unpaid'
                      CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  amount_paid       numeric(14,4) NOT NULL DEFAULT 0,
  payment_method    text,

  -- Optional scheduling (salons, field service visits, etc.)
  scheduled_at      timestamptz,

  -- Optional on-site address for field-service jobs.
  -- Shape: { street, area, city, notes }
  service_address   jsonb,

  notes             text,

  created_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  updated_by        uuid
);

CREATE INDEX IF NOT EXISTS haraka_service_jobs_org_idx
  ON haraka_service_jobs(organization_id);
CREATE INDEX IF NOT EXISTS haraka_service_jobs_org_status_idx
  ON haraka_service_jobs(organization_id, status);
CREATE INDEX IF NOT EXISTS haraka_service_jobs_org_created_idx
  ON haraka_service_jobs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS haraka_service_jobs_org_type_idx
  ON haraka_service_jobs(organization_id, service_type);
CREATE INDEX IF NOT EXISTS haraka_service_jobs_scheduled_idx
  ON haraka_service_jobs(organization_id, scheduled_at)
  WHERE scheduled_at IS NOT NULL;

CREATE OR REPLACE TRIGGER haraka_service_jobs_set_updated_at
  BEFORE UPDATE ON haraka_service_jobs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Split payment entries ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS haraka_service_job_payments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          uuid NOT NULL REFERENCES haraka_service_jobs(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  amount          numeric(14,4) NOT NULL,
  payment_method  text,
  note            text,
  paid_at         timestamptz NOT NULL DEFAULT now(),
  created_by      uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS haraka_service_job_payments_job_idx
  ON haraka_service_job_payments(job_id);

-- ── Service job document config in org settings ───────────────────────────
ALTER TABLE organization_configs
  ADD COLUMN IF NOT EXISTS service_job_document_config jsonb;

-- ── RLS ───────────────────────────────────────────────────────────────────

-- haraka_service_job_counters — service-role only (no public policies)
ALTER TABLE haraka_service_job_counters ENABLE ROW LEVEL SECURITY;

-- haraka_service_invoice_counters — service-role only
ALTER TABLE haraka_service_invoice_counters ENABLE ROW LEVEL SECURITY;

-- haraka_service_jobs
ALTER TABLE haraka_service_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS haraka_service_jobs_platform_all ON haraka_service_jobs;
CREATE POLICY haraka_service_jobs_platform_all ON haraka_service_jobs
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS haraka_service_jobs_mgr_all ON haraka_service_jobs;
CREATE POLICY haraka_service_jobs_mgr_all ON haraka_service_jobs
  FOR ALL USING (public.is_org_manager(organization_id))
  WITH CHECK (public.is_org_manager(organization_id));

DROP POLICY IF EXISTS haraka_service_jobs_staff_read ON haraka_service_jobs;
CREATE POLICY haraka_service_jobs_staff_read ON haraka_service_jobs
  FOR SELECT USING (public.belongs_to_org(organization_id));

-- haraka_service_job_payments
ALTER TABLE haraka_service_job_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS haraka_service_job_payments_platform_all ON haraka_service_job_payments;
CREATE POLICY haraka_service_job_payments_platform_all ON haraka_service_job_payments
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS haraka_service_job_payments_mgr_all ON haraka_service_job_payments;
CREATE POLICY haraka_service_job_payments_mgr_all ON haraka_service_job_payments
  FOR ALL USING (public.is_org_manager(organization_id))
  WITH CHECK (public.is_org_manager(organization_id));

DROP POLICY IF EXISTS haraka_service_job_payments_staff_read ON haraka_service_job_payments;
CREATE POLICY haraka_service_job_payments_staff_read ON haraka_service_job_payments
  FOR SELECT USING (public.belongs_to_org(organization_id));

-- ── Managed list seeds ────────────────────────────────────────────────────

-- service_job_status: SYSTEM list — values drive status machine
INSERT INTO platform_list_items (list_key, value, label, label_ar, color, sort_order, is_system) VALUES
  ('service_job_status', 'new',         'New',         'جديد',        '#3b82f6', 1, true),
  ('service_job_status', 'confirmed',   'Confirmed',   'مؤكد',        '#6366f1', 2, true),
  ('service_job_status', 'in_progress', 'In Progress', 'قيد التنفيذ', '#f97316', 3, true),
  ('service_job_status', 'done',        'Done',        'منجز',        '#22c55e', 4, true),
  ('service_job_status', 'cancelled',   'Cancelled',   'ملغي',        '#ef4444', 5, true)
ON CONFLICT (list_key, value) DO NOTHING;

-- service_job_type: FREE list — org can add custom types
INSERT INTO platform_list_items (list_key, value, label, label_ar, color, sort_order, is_system) VALUES
  ('service_job_type', 'repair',       'Repair',           'إصلاح',       null, 1, false),
  ('service_job_type', 'appointment',  'Appointment',      'موعد',        null, 2, false),
  ('service_job_type', 'professional', 'Professional',     'خدمة مهنية',  null, 3, false),
  ('service_job_type', 'field',        'Field Service',    'خدمة ميدانية',null, 4, false),
  ('service_job_type', 'campaign',     'Campaign',         'حملة',        null, 5, false),
  ('service_job_type', 'other',        'Other',            'أخرى',        null, 6, false)
ON CONFLICT (list_key, value) DO NOTHING;

-- service_job_payment_method: SYSTEM list (same values as orders for consistency)
INSERT INTO platform_list_items (list_key, value, label, label_ar, color, sort_order, is_system) VALUES
  ('service_job_payment_method', 'cash',          'Cash',          'نقدي',         null, 1, true),
  ('service_job_payment_method', 'bank_transfer', 'Bank Transfer', 'تحويل بنكي',   null, 2, true),
  ('service_job_payment_method', 'card',          'Card',          'بطاقة',        null, 3, true),
  ('service_job_payment_method', 'other',         'Other',         'أخرى',         null, 4, true)
ON CONFLICT (list_key, value) DO NOTHING;
