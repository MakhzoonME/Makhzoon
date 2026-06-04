-- ════════════════════════════════════════════════════════════════════════
-- 0023_haraka_warranty_certs.sql
-- Customer-facing warranty certificates generated from orders or POS
-- transactions. Printable, shareable, downloadable — same infrastructure
-- as receipts.
-- ════════════════════════════════════════════════════════════════════════

-- ── Sequential warranty number ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS haraka_warranty_counters (
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  space_id          text NOT NULL DEFAULT '',
  last_number       integer NOT NULL DEFAULT 0,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT haraka_warranty_counters_pk PRIMARY KEY (organization_id, space_id)
);

-- ── Certificate config (one row per org) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS haraka_warranty_configs (
  organization_id       uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  default_duration_days integer NOT NULL DEFAULT 180,
  terms_text            text,
  terms_text_ar         text,
  header_text           text,
  header_text_ar        text,
  footer_text           text,
  footer_text_ar        text,
  show_logo             boolean NOT NULL DEFAULT true,
  show_qr               boolean NOT NULL DEFAULT true,
  language              text NOT NULL DEFAULT 'en' CHECK (language IN ('en','ar','both')),
  template              text NOT NULL DEFAULT 'a4-modern',
  accent_color          text NOT NULL DEFAULT '#C2185B',
  updated_at            timestamptz NOT NULL DEFAULT now(),
  updated_by            uuid
);

CREATE OR REPLACE TRIGGER haraka_warranty_configs_set_updated_at
  BEFORE UPDATE ON haraka_warranty_configs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Certificates ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS haraka_warranty_certs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  space_id            text,
  warranty_number     text NOT NULL,           -- e.g. WRT-000001
  source_type         text NOT NULL CHECK (source_type IN ('order','pos_transaction')),
  order_id            uuid REFERENCES haraka_orders(id) ON DELETE SET NULL,
  transaction_id      uuid REFERENCES pos_transactions(id) ON DELETE SET NULL,
  customer_name       text NOT NULL,
  customer_phone      text,
  items               jsonb NOT NULL DEFAULT '[]',
  warranty_start_date date NOT NULL,
  warranty_end_date   date NOT NULL,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  created_by          uuid,
  updated_at          timestamptz NOT NULL DEFAULT now(),
  updated_by          uuid
);

CREATE INDEX IF NOT EXISTS haraka_warranty_certs_org_idx
  ON haraka_warranty_certs(organization_id);
CREATE INDEX IF NOT EXISTS haraka_warranty_certs_order_idx
  ON haraka_warranty_certs(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS haraka_warranty_certs_tx_idx
  ON haraka_warranty_certs(transaction_id) WHERE transaction_id IS NOT NULL;

CREATE OR REPLACE TRIGGER haraka_warranty_certs_set_updated_at
  BEFORE UPDATE ON haraka_warranty_certs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
