-- ════════════════════════════════════════════════════════════════════════
-- 0027_haraka_rls_and_pin_hash.sql
-- Fixes missing RLS policies on 11 Haraka tables created by migrations
-- 0017, 0021, 0022, 0023, 0024, plus adds bcrypt pin_hash column for
-- the cash drawer PIN (replacing plaintext storage).
-- ════════════════════════════════════════════════════════════════════════

-- ── haraka_delivery_agents ──────────────────────────────────────────────
ALTER TABLE haraka_delivery_agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS haraka_delivery_agents_platform_all ON haraka_delivery_agents;
CREATE POLICY haraka_delivery_agents_platform_all ON haraka_delivery_agents
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS haraka_delivery_agents_mgr_all ON haraka_delivery_agents;
CREATE POLICY haraka_delivery_agents_mgr_all ON haraka_delivery_agents
  FOR ALL USING (public.is_org_manager(organization_id))
  WITH CHECK (public.is_org_manager(organization_id));

DROP POLICY IF EXISTS haraka_delivery_agents_staff_read ON haraka_delivery_agents;
CREATE POLICY haraka_delivery_agents_staff_read ON haraka_delivery_agents
  FOR SELECT USING (public.belongs_to_org(organization_id));

-- ── haraka_order_counters (service-role only — no public policies) ──────
ALTER TABLE haraka_order_counters ENABLE ROW LEVEL SECURITY;

-- ── haraka_orders ───────────────────────────────────────────────────────
ALTER TABLE haraka_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS haraka_orders_platform_all ON haraka_orders;
CREATE POLICY haraka_orders_platform_all ON haraka_orders
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS haraka_orders_mgr_all ON haraka_orders;
CREATE POLICY haraka_orders_mgr_all ON haraka_orders
  FOR ALL USING (public.is_org_manager(organization_id))
  WITH CHECK (public.is_org_manager(organization_id));

DROP POLICY IF EXISTS haraka_orders_staff_read ON haraka_orders;
CREATE POLICY haraka_orders_staff_read ON haraka_orders
  FOR SELECT USING (public.belongs_to_org(organization_id));

-- ── haraka_invoice_counters (service-role only — no public policies) ────
ALTER TABLE haraka_invoice_counters ENABLE ROW LEVEL SECURITY;

-- ── haraka_order_payments ───────────────────────────────────────────────
ALTER TABLE haraka_order_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS haraka_order_payments_platform_all ON haraka_order_payments;
CREATE POLICY haraka_order_payments_platform_all ON haraka_order_payments
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS haraka_order_payments_mgr_all ON haraka_order_payments;
CREATE POLICY haraka_order_payments_mgr_all ON haraka_order_payments
  FOR ALL USING (public.is_org_manager(organization_id))
  WITH CHECK (public.is_org_manager(organization_id));

DROP POLICY IF EXISTS haraka_order_payments_staff_read ON haraka_order_payments;
CREATE POLICY haraka_order_payments_staff_read ON haraka_order_payments
  FOR SELECT USING (public.belongs_to_org(organization_id));

-- ── haraka_cash_drawer_config ───────────────────────────────────────────
ALTER TABLE haraka_cash_drawer_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS haraka_cash_drawer_config_platform_all ON haraka_cash_drawer_config;
CREATE POLICY haraka_cash_drawer_config_platform_all ON haraka_cash_drawer_config
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS haraka_cash_drawer_config_mgr_all ON haraka_cash_drawer_config;
CREATE POLICY haraka_cash_drawer_config_mgr_all ON haraka_cash_drawer_config
  FOR ALL USING (public.is_org_manager(organization_id))
  WITH CHECK (public.is_org_manager(organization_id));

DROP POLICY IF EXISTS haraka_cash_drawer_config_staff_read ON haraka_cash_drawer_config;
CREATE POLICY haraka_cash_drawer_config_staff_read ON haraka_cash_drawer_config
  FOR SELECT USING (public.belongs_to_org(organization_id));

-- ── haraka_warranty_counters (service-role only) ────────────────────────
ALTER TABLE haraka_warranty_counters ENABLE ROW LEVEL SECURITY;

-- ── haraka_warranty_configs ─────────────────────────────────────────────
ALTER TABLE haraka_warranty_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS haraka_warranty_configs_platform_all ON haraka_warranty_configs;
CREATE POLICY haraka_warranty_configs_platform_all ON haraka_warranty_configs
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS haraka_warranty_configs_mgr_all ON haraka_warranty_configs;
CREATE POLICY haraka_warranty_configs_mgr_all ON haraka_warranty_configs
  FOR ALL USING (public.is_org_manager(organization_id))
  WITH CHECK (public.is_org_manager(organization_id));

DROP POLICY IF EXISTS haraka_warranty_configs_staff_read ON haraka_warranty_configs;
CREATE POLICY haraka_warranty_configs_staff_read ON haraka_warranty_configs
  FOR SELECT USING (public.belongs_to_org(organization_id));

-- ── haraka_warranty_certs ───────────────────────────────────────────────
ALTER TABLE haraka_warranty_certs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS haraka_warranty_certs_platform_all ON haraka_warranty_certs;
CREATE POLICY haraka_warranty_certs_platform_all ON haraka_warranty_certs
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS haraka_warranty_certs_mgr_all ON haraka_warranty_certs;
CREATE POLICY haraka_warranty_certs_mgr_all ON haraka_warranty_certs
  FOR ALL USING (public.is_org_manager(organization_id))
  WITH CHECK (public.is_org_manager(organization_id));

DROP POLICY IF EXISTS haraka_warranty_certs_staff_read ON haraka_warranty_certs;
CREATE POLICY haraka_warranty_certs_staff_read ON haraka_warranty_certs
  FOR SELECT USING (public.belongs_to_org(organization_id));

-- ── haraka_card_terminal_config ─────────────────────────────────────────
ALTER TABLE haraka_card_terminal_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS haraka_card_terminal_config_platform_all ON haraka_card_terminal_config;
CREATE POLICY haraka_card_terminal_config_platform_all ON haraka_card_terminal_config
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS haraka_card_terminal_config_mgr_all ON haraka_card_terminal_config;
CREATE POLICY haraka_card_terminal_config_mgr_all ON haraka_card_terminal_config
  FOR ALL USING (public.is_org_manager(organization_id))
  WITH CHECK (public.is_org_manager(organization_id));

DROP POLICY IF EXISTS haraka_card_terminal_config_staff_read ON haraka_card_terminal_config;
CREATE POLICY haraka_card_terminal_config_staff_read ON haraka_card_terminal_config
  FOR SELECT USING (public.belongs_to_org(organization_id));

-- ── haraka_card_charges ─────────────────────────────────────────────────
ALTER TABLE haraka_card_charges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS haraka_card_charges_platform_all ON haraka_card_charges;
CREATE POLICY haraka_card_charges_platform_all ON haraka_card_charges
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS haraka_card_charges_mgr_all ON haraka_card_charges;
CREATE POLICY haraka_card_charges_mgr_all ON haraka_card_charges
  FOR ALL USING (public.is_org_manager(organization_id))
  WITH CHECK (public.is_org_manager(organization_id));

DROP POLICY IF EXISTS haraka_card_charges_staff_read ON haraka_card_charges;
CREATE POLICY haraka_card_charges_staff_read ON haraka_card_charges
  FOR SELECT USING (public.belongs_to_org(organization_id));

-- ════════════════════════════════════════════════════════════════════════
-- PIN hashing — add pin_hash column to cash drawer config
-- ════════════════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE haraka_cash_drawer_config
  ADD COLUMN IF NOT EXISTS pin_hash text;

-- Migrate existing plaintext PINs to bcrypt hashes via pgcrypto.
-- The application layer will now write to pin_hash and ignore the pin column.
UPDATE haraka_cash_drawer_config
  SET pin_hash = crypt(pin, gen_salt('bf', 8))
  WHERE pin IS NOT NULL AND pin != ''
    AND (pin_hash IS NULL OR pin_hash = '');

-- Drop the old plaintext pin column now that hashes are in place.
-- If there are existing PINs that couldn't be hashed (should not happen),
-- the DROP will fail — inspect before deploying.
ALTER TABLE haraka_cash_drawer_config
  DROP COLUMN IF EXISTS pin;
