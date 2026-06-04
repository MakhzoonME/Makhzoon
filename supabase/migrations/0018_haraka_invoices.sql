-- ════════════════════════════════════════════════════════════════════════
-- 0018_haraka_invoices.sql
-- Invoice / receipt document support for Haraka orders.
-- Adds invoice numbering and per-org document branding config.
-- ════════════════════════════════════════════════════════════════════════

-- ── Invoice number on orders ──────────────────────────────────────────────
-- Allocated on first document generation; NULL = no invoice issued yet.
ALTER TABLE haraka_orders
  ADD COLUMN IF NOT EXISTS invoice_number text;

-- ── Invoice number counter ────────────────────────────────────────────────
-- One row per (org, year). Atomically incremented on each new invoice.
CREATE TABLE IF NOT EXISTS haraka_invoice_counters (
  organization_id uuid    NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  year            integer NOT NULL,
  last_sequence   bigint  NOT NULL DEFAULT 0,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT haraka_invoice_counters_pk PRIMARY KEY (organization_id, year)
);

-- ── Order document branding config ───────────────────────────────────────
-- Stored alongside receipt_config in organization_configs.
-- Column is nullable; missing = use defaults.
ALTER TABLE organization_configs
  ADD COLUMN IF NOT EXISTS order_document_config jsonb;
