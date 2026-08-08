-- ════════════════════════════════════════════════════════════════════════
-- 0059_haraka_service_vehicles.sql
-- Vehicle/plate intake, multi-agent job assignment, post-service ratings,
-- and per-org WhatsApp/SMS/OCR provider config for Haraka Service Jobs
-- (car-care vertical, behind the 'vehicleIntake' feature flag from 0058).
-- ════════════════════════════════════════════════════════════════════════

-- ── Vehicles (the asset being serviced) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS haraka_service_vehicles (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id       uuid REFERENCES pos_customers(id) ON DELETE SET NULL,
  plate_number      text NOT NULL,
  make              text,
  model             text,
  color             text,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  updated_by        uuid,
  CONSTRAINT haraka_service_vehicles_org_plate_unique UNIQUE (organization_id, plate_number)
);

CREATE INDEX IF NOT EXISTS haraka_service_vehicles_org_idx
  ON haraka_service_vehicles(organization_id);
CREATE INDEX IF NOT EXISTS haraka_service_vehicles_customer_idx
  ON haraka_service_vehicles(customer_id);

CREATE OR REPLACE TRIGGER haraka_service_vehicles_set_updated_at
  BEFORE UPDATE ON haraka_service_vehicles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Link a job to the vehicle serviced ─────────────────────────────────────
ALTER TABLE haraka_service_jobs
  ADD COLUMN IF NOT EXISTS vehicle_id uuid REFERENCES haraka_service_vehicles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS haraka_service_jobs_vehicle_idx
  ON haraka_service_jobs(vehicle_id) WHERE vehicle_id IS NOT NULL;

-- ── Customer rating link token ──────────────────────────────────────────────
-- Same shape as haraka_orders.customer_token (0054): a public, unauthenticated
-- /api/rate/[token] route resolves this — no session, no mutation beyond
-- submitting the one rating the unique constraint on haraka_service_ratings
-- already allows.
ALTER TABLE haraka_service_jobs
  ADD COLUMN IF NOT EXISTS rating_token            text,
  ADD COLUMN IF NOT EXISTS rating_token_expires_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'haraka_service_jobs_rating_token_key'
  ) THEN
    ALTER TABLE haraka_service_jobs
      ADD CONSTRAINT haraka_service_jobs_rating_token_key UNIQUE (rating_token);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS haraka_service_jobs_rating_token_idx
  ON haraka_service_jobs(rating_token);

-- ── Multi-agent job assignment ─────────────────────────────────────────────
-- Replaces reliance on the unused staff_member_id/staff_member_name stub on
-- haraka_service_jobs (left untouched — nothing depends on it). A job can
-- have N delivery agents; role distinguishes primary vs. helper.
CREATE TABLE IF NOT EXISTS haraka_service_job_agents (
  job_id            uuid NOT NULL REFERENCES haraka_service_jobs(id) ON DELETE CASCADE,
  delivery_agent_id uuid NOT NULL REFERENCES haraka_delivery_agents(id) ON DELETE CASCADE,
  role              text NOT NULL DEFAULT 'primary' CHECK (role IN ('primary', 'helper')),
  assigned_at       timestamptz NOT NULL DEFAULT now(),
  assigned_by       uuid,
  CONSTRAINT haraka_service_job_agents_pk PRIMARY KEY (job_id, delivery_agent_id)
);

CREATE INDEX IF NOT EXISTS haraka_service_job_agents_agent_idx
  ON haraka_service_job_agents(delivery_agent_id);

-- ── Post-service ratings ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS haraka_service_ratings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  job_id            uuid NOT NULL REFERENCES haraka_service_jobs(id) ON DELETE CASCADE,
  rating            int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment           text,
  submitted_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT haraka_service_ratings_job_unique UNIQUE (job_id)
);

CREATE INDEX IF NOT EXISTS haraka_service_ratings_org_idx
  ON haraka_service_ratings(organization_id, submitted_at DESC);

-- ── Per-org WhatsApp/OCR provider config ───────────────────────────────────
-- Same shape as haraka_card_terminal_config (0024): encrypted secret columns,
-- never returned to the client, server-side only. WhatsApp only — no SMS
-- fallback for this client.
CREATE TABLE IF NOT EXISTS haraka_service_notification_config (
  organization_id         uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  whatsapp_enabled         boolean NOT NULL DEFAULT false,
  whatsapp_phone_number_id text,           -- Meta Cloud API phone number ID
  whatsapp_token_enc       text,           -- server-side encrypted permanent access token
  whatsapp_webhook_secret  text,           -- verifies inbound Meta delivery-status webhooks
  ocr_provider             text NOT NULL DEFAULT 'fastplateocr',
  ocr_api_key_enc          text,           -- server-side encrypted
  updated_at               timestamptz NOT NULL DEFAULT now(),
  updated_by               uuid
);

CREATE OR REPLACE TRIGGER haraka_service_notification_config_set_updated_at
  BEFORE UPDATE ON haraka_service_notification_config
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE haraka_service_vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS haraka_service_vehicles_platform_all ON haraka_service_vehicles;
CREATE POLICY haraka_service_vehicles_platform_all ON haraka_service_vehicles
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS haraka_service_vehicles_mgr_all ON haraka_service_vehicles;
CREATE POLICY haraka_service_vehicles_mgr_all ON haraka_service_vehicles
  FOR ALL USING (public.is_org_manager(organization_id))
  WITH CHECK (public.is_org_manager(organization_id));

DROP POLICY IF EXISTS haraka_service_vehicles_staff_read ON haraka_service_vehicles;
CREATE POLICY haraka_service_vehicles_staff_read ON haraka_service_vehicles
  FOR SELECT USING (public.belongs_to_org(organization_id));

ALTER TABLE haraka_service_job_agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS haraka_service_job_agents_platform_all ON haraka_service_job_agents;
CREATE POLICY haraka_service_job_agents_platform_all ON haraka_service_job_agents
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS haraka_service_job_agents_mgr_all ON haraka_service_job_agents;
CREATE POLICY haraka_service_job_agents_mgr_all ON haraka_service_job_agents
  FOR ALL USING (
    public.is_org_manager((SELECT organization_id FROM haraka_service_jobs WHERE id = job_id))
  )
  WITH CHECK (
    public.is_org_manager((SELECT organization_id FROM haraka_service_jobs WHERE id = job_id))
  );

DROP POLICY IF EXISTS haraka_service_job_agents_staff_read ON haraka_service_job_agents;
CREATE POLICY haraka_service_job_agents_staff_read ON haraka_service_job_agents
  FOR SELECT USING (
    public.belongs_to_org((SELECT organization_id FROM haraka_service_jobs WHERE id = job_id))
  );

ALTER TABLE haraka_service_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS haraka_service_ratings_platform_all ON haraka_service_ratings;
CREATE POLICY haraka_service_ratings_platform_all ON haraka_service_ratings
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS haraka_service_ratings_mgr_all ON haraka_service_ratings;
CREATE POLICY haraka_service_ratings_mgr_all ON haraka_service_ratings
  FOR ALL USING (public.is_org_manager(organization_id))
  WITH CHECK (public.is_org_manager(organization_id));

DROP POLICY IF EXISTS haraka_service_ratings_staff_read ON haraka_service_ratings;
CREATE POLICY haraka_service_ratings_staff_read ON haraka_service_ratings
  FOR SELECT USING (public.belongs_to_org(organization_id));

-- haraka_service_notification_config — holds encrypted secrets; service-role
-- only, no public policies (mirrors haraka_card_terminal_config).
ALTER TABLE haraka_service_notification_config ENABLE ROW LEVEL SECURITY;

-- ── Org relabel for this car-care client ───────────────────────────────────
-- service_job_status is a SYSTEM list (0034) — code owns the VALUE
-- (new/confirmed/in_progress/done/cancelled), org_list_items only overrides
-- the displayed label. This block is a template; the actual organization_id
-- must be substituted for the specific client before running (see plan's
-- manual-steps note — I'll fill this in once you confirm the org slug).
--
-- insert into org_list_items (organization_id, list_key, value, label, label_ar, is_custom)
-- values
--   ('<ORG_ID>', 'service_job_status', 'new',         'Received',     'تم الاستلام', false),
--   ('<ORG_ID>', 'service_job_status', 'confirmed',   'Waiting',      'قيد الانتظار', false),
--   ('<ORG_ID>', 'service_job_status', 'in_progress', 'In Progress',  'قيد التنفيذ',  false),
--   ('<ORG_ID>', 'service_job_status', 'done',        'Finished',     'منتهي',        false)
-- on conflict (organization_id, list_key, value) do update set label = excluded.label, label_ar = excluded.label_ar;
