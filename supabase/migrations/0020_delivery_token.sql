-- ════════════════════════════════════════════════════════════════════════
-- 0020_delivery_token.sql
-- Adds a secure, shareable delivery token to haraka_orders.
-- The token is a capability key — possession = access to the public
-- delivery page. Generated on first share, never changes.
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE haraka_orders
  ADD COLUMN IF NOT EXISTS delivery_token  text UNIQUE,
  ADD COLUMN IF NOT EXISTS invoice_number  text;

-- Re-declare if 0018 was already applied without invoice_number
-- (safe: ADD COLUMN IF NOT EXISTS is idempotent)

CREATE TABLE IF NOT EXISTS haraka_invoice_counters (
  organization_id uuid    NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  year            integer NOT NULL,
  last_sequence   bigint  NOT NULL DEFAULT 0,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT haraka_invoice_counters_pk PRIMARY KEY (organization_id, year)
);

ALTER TABLE organization_configs
  ADD COLUMN IF NOT EXISTS order_document_config jsonb;

CREATE INDEX IF NOT EXISTS haraka_orders_delivery_token_idx
  ON haraka_orders(delivery_token)
  WHERE delivery_token IS NOT NULL;
