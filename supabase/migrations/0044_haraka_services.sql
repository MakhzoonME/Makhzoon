-- ════════════════════════════════════════════════════════════════════════
-- 0044_haraka_services.sql
-- POS Services — a standalone catalog for sellable services, independent of
-- Raseed's stock items. Used by the Haraka POS register (alongside
-- products), and referenced as an optional pick-from-catalog when building
-- Service Job line items or setting a Retainer's amount-per-cycle.
--
-- Also migrates any existing inventory_items rows with item_type='service'
-- (added in 0041) into this table, then drops that column — Raseed's
-- inventory catalog goes back to being products-only.
-- ════════════════════════════════════════════════════════════════════════

-- ── haraka_services ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS haraka_services (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  space_id          text,

  name              text NOT NULL,
  category          text,
  description       text,
  price             numeric(14,4) NOT NULL DEFAULT 0,
  tax_rate_id       uuid,
  active            boolean NOT NULL DEFAULT true,

  created_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid,
  created_by_email  text,
  created_by_name   text,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  updated_by        uuid,
  updated_by_email  text,
  updated_by_name   text
);

CREATE INDEX IF NOT EXISTS haraka_services_org_idx
  ON haraka_services(organization_id);
CREATE INDEX IF NOT EXISTS haraka_services_org_active_idx
  ON haraka_services(organization_id, active);
CREATE INDEX IF NOT EXISTS haraka_services_org_category_idx
  ON haraka_services(organization_id, category);

CREATE OR REPLACE TRIGGER haraka_services_set_updated_at
  BEFORE UPDATE ON haraka_services
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE haraka_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS haraka_services_platform_all ON haraka_services;
CREATE POLICY haraka_services_platform_all ON haraka_services
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS haraka_services_mgr_all ON haraka_services;
CREATE POLICY haraka_services_mgr_all ON haraka_services
  FOR ALL USING (public.is_org_manager(organization_id))
  WITH CHECK (public.is_org_manager(organization_id));

DROP POLICY IF EXISTS haraka_services_staff_read ON haraka_services;
CREATE POLICY haraka_services_staff_read ON haraka_services
  FOR SELECT USING (public.belongs_to_org(organization_id));

-- ── Migrate existing "service" inventory items into the new catalog ───────
INSERT INTO haraka_services (
  organization_id, name, category, price, tax_rate_id, active,
  created_at, created_by, created_by_email, created_by_name,
  updated_at, updated_by, updated_by_email, updated_by_name
)
SELECT
  organization_id, name, category,
  COALESCE(pos_price, unit_cost, 0), tax_rate_id, pos_enabled,
  created_at, created_by, created_by_email, created_by_name,
  updated_at, updated_by, updated_by_email, updated_by_name
FROM inventory_items
WHERE item_type = 'service';

DELETE FROM inventory_items WHERE item_type = 'service';

-- ── Raseed inventory is products-only again ────────────────────────────────
DROP INDEX IF EXISTS idx_inventory_items_item_type;
ALTER TABLE inventory_items DROP COLUMN IF EXISTS item_type;
