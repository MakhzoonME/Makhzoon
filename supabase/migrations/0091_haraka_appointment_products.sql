-- ════════════════════════════════════════════════════════════════════════
-- 0091_haraka_appointment_products.sql
-- Lets a Haraka appointment (e.g. a doctor's visit) also carry stock-tracked
-- products dispensed during the visit (an injection, medicine) alongside its
-- single catalog service. One row per product line, mirroring the ledger
-- shape used elsewhere on haraka_appointments.
--
-- Products can be added/removed at any appointment status (unlike payments,
-- which are blocked once an appointment reaches a terminal non-invoicing
-- status) — a product may need recording even for a cancelled/no-show visit.
--
-- Stock deduction/restoration is wired at the application layer, not here:
-- AppointmentsRepository.addPayment/removePayment (which read/write the
-- shared `payments` table added in 0090_unified_payments.sql) deduct product
-- stock the first time an appointment goes from unpaid to any-paid, and
-- restock it if it goes back to fully unpaid.
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS haraka_appointment_products (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  uuid NOT NULL REFERENCES haraka_appointments(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  item_id         uuid NOT NULL REFERENCES inventory_items(id),
  -- Snapshotted at add-time so a later catalog rename/price change never
  -- rewrites history, same convention as haraka_appointments.price.
  item_name       text NOT NULL,
  quantity        integer NOT NULL CHECK (quantity > 0),
  unit_price      numeric(14,4) NOT NULL DEFAULT 0,

  created_by      uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS haraka_appointment_products_appointment_idx
  ON haraka_appointment_products(appointment_id);
CREATE INDEX IF NOT EXISTS haraka_appointment_products_item_idx
  ON haraka_appointment_products(item_id);

-- ── RLS (mirrors haraka_appointment_payments) ────────────────────────────
ALTER TABLE haraka_appointment_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS haraka_appointment_products_platform_all ON haraka_appointment_products;
CREATE POLICY haraka_appointment_products_platform_all ON haraka_appointment_products
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS haraka_appointment_products_mgr_all ON haraka_appointment_products;
CREATE POLICY haraka_appointment_products_mgr_all ON haraka_appointment_products
  FOR ALL USING (public.is_org_manager(organization_id))
  WITH CHECK (public.is_org_manager(organization_id));

DROP POLICY IF EXISTS haraka_appointment_products_staff_read ON haraka_appointment_products;
CREATE POLICY haraka_appointment_products_staff_read ON haraka_appointment_products
  FOR SELECT USING (public.belongs_to_org(organization_id));
