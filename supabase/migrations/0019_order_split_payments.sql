-- ════════════════════════════════════════════════════════════════════════
-- 0019_order_split_payments.sql
-- Split payment entries for Haraka orders + payment status managed list.
-- ════════════════════════════════════════════════════════════════════════

-- ── Individual payment entries ────────────────────────────────────────────
-- Each row is one payment (can have multiple per order).
-- The order's amount_paid and payment_status are recalculated on every insert/delete.
CREATE TABLE IF NOT EXISTS haraka_order_payments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        uuid NOT NULL REFERENCES haraka_orders(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  amount          numeric(14,4) NOT NULL,
  payment_method  text,
  note            text,
  paid_at         timestamptz NOT NULL DEFAULT now(),
  created_by      uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS haraka_order_payments_order_idx
  ON haraka_order_payments(order_id);

-- ── Payment status managed list ───────────────────────────────────────────
-- SYSTEM list — values are code-locked (drive invoice vs receipt logic),
-- but orgs can relabel / recolor them.
INSERT INTO platform_list_items (list_key, value, label, label_ar, color, sort_order, is_system) VALUES
  ('order_payment_status', 'unpaid',  'Unpaid',       'غير مدفوع',       '#ef4444', 1, true),
  ('order_payment_status', 'partial', 'Partially Paid','مدفوع جزئياً',    '#f97316', 2, true),
  ('order_payment_status', 'paid',    'Paid',          'مدفوع',           '#22c55e', 3, true)
ON CONFLICT (list_key, value) DO NOTHING;
