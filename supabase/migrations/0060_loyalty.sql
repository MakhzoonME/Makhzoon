-- ════════════════════════════════════════════════════════════════════════
-- 0060_loyalty.sql
-- Loyalty module — tiers, points, barcode membership card. Independent of
-- Haraka: hangs off pos_customers only, gated by the 'loyalty' feature flag
-- from 0058. Any org (retail or service-based) can enable it and award
-- points from whichever completion point its own module already has.
-- ════════════════════════════════════════════════════════════════════════

-- ── Program config (one row per org) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS loyalty_programs (
  organization_id     uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  enabled             boolean NOT NULL DEFAULT false,
  points_per_currency  numeric(10,4) NOT NULL DEFAULT 1, -- points earned per 1 unit of org currency spent
  -- Ascending tier thresholds, e.g. [{"tier":"bronze","minPoints":0},
  -- {"tier":"silver","minPoints":500},{"tier":"gold","minPoints":2000}]
  tiers               jsonb NOT NULL DEFAULT '[{"tier":"bronze","minPoints":0}]',
  updated_at          timestamptz NOT NULL DEFAULT now(),
  updated_by          uuid
);

CREATE OR REPLACE TRIGGER loyalty_programs_set_updated_at
  BEFORE UPDATE ON loyalty_programs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Members ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loyalty_members (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id       uuid NOT NULL REFERENCES pos_customers(id) ON DELETE CASCADE,
  card_number       text NOT NULL,        -- barcode value shown on the loyalty card
  tier              text NOT NULL DEFAULT 'bronze',
  points_balance    integer NOT NULL DEFAULT 0,
  enrolled_at       timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT loyalty_members_org_customer_unique UNIQUE (organization_id, customer_id),
  CONSTRAINT loyalty_members_org_card_unique UNIQUE (organization_id, card_number)
);

CREATE INDEX IF NOT EXISTS loyalty_members_org_idx
  ON loyalty_members(organization_id);
CREATE INDEX IF NOT EXISTS loyalty_members_card_idx
  ON loyalty_members(organization_id, card_number);

CREATE OR REPLACE TRIGGER loyalty_members_set_updated_at
  BEFORE UPDATE ON loyalty_members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Points ledger (append-only; points_balance above is the cached total) ──
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  member_id          uuid NOT NULL REFERENCES loyalty_members(id) ON DELETE CASCADE,
  delta              integer NOT NULL,     -- positive = earned, negative = redeemed
  reason             text NOT NULL,        -- e.g. 'sale', 'redemption', 'manual_adjustment'
  -- Provenance only, never a behavioral branch — which module/record earned
  -- these points (e.g. 'haraka_service_jobs' / job id, 'pos_orders' / order id).
  source_module      text,
  source_record_id   uuid,
  created_at         timestamptz NOT NULL DEFAULT now(),
  created_by         uuid
);

CREATE INDEX IF NOT EXISTS loyalty_transactions_member_idx
  ON loyalty_transactions(member_id, created_at DESC);

-- ── RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE loyalty_programs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS loyalty_programs_platform_all ON loyalty_programs;
CREATE POLICY loyalty_programs_platform_all ON loyalty_programs
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS loyalty_programs_mgr_all ON loyalty_programs;
CREATE POLICY loyalty_programs_mgr_all ON loyalty_programs
  FOR ALL USING (public.is_org_manager(organization_id))
  WITH CHECK (public.is_org_manager(organization_id));

DROP POLICY IF EXISTS loyalty_programs_staff_read ON loyalty_programs;
CREATE POLICY loyalty_programs_staff_read ON loyalty_programs
  FOR SELECT USING (public.belongs_to_org(organization_id));

ALTER TABLE loyalty_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS loyalty_members_platform_all ON loyalty_members;
CREATE POLICY loyalty_members_platform_all ON loyalty_members
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS loyalty_members_mgr_all ON loyalty_members;
CREATE POLICY loyalty_members_mgr_all ON loyalty_members
  FOR ALL USING (public.is_org_manager(organization_id))
  WITH CHECK (public.is_org_manager(organization_id));

DROP POLICY IF EXISTS loyalty_members_staff_read ON loyalty_members;
CREATE POLICY loyalty_members_staff_read ON loyalty_members
  FOR SELECT USING (public.belongs_to_org(organization_id));

ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS loyalty_transactions_platform_all ON loyalty_transactions;
CREATE POLICY loyalty_transactions_platform_all ON loyalty_transactions
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS loyalty_transactions_mgr_all ON loyalty_transactions;
CREATE POLICY loyalty_transactions_mgr_all ON loyalty_transactions
  FOR ALL USING (public.is_org_manager(organization_id))
  WITH CHECK (public.is_org_manager(organization_id));

DROP POLICY IF EXISTS loyalty_transactions_staff_read ON loyalty_transactions;
CREATE POLICY loyalty_transactions_staff_read ON loyalty_transactions
  FOR SELECT USING (public.belongs_to_org(organization_id));
