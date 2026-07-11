-- ════════════════════════════════════════════════════════════════════════
-- 0021_haraka_orders_complete.sql
-- Consolidates 0018 / 0019 / 0020 into one fully-idempotent migration.
-- Safe to run on any database state (new or already partially applied).
-- ════════════════════════════════════════════════════════════════════════

-- ── Columns on haraka_orders ──────────────────────────────────────────────
ALTER TABLE haraka_orders
  ADD COLUMN IF NOT EXISTS invoice_number  text,
  ADD COLUMN IF NOT EXISTS delivery_token  text;

-- Unique constraint on delivery_token (idempotent guard)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'haraka_orders_delivery_token_key'
      AND conrelid = 'haraka_orders'::regclass
  ) THEN
    ALTER TABLE haraka_orders ADD CONSTRAINT haraka_orders_delivery_token_key UNIQUE (delivery_token);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS haraka_orders_delivery_token_idx
  ON haraka_orders(delivery_token)
  WHERE delivery_token IS NOT NULL;

-- ── Invoice number counters ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS haraka_invoice_counters (
  organization_id uuid    NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  year            integer NOT NULL,
  last_sequence   bigint  NOT NULL DEFAULT 0,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT haraka_invoice_counters_pk PRIMARY KEY (organization_id, year)
);

-- ── Split payment entries ─────────────────────────────────────────────────
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

-- ── Order document config in org settings ────────────────────────────────
ALTER TABLE organization_configs
  ADD COLUMN IF NOT EXISTS order_document_config jsonb;

-- ── Managed list seeds ────────────────────────────────────────────────────

-- Payment status list (system — values drive invoice-vs-receipt logic)
INSERT INTO platform_list_items (list_key, value, label, label_ar, color, sort_order, is_system) VALUES
  ('order_payment_status', 'unpaid',  'Unpaid',        'غير مدفوع',    '#ef4444', 1, true),
  ('order_payment_status', 'partial', 'Partially Paid', 'مدفوع جزئياً', '#f97316', 2, true),
  ('order_payment_status', 'paid',    'Paid',           'مدفوع',        '#22c55e', 3, true)
ON CONFLICT (list_key, value) DO NOTHING;
