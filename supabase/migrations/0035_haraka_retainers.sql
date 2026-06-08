-- ════════════════════════════════════════════════════════════════════════
-- 0035_haraka_retainers.sql
-- Haraka Retainers — recurring billing contracts for businesses that
-- charge clients on a monthly, quarterly, or annual cycle.
-- Each retainer generates per-cycle invoice records for payment tracking.
-- ════════════════════════════════════════════════════════════════════════

-- ── Retainer number sequence ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS haraka_retainer_counters (
  organization_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  space_id              text NOT NULL DEFAULT '',
  last_retainer_number  integer NOT NULL DEFAULT 0,
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT haraka_retainer_counters_pk PRIMARY KEY (organization_id, space_id)
);

-- ── Retainer invoice number sequence ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS haraka_retainer_invoice_counters (
  organization_id uuid    NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  year            integer NOT NULL,
  last_sequence   bigint  NOT NULL DEFAULT 0,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT haraka_retainer_invoice_counters_pk PRIMARY KEY (organization_id, year)
);

-- ── Retainers ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS haraka_retainers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  space_id          text,

  -- Reference number (e.g. RET-000001)
  retainer_number   text NOT NULL,

  -- Human-readable contract/service name (e.g. "Social Media Management")
  name              text NOT NULL,

  -- Client
  customer_id       uuid REFERENCES pos_customers(id) ON DELETE SET NULL,
  customer_name     text NOT NULL,
  customer_phone    text,

  -- Assigned org member
  staff_member_id   uuid,
  staff_member_name text,

  -- Billing settings
  billing_cycle     text NOT NULL DEFAULT 'monthly'
                      CHECK (billing_cycle IN ('monthly', 'quarterly', 'annual')),
  amount_per_cycle  numeric(14,4) NOT NULL,
  -- Tax rate as decimal fraction (0.16 = 16%)
  tax_rate          numeric(5,4) NOT NULL DEFAULT 0,

  -- Contract dates
  start_date        date NOT NULL,
  end_date          date,   -- null = open-ended

  -- Lifecycle: active | paused | cancelled | expired
  status            text NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'paused', 'cancelled', 'expired')),

  -- Computed date of the next expected invoice; updated after each invoice created
  next_billing_date date,

  notes             text,

  created_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  updated_by        uuid
);

CREATE INDEX IF NOT EXISTS haraka_retainers_org_idx
  ON haraka_retainers(organization_id);
CREATE INDEX IF NOT EXISTS haraka_retainers_org_status_idx
  ON haraka_retainers(organization_id, status);
CREATE INDEX IF NOT EXISTS haraka_retainers_org_customer_idx
  ON haraka_retainers(organization_id, customer_id)
  WHERE customer_id IS NOT NULL;

CREATE OR REPLACE TRIGGER haraka_retainers_set_updated_at
  BEFORE UPDATE ON haraka_retainers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Retainer invoices ─────────────────────────────────────────────────────
-- One row per billing cycle. Created manually or on a schedule.
CREATE TABLE IF NOT EXISTS haraka_retainer_invoices (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  retainer_id           uuid NOT NULL REFERENCES haraka_retainers(id) ON DELETE CASCADE,
  organization_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Reference number (e.g. RINV-2026-000001)
  invoice_number        text NOT NULL,

  billing_period_start  date NOT NULL,
  billing_period_end    date NOT NULL,
  due_date              date,

  -- Snapshot of financials at invoice time
  amount                numeric(14,4) NOT NULL,
  tax_amount            numeric(14,4) NOT NULL DEFAULT 0,
  total                 numeric(14,4) NOT NULL,

  -- Payment tracking
  payment_status        text NOT NULL DEFAULT 'unpaid'
                          CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  amount_paid           numeric(14,4) NOT NULL DEFAULT 0,
  payment_method        text,
  paid_at               timestamptz,

  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid
);

CREATE INDEX IF NOT EXISTS haraka_retainer_invoices_retainer_idx
  ON haraka_retainer_invoices(retainer_id);
CREATE INDEX IF NOT EXISTS haraka_retainer_invoices_org_idx
  ON haraka_retainer_invoices(organization_id);
CREATE INDEX IF NOT EXISTS haraka_retainer_invoices_org_created_idx
  ON haraka_retainer_invoices(organization_id, created_at DESC);

-- ── RLS ───────────────────────────────────────────────────────────────────

-- Counters — service-role only
ALTER TABLE haraka_retainer_counters         ENABLE ROW LEVEL SECURITY;
ALTER TABLE haraka_retainer_invoice_counters ENABLE ROW LEVEL SECURITY;

-- haraka_retainers
ALTER TABLE haraka_retainers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS haraka_retainers_platform_all ON haraka_retainers;
CREATE POLICY haraka_retainers_platform_all ON haraka_retainers
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS haraka_retainers_mgr_all ON haraka_retainers;
CREATE POLICY haraka_retainers_mgr_all ON haraka_retainers
  FOR ALL USING (public.is_org_manager(organization_id))
  WITH CHECK (public.is_org_manager(organization_id));

DROP POLICY IF EXISTS haraka_retainers_staff_read ON haraka_retainers;
CREATE POLICY haraka_retainers_staff_read ON haraka_retainers
  FOR SELECT USING (public.belongs_to_org(organization_id));

-- haraka_retainer_invoices
ALTER TABLE haraka_retainer_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS haraka_retainer_invoices_platform_all ON haraka_retainer_invoices;
CREATE POLICY haraka_retainer_invoices_platform_all ON haraka_retainer_invoices
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS haraka_retainer_invoices_mgr_all ON haraka_retainer_invoices;
CREATE POLICY haraka_retainer_invoices_mgr_all ON haraka_retainer_invoices
  FOR ALL USING (public.is_org_manager(organization_id))
  WITH CHECK (public.is_org_manager(organization_id));

DROP POLICY IF EXISTS haraka_retainer_invoices_staff_read ON haraka_retainer_invoices;
CREATE POLICY haraka_retainer_invoices_staff_read ON haraka_retainer_invoices
  FOR SELECT USING (public.belongs_to_org(organization_id));

-- ── Managed list seeds ────────────────────────────────────────────────────

-- retainer_status: SYSTEM list
INSERT INTO platform_list_items (list_key, value, label, label_ar, color, sort_order, is_system) VALUES
  ('retainer_status', 'active',    'Active',    'نشط',     '#22c55e', 1, true),
  ('retainer_status', 'paused',    'Paused',    'متوقف',   '#eab308', 2, true),
  ('retainer_status', 'cancelled', 'Cancelled', 'ملغي',    '#ef4444', 3, true),
  ('retainer_status', 'expired',   'Expired',   'منتهي',   '#6b7280', 4, true)
ON CONFLICT (list_key, value) DO NOTHING;

-- retainer_billing_cycle: SYSTEM list
INSERT INTO platform_list_items (list_key, value, label, label_ar, color, sort_order, is_system) VALUES
  ('retainer_billing_cycle', 'monthly',   'Monthly',   'شهري',   null, 1, true),
  ('retainer_billing_cycle', 'quarterly', 'Quarterly', 'ربع سنوي', null, 2, true),
  ('retainer_billing_cycle', 'annual',    'Annual',    'سنوي',   null, 3, true)
ON CONFLICT (list_key, value) DO NOTHING;
