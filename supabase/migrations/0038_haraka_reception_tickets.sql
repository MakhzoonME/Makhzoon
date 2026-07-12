-- ════════════════════════════════════════════════════════════════════════
-- 0038_haraka_reception_tickets.sql
-- Haraka Reception Tickets — front-desk intake for walk-in customers.
-- A receptionist records the products (inventory items) and services
-- (linked haraka_service_jobs row) a customer wants; the cashier later
-- opens the ticket on the POS register to collect payment.
-- ════════════════════════════════════════════════════════════════════════

-- ── Ticket number sequence ────────────────────────────────────────────────
-- One row per (org, space). Atomically incremented on each new ticket.
CREATE TABLE IF NOT EXISTS haraka_reception_ticket_counters (
  organization_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  space_id            text NOT NULL DEFAULT '',
  last_ticket_number  integer NOT NULL DEFAULT 0,
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT haraka_reception_ticket_counters_pk PRIMARY KEY (organization_id, space_id)
);

-- ── Reception tickets ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS haraka_reception_tickets (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  space_id          text,

  -- Reference number allocated from haraka_reception_ticket_counters (e.g. RCP-000042)
  ticket_number     text NOT NULL,

  -- Lifecycle: open (editable by reception) → paid | cancelled
  status            text NOT NULL DEFAULT 'open'
                      CHECK (status IN ('open', 'paid', 'cancelled')),

  -- Customer — can link pos_customers or be ad-hoc name + phone
  customer_id       uuid REFERENCES pos_customers(id) ON DELETE SET NULL,
  customer_name     text NOT NULL,
  customer_phone    text,

  -- Product line items — POS-enabled inventory items, same shape as
  -- pos_transactions.items:
  --   { itemId, itemName, sku, barcode, quantity, unitPrice,
  --     taxRateId, taxRate, taxAmount, discountAmount, lineTotal }
  items             jsonb NOT NULL DEFAULT '[]',

  -- Service lines live on a linked service job (one job per ticket),
  -- created when the ticket has service lines.
  service_job_id    uuid REFERENCES haraka_service_jobs(id) ON DELETE SET NULL,

  -- Product-portion totals (services are totalled on the linked job)
  products_subtotal numeric(14,4) NOT NULL DEFAULT 0,
  products_discount numeric(14,4) NOT NULL DEFAULT 0,
  products_tax      numeric(14,4) NOT NULL DEFAULT 0,
  products_total    numeric(14,4) NOT NULL DEFAULT 0,
  services_total    numeric(14,4) NOT NULL DEFAULT 0,
  grand_total       numeric(14,4) NOT NULL DEFAULT 0,

  notes             text,

  -- Set at checkout: the POS transaction that settled the product lines
  pos_transaction_id uuid REFERENCES pos_transactions(id) ON DELETE SET NULL,
  paid_at           timestamptz,

  created_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  updated_by        uuid
);

CREATE INDEX IF NOT EXISTS haraka_reception_tickets_org_idx
  ON haraka_reception_tickets(organization_id);
CREATE INDEX IF NOT EXISTS haraka_reception_tickets_org_status_idx
  ON haraka_reception_tickets(organization_id, status);
CREATE INDEX IF NOT EXISTS haraka_reception_tickets_org_created_idx
  ON haraka_reception_tickets(organization_id, created_at DESC);

CREATE OR REPLACE TRIGGER haraka_reception_tickets_set_updated_at
  BEFORE UPDATE ON haraka_reception_tickets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────

-- haraka_reception_ticket_counters — service-role only (no public policies)
ALTER TABLE haraka_reception_ticket_counters ENABLE ROW LEVEL SECURITY;

-- haraka_reception_tickets
ALTER TABLE haraka_reception_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS haraka_reception_tickets_platform_all ON haraka_reception_tickets;
CREATE POLICY haraka_reception_tickets_platform_all ON haraka_reception_tickets
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS haraka_reception_tickets_mgr_all ON haraka_reception_tickets;
CREATE POLICY haraka_reception_tickets_mgr_all ON haraka_reception_tickets
  FOR ALL USING (public.is_org_manager(organization_id))
  WITH CHECK (public.is_org_manager(organization_id));

DROP POLICY IF EXISTS haraka_reception_tickets_staff_read ON haraka_reception_tickets;
CREATE POLICY haraka_reception_tickets_staff_read ON haraka_reception_tickets
  FOR SELECT USING (public.belongs_to_org(organization_id));

-- ── Managed list seeds ────────────────────────────────────────────────────

-- reception_ticket_status: SYSTEM list — values drive status machine
INSERT INTO platform_list_items (list_key, value, label, label_ar, color, sort_order, is_system) VALUES
  ('reception_ticket_status', 'open',      'Open',      'مفتوحة',  '#3b82f6', 1, true),
  ('reception_ticket_status', 'paid',      'Paid',      'مدفوعة',  '#22c55e', 2, true),
  ('reception_ticket_status', 'cancelled', 'Cancelled', 'ملغاة',   '#ef4444', 3, true)
ON CONFLICT (list_key, value) DO NOTHING;
