-- ════════════════════════════════════════════════════════════════════════
-- 0090_unified_payments.sql
-- Unified payments ledger — shared across orders, appointments, service
-- jobs, and retainer invoices. Additive only: the existing per-vertical
-- payment tables (haraka_order_payments, haraka_appointment_payments,
-- haraka_service_job_payments) and haraka_retainer_invoices' amount_paid/
-- payment_status columns keep working unchanged. Application code is
-- repointed at `payments` in a follow-up change; those old tables/columns
-- are dropped in a later migration once every caller (including the public
-- /track and /delivery pages) has been verified against dev.
--
-- Backfilled from the three ledger tables (status='paid', paid_at copied)
-- and from haraka_retainer_invoices (one row per invoice with
-- amount_paid > 0, since retainers have no ledger today).
-- ════════════════════════════════════════════════════════════════════════

-- ── Retainer invoices gain a discount field (orders/appointments/service
--    jobs already have one) ─────────────────────────────────────────────
ALTER TABLE haraka_retainer_invoices
  ADD COLUMN IF NOT EXISTS discount_amount numeric(14,4) NOT NULL DEFAULT 0;

-- ── Unified payments ledger ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Polymorphic reference: which entity this payment line belongs to.
  reference_type  text NOT NULL
                    CHECK (reference_type IN ('order', 'appointment', 'job', 'retainer_invoice')),
  reference_id    uuid NOT NULL,

  amount          numeric(14,4) NOT NULL,
  payment_method  text NOT NULL,

  -- 'unpaid' = still expected/outstanding (e.g. an insurer owes it).
  -- 'written_off' = given up on collecting it (denied claim, bad debt).
  status          text NOT NULL DEFAULT 'paid'
                    CHECK (status IN ('paid', 'unpaid', 'written_off')),
  paid_at         timestamptz,  -- set only when status = 'paid'

  note            text,
  created_by      uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payments_reference_idx
  ON payments(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS payments_org_status_idx
  ON payments(organization_id, status);
CREATE INDEX IF NOT EXISTS payments_org_method_idx
  ON payments(organization_id, payment_method);

-- ── RLS (mirrors haraka_appointment_payments' pattern) ─────────────────
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payments_platform_all ON payments;
CREATE POLICY payments_platform_all ON payments
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS payments_mgr_all ON payments;
CREATE POLICY payments_mgr_all ON payments
  FOR ALL USING (public.is_org_manager(organization_id))
  WITH CHECK (public.is_org_manager(organization_id));

DROP POLICY IF EXISTS payments_staff_read ON payments;
CREATE POLICY payments_staff_read ON payments
  FOR SELECT USING (public.belongs_to_org(organization_id));

-- ── Backfill from existing ledger tables ───────────────────────────────
INSERT INTO payments
  (organization_id, reference_type, reference_id, amount, payment_method, status, paid_at, note, created_by, created_at)
SELECT organization_id, 'order', order_id, amount, COALESCE(payment_method, 'other'), 'paid', paid_at, note, created_by, created_at
FROM haraka_order_payments
ON CONFLICT DO NOTHING;

INSERT INTO payments
  (organization_id, reference_type, reference_id, amount, payment_method, status, paid_at, note, created_by, created_at)
SELECT organization_id, 'appointment', appointment_id, amount, COALESCE(payment_method, 'other'), 'paid', paid_at, note, created_by, created_at
FROM haraka_appointment_payments
ON CONFLICT DO NOTHING;

INSERT INTO payments
  (organization_id, reference_type, reference_id, amount, payment_method, status, paid_at, note, created_by, created_at)
SELECT organization_id, 'job', job_id, amount, COALESCE(payment_method, 'other'), 'paid', paid_at, note, created_by, created_at
FROM haraka_service_job_payments
ON CONFLICT DO NOTHING;

-- Retainer invoices have no ledger today — synthesize one row per invoice
-- that has any amount_paid recorded. Invoices with amount_paid = 0 are
-- correctly represented by having zero rows (nothing to backfill).
INSERT INTO payments
  (organization_id, reference_type, reference_id, amount, payment_method, status, paid_at, created_by, created_at)
SELECT organization_id, 'retainer_invoice', id, amount_paid, COALESCE(payment_method, 'other'), 'paid', COALESCE(paid_at, created_at), created_by, created_at
FROM haraka_retainer_invoices
WHERE amount_paid > 0
ON CONFLICT DO NOTHING;
