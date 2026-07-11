-- ═══════════════════════════════════════════════════════════════════════
-- PROD SCHEMA CATCH-UP: migrations 0022 → 0035 for ebupajukvyhparjkhlhr
--
-- ebupaj (real production, 20 orgs / 61 users) has 0001–0021 + 0036 + 0037 but
-- is MISSING the 14 migrations below (notifications, cash drawer, warranty
-- certs, card terminal, Banna custom fields, service jobs, retainers).
--
-- SAFETY:
--   • Wrapped in a single BEGIN/COMMIT — atomic. If ANY statement fails the
--     whole thing rolls back and your database is left exactly as it is now.
--   • All new tables are created fresh here, so the one DROP COLUMN (pin on
--     haraka_cash_drawer_config) acts on an empty new table — no data loss.
--   • Idempotent: safe to re-run (guards on the one unguarded constraint).
--
-- BEFORE RUNNING: take a backup (dashboard → Database → Backups, or a manual
-- snapshot). Your prod project currently shows "No backups".
--
-- HOW: Supabase dashboard → ebupajukvyhparjkhlhr → SQL Editor → New query →
--      paste ALL of this → Run. Then run the verification block at the end.
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;


-- ═══════════════════ 0022_haraka_cash_drawer.sql ═══════════════════
-- ════════════════════════════════════════════════════════════════════════
-- 0022_haraka_cash_drawer.sql
-- Cash drawer configuration for the Haraka POS register.
-- The drawer is connected to the receipt printer's RJ11 port and kicked
-- via ESC p m t1 t2 over the existing WebUSB connection.
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS haraka_cash_drawer_config (
  organization_id   uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  enabled           boolean NOT NULL DEFAULT false,
  auto_open_on_cash boolean NOT NULL DEFAULT true,
  require_pin       boolean NOT NULL DEFAULT false,
  pin               text,             -- 4–6 digit PIN; plaintext (RLS-protected, admin-only)
  drawer_port       smallint NOT NULL DEFAULT 0 CHECK (drawer_port IN (0, 1)),
  on_time_ms        smallint NOT NULL DEFAULT 100,
  off_time_ms       smallint NOT NULL DEFAULT 100,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  updated_by        uuid
);

CREATE OR REPLACE TRIGGER haraka_cash_drawer_config_set_updated_at
  BEFORE UPDATE ON haraka_cash_drawer_config
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ═══════════════════ 0023_haraka_warranty_certs.sql ═══════════════════
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

-- ═══════════════════ 0024_haraka_card_terminal.sql ═══════════════════
-- ════════════════════════════════════════════════════════════════════════
-- 0024_haraka_card_terminal.sql
-- Card / Visa terminal integration for the Haraka POS register.
-- Supports four modes: display-only, local bridge, cloud API, webhook.
-- ════════════════════════════════════════════════════════════════════════

-- ── Config (one row per org) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS haraka_card_terminal_config (
  organization_id   uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  enabled           boolean NOT NULL DEFAULT false,
  mode              text    NOT NULL DEFAULT 'display'
                      CHECK (mode IN ('display','local_bridge','cloud','webhook')),
  bridge_url        text,           -- e.g. http://localhost:7433
  provider          text,           -- 'sumup' | 'square' | 'paymob' | 'custom'
  api_key_enc       text,           -- server-side encrypted; NEVER returned to client
  terminal_id       text,           -- physical terminal device ID
  webhook_secret    text,           -- HMAC-SHA256 secret for verifying inbound webhooks
  currency          text    NOT NULL DEFAULT 'JOD',
  timeout_seconds   int     NOT NULL DEFAULT 60,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  updated_by        uuid
);

CREATE OR REPLACE TRIGGER haraka_card_terminal_config_set_updated_at
  BEFORE UPDATE ON haraka_card_terminal_config
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── In-flight / completed charges ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS haraka_card_charges (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  reference         text NOT NULL,     -- POS offlineId or a generated UUID
  amount            numeric(14,4) NOT NULL,
  currency          text NOT NULL DEFAULT 'JOD',
  status            text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','approved','declined','timeout','cancelled')),
  provider_ref      text,              -- terminal's own transaction reference
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT haraka_card_charges_org_ref_unique UNIQUE (organization_id, reference)
);

CREATE INDEX IF NOT EXISTS haraka_card_charges_org_ref_idx
  ON haraka_card_charges(organization_id, reference);
CREATE INDEX IF NOT EXISTS haraka_card_charges_org_created_idx
  ON haraka_card_charges(organization_id, created_at DESC);

CREATE OR REPLACE TRIGGER haraka_card_charges_set_updated_at
  BEFORE UPDATE ON haraka_card_charges
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ═══════════════════ 0025_notifications.sql ═══════════════════
-- ════════════════════════════════════════════════════════════════════════
-- 0025_notifications.sql
-- Platform-wide in-app and email notification system.
-- Service-layer fanout: notificationQueue.enqueue() called directly from
-- services, never via the event bus (which is stateless in serverless).
-- ════════════════════════════════════════════════════════════════════════

-- ── In-app notification rows ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  space_id         text,
  recipient_id     uuid NOT NULL,           -- user who receives this
  event_type       text NOT NULL,           -- e.g. 'order.created'
  title            text NOT NULL,           -- stored as plain EN text at creation time
  body             text,                    -- optional detail line
  data             jsonb NOT NULL DEFAULT '{}', -- context: { orderId, orderNumber, … }
  link             text,                    -- in-app route to navigate on click
  is_read          boolean NOT NULL DEFAULT false,
  read_at          timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_recipient_unread_idx
  ON notifications(organization_id, recipient_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_recipient_idx
  ON notifications(organization_id, recipient_id, created_at DESC);

-- RLS: users can read/update their own rows
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_own ON notifications;
CREATE POLICY notifications_own ON notifications
  FOR ALL USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

DROP POLICY IF EXISTS notifications_platform_admin ON notifications;
CREATE POLICY notifications_platform_admin ON notifications
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

-- ── Per-user preferences (overrides org defaults) ──────────────────────────
-- Missing row = use org default → catalog default. Only rows where the user
-- has explicitly changed the setting are stored here.
CREATE TABLE IF NOT EXISTS notification_preferences (
  organization_id  uuid NOT NULL,
  user_id          uuid NOT NULL,
  event_type       text NOT NULL,
  in_app           boolean NOT NULL DEFAULT true,
  email            boolean NOT NULL DEFAULT false,
  CONSTRAINT notification_preferences_pk PRIMARY KEY (organization_id, user_id, event_type)
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notif_prefs_own ON notification_preferences;
CREATE POLICY notif_prefs_own ON notification_preferences
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS notif_prefs_mgr ON notification_preferences;
CREATE POLICY notif_prefs_mgr ON notification_preferences
  FOR ALL USING (public.is_org_manager(organization_id))
  WITH CHECK (public.is_org_manager(organization_id));

-- ── Org-wide defaults ─────────────────────────────────────────────────────
-- Admin-controlled: which event types fire, via which channels, to which roles.
-- Missing row = use catalog defaults.
CREATE TABLE IF NOT EXISTS notification_org_defaults (
  organization_id  uuid NOT NULL,
  event_type       text NOT NULL,
  in_app_enabled   boolean NOT NULL DEFAULT true,
  email_enabled    boolean NOT NULL DEFAULT false,
  notify_roles     text[] NOT NULL DEFAULT '{admin}',
  CONSTRAINT notification_org_defaults_pk PRIMARY KEY (organization_id, event_type)
);

ALTER TABLE notification_org_defaults ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notif_org_defaults_mgr ON notification_org_defaults;
CREATE POLICY notif_org_defaults_mgr ON notification_org_defaults
  FOR ALL USING (public.is_org_manager(organization_id))
  WITH CHECK (public.is_org_manager(organization_id));

DROP POLICY IF EXISTS notif_org_defaults_staff_read ON notification_org_defaults;
CREATE POLICY notif_org_defaults_staff_read ON notification_org_defaults
  FOR SELECT USING (public.belongs_to_org(organization_id));

-- ═══════════════════ 0026_banna_custom_fields.sql ═══════════════════
-- ════════════════════════════════════════════════════════════════════════
-- 0026_banna_custom_fields.sql
-- Banna (بنّا) module: workspace custom field definitions.
-- Each row defines an extra field for assets, inventory, or requests.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists custom_fields (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  space_id        text,
  module          text not null check (module in ('assets', 'inventory', 'requests')),
  field_key       text not null,
  type            text not null check (type in ('text', 'number', 'select', 'multi_select', 'date', 'boolean', 'user')),
  label           text not null,
  label_ar        text,
  required        boolean not null default false,
  options         jsonb default '[]'::jsonb,
  placeholder     text,
  placeholder_ar  text,
  sort_order      integer not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index if not exists custom_fields_org_module_key_idx
  on custom_fields(organization_id, module, field_key);

create index if not exists custom_fields_org_module_idx
  on custom_fields(organization_id, module, sort_order);

alter table custom_fields enable row level security;

-- Org members can read custom fields for their org
drop policy if exists custom_fields_select on custom_fields;
create policy custom_fields_select on custom_fields
  for select using (public.belongs_to_org(organization_id));

-- Org admins can manage (insert/update/delete) custom fields
drop policy if exists custom_fields_manage on custom_fields;
create policy custom_fields_manage on custom_fields
  for all using (public.is_org_manager(organization_id))
  with check (public.is_org_manager(organization_id));

-- Platform admins can do everything
drop policy if exists custom_fields_platform_admin on custom_fields;
create policy custom_fields_platform_admin on custom_fields
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());

-- ═══════════════════ 0027_haraka_rls_and_pin_hash.sql ═══════════════════
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

-- ═══════════════════ 0028_performance_indexes.sql ═══════════════════
-- ════════════════════════════════════════════════════════════════════════
-- 0028_performance_indexes.sql
-- Performance audit: adds missing database indexes identified by query
-- analysis. Two categories:
--   1. organization_id indexes on tables queried by org but missing the index
--   2. Foreign key indexes on columns referencing other tables
--
-- Convention: idx_{table}_{column}
-- All statements use CREATE INDEX IF NOT EXISTS for safe re-runs.
-- ════════════════════════════════════════════════════════════════════════

-- ── 1. organization_id indexes ─────────────────────────────────────────────
-- These tables are frequently filtered by organization_id for multi-tenant
-- queries but lacked a dedicated index on the column.

CREATE INDEX IF NOT EXISTS idx_organization_configs_organization_id
  ON organization_configs(organization_id);

CREATE INDEX IF NOT EXISTS idx_organizations_private_organization_id
  ON organizations_private(organization_id);

CREATE INDEX IF NOT EXISTS idx_pos_receipt_counters_organization_id
  ON pos_receipt_counters(organization_id);

CREATE INDEX IF NOT EXISTS idx_fawtara_counters_organization_id
  ON fawtara_counters(organization_id);

CREATE INDEX IF NOT EXISTS idx_haraka_delivery_agents_organization_id
  ON haraka_delivery_agents(organization_id);

CREATE INDEX IF NOT EXISTS idx_haraka_order_counters_organization_id
  ON haraka_order_counters(organization_id);

CREATE INDEX IF NOT EXISTS idx_haraka_orders_organization_id
  ON haraka_orders(organization_id);

CREATE INDEX IF NOT EXISTS idx_haraka_invoice_counters_organization_id
  ON haraka_invoice_counters(organization_id);

CREATE INDEX IF NOT EXISTS idx_haraka_order_payments_organization_id
  ON haraka_order_payments(organization_id);

CREATE INDEX IF NOT EXISTS idx_haraka_cash_drawer_config_organization_id
  ON haraka_cash_drawer_config(organization_id);

CREATE INDEX IF NOT EXISTS idx_haraka_warranty_counters_organization_id
  ON haraka_warranty_counters(organization_id);

CREATE INDEX IF NOT EXISTS idx_haraka_warranty_configs_organization_id
  ON haraka_warranty_configs(organization_id);

CREATE INDEX IF NOT EXISTS idx_haraka_warranty_certs_organization_id
  ON haraka_warranty_certs(organization_id);

CREATE INDEX IF NOT EXISTS idx_haraka_card_terminal_config_organization_id
  ON haraka_card_terminal_config(organization_id);

CREATE INDEX IF NOT EXISTS idx_haraka_card_charges_organization_id
  ON haraka_card_charges(organization_id);

CREATE INDEX IF NOT EXISTS idx_notifications_organization_id
  ON notifications(organization_id);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_organization_id
  ON notification_preferences(organization_id);

CREATE INDEX IF NOT EXISTS idx_notification_org_defaults_organization_id
  ON notification_org_defaults(organization_id);

-- ── 2. Foreign key indexes ─────────────────────────────────────────────────
-- Columns that reference other tables but had no index, causing nested-loop
-- scans on JOINs and slow cascading lookups.

-- subscriptions.package_id → packages.id
CREATE INDEX IF NOT EXISTS idx_subscriptions_package_id
  ON subscriptions(package_id);

-- haraka_orders.customer_id → pos_customers.id
CREATE INDEX IF NOT EXISTS idx_haraka_orders_customer_id
  ON haraka_orders(customer_id);

-- haraka_orders.delivery_agent_id → haraka_delivery_agents.id
CREATE INDEX IF NOT EXISTS idx_haraka_orders_delivery_agent_id
  ON haraka_orders(delivery_agent_id);

-- ════════════════════════════════════════════════════════════════════════
-- DOWN: Reverse the migration by dropping the created indexes.
-- ════════════════════════════════════════════════════════════════════════
/*
DROP INDEX IF EXISTS idx_organization_configs_organization_id;
DROP INDEX IF EXISTS idx_organizations_private_organization_id;
DROP INDEX IF EXISTS idx_pos_receipt_counters_organization_id;
DROP INDEX IF EXISTS idx_fawtara_counters_organization_id;
DROP INDEX IF EXISTS idx_haraka_delivery_agents_organization_id;
DROP INDEX IF EXISTS idx_haraka_order_counters_organization_id;
DROP INDEX IF EXISTS idx_haraka_orders_organization_id;
DROP INDEX IF EXISTS idx_haraka_invoice_counters_organization_id;
DROP INDEX IF EXISTS idx_haraka_order_payments_organization_id;
DROP INDEX IF EXISTS idx_haraka_cash_drawer_config_organization_id;
DROP INDEX IF EXISTS idx_haraka_warranty_counters_organization_id;
DROP INDEX IF EXISTS idx_haraka_warranty_configs_organization_id;
DROP INDEX IF EXISTS idx_haraka_warranty_certs_organization_id;
DROP INDEX IF EXISTS idx_haraka_card_terminal_config_organization_id;
DROP INDEX IF EXISTS idx_haraka_card_charges_organization_id;
DROP INDEX IF EXISTS idx_notifications_organization_id;
DROP INDEX IF EXISTS idx_notification_preferences_organization_id;
DROP INDEX IF EXISTS idx_notification_org_defaults_organization_id;
DROP INDEX IF EXISTS idx_subscriptions_package_id;
DROP INDEX IF EXISTS idx_haraka_orders_customer_id;
DROP INDEX IF EXISTS idx_haraka_orders_delivery_agent_id;
*/

-- ═══════════════════ 0029_banna_field_values.sql ═══════════════════
-- ════════════════════════════════════════════════════════════════════════
-- 0029_banna_field_values.sql
-- Banna (بنّا) module: stores the actual values for custom fields on records.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists custom_field_values (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  space_id        text,
  record_type     text not null check (record_type in ('assets', 'inventory', 'requests')),
  record_id       uuid not null,
  field_id        uuid not null references custom_fields(id) on delete cascade,
  value           jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- One value per record+field combination
create unique index if not exists custom_field_values_record_field_idx
  on custom_field_values(organization_id, record_type, record_id, field_id);

-- Fast lookup of all field values for a given record
create index if not exists custom_field_values_record_idx
  on custom_field_values(organization_id, record_type, record_id);

alter table custom_field_values enable row level security;

drop policy if exists custom_field_values_select on custom_field_values;
create policy custom_field_values_select on custom_field_values
  for select using (public.belongs_to_org(organization_id));

drop policy if exists custom_field_values_manage on custom_field_values;
create policy custom_field_values_manage on custom_field_values
  for all using (public.is_org_manager(organization_id))
  with check (public.is_org_manager(organization_id));

drop policy if exists custom_field_values_staff_upsert on custom_field_values;
create policy custom_field_values_staff_upsert on custom_field_values
  for insert with check (public.belongs_to_org(organization_id));

drop policy if exists custom_field_values_platform_admin on custom_field_values;
create policy custom_field_values_platform_admin on custom_field_values
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());

-- ═══════════════════ 0030_banna_feature_flag.sql ═══════════════════
-- ── 0030: add banna feature flag to all packages ─────────────────────────────
-- Migration 0010 seeded packages without the 'banna' key in features because
-- the banna module was added later (migration 0026). This migration backfills
-- banna: true into every existing package's features JSONB so the nav item
-- appears without a superadmin needing to manually toggle it per org.

update public.packages
set features = features || '{"banna": true}'::jsonb
where (features ->> 'banna') is null;

-- ═══════════════════ 0031_web_push_subscriptions.sql ═══════════════════
-- ── 0031: web push subscriptions ──────────────────────────────────────────────
-- Stores browser push subscription objects per user so the server can send
-- web push notifications via the VAPID protocol.
-- Each row corresponds to one browser/device the user has granted permission on.

create table if not exists public.web_push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  endpoint      text not null,
  p256dh        text not null,
  auth          text not null,
  user_agent    text,
  created_at    timestamptz not null default now(),
  -- one subscription record per endpoint (a user can have multiple devices)
  unique (user_id, endpoint)
);

create index if not exists web_push_subscriptions_user_id_idx
  on public.web_push_subscriptions (user_id);

-- RLS: users can only manage their own subscriptions
alter table public.web_push_subscriptions enable row level security;

create policy "user own subscriptions" on public.web_push_subscriptions
  for all using (user_id = auth.uid());

-- ═══════════════════ 0032_early_access_unique_email.sql ═══════════════════
-- Remove duplicate early_access rows, keeping the earliest per email,
-- then add a unique constraint so the DB enforces it going forward.

delete from public.early_access
where id not in (
  select distinct on (email) id
  from public.early_access
  order by email, created_at asc
);

do $guard$ begin
  if not exists (select 1 from pg_constraint where conname = 'early_access_email_unique') then
    alter table public.early_access add constraint early_access_email_unique unique (email);
  end if;
end $guard$;

-- ═══════════════════ 0033_contact_sales_asset_count.sql ═══════════════════
alter table public.contact_sales
  add column if not exists asset_count text;

-- ═══════════════════ 0034_haraka_service_jobs.sql ═══════════════════
-- ════════════════════════════════════════════════════════════════════════
-- 0034_haraka_service_jobs.sql
-- Haraka Service Jobs — for businesses that sell services rather than
-- physical goods. Covers repair shops, consultants, salons, field-service
-- companies, marketing agencies, and similar single-engagement services.
-- Includes invoice generation and split payment tracking.
-- ════════════════════════════════════════════════════════════════════════

-- ── Job number sequence ───────────────────────────────────────────────────
-- One row per (org, space). Atomically incremented on each new job.
CREATE TABLE IF NOT EXISTS haraka_service_job_counters (
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  space_id          text NOT NULL DEFAULT '',
  last_job_number   integer NOT NULL DEFAULT 0,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT haraka_service_job_counters_pk PRIMARY KEY (organization_id, space_id)
);

-- ── Service invoice number sequence ──────────────────────────────────────
-- Keyed by org + year so invoice numbers restart each year (SVI-2026-000001).
CREATE TABLE IF NOT EXISTS haraka_service_invoice_counters (
  organization_id uuid    NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  year            integer NOT NULL,
  last_sequence   bigint  NOT NULL DEFAULT 0,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT haraka_service_invoice_counters_pk PRIMARY KEY (organization_id, year)
);

-- ── Service jobs ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS haraka_service_jobs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  space_id          text,

  -- Reference number allocated from haraka_service_job_counters (e.g. SVC-000042)
  job_number        text NOT NULL,

  -- Invoice number allocated on demand once job is done (e.g. SVI-2026-000001)
  invoice_number    text,

  -- Free tag from service_job_type list (repair / appointment / professional /
  -- field / campaign / other). Org can add custom values.
  service_type      text,

  -- Lifecycle: new → confirmed → in_progress → done | cancelled
  status            text NOT NULL DEFAULT 'new',

  -- Customer — can link pos_customers or be ad-hoc name + phone
  customer_id       uuid REFERENCES pos_customers(id) ON DELETE SET NULL,
  customer_name     text NOT NULL,
  customer_phone    text,

  -- Org member assigned to deliver the service
  staff_member_id   uuid,
  staff_member_name text,

  -- Service line items — free-text, NOT linked to inventory items.
  -- Shape per element:
  --   { name, description, quantity, unitPrice, taxRate,
  --     taxAmount, discountAmount, lineTotal }
  items             jsonb NOT NULL DEFAULT '[]',

  -- Totals
  subtotal          numeric(14,4) NOT NULL DEFAULT 0,
  discount_amount   numeric(14,4) NOT NULL DEFAULT 0,
  tax_amount        numeric(14,4) NOT NULL DEFAULT 0,
  total             numeric(14,4) NOT NULL DEFAULT 0,

  -- Payment tracking
  payment_status    text NOT NULL DEFAULT 'unpaid'
                      CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  amount_paid       numeric(14,4) NOT NULL DEFAULT 0,
  payment_method    text,

  -- Optional scheduling (salons, field service visits, etc.)
  scheduled_at      timestamptz,

  -- Optional on-site address for field-service jobs.
  -- Shape: { street, area, city, notes }
  service_address   jsonb,

  notes             text,

  created_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  updated_by        uuid
);

CREATE INDEX IF NOT EXISTS haraka_service_jobs_org_idx
  ON haraka_service_jobs(organization_id);
CREATE INDEX IF NOT EXISTS haraka_service_jobs_org_status_idx
  ON haraka_service_jobs(organization_id, status);
CREATE INDEX IF NOT EXISTS haraka_service_jobs_org_created_idx
  ON haraka_service_jobs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS haraka_service_jobs_org_type_idx
  ON haraka_service_jobs(organization_id, service_type);
CREATE INDEX IF NOT EXISTS haraka_service_jobs_scheduled_idx
  ON haraka_service_jobs(organization_id, scheduled_at)
  WHERE scheduled_at IS NOT NULL;

CREATE OR REPLACE TRIGGER haraka_service_jobs_set_updated_at
  BEFORE UPDATE ON haraka_service_jobs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Split payment entries ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS haraka_service_job_payments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          uuid NOT NULL REFERENCES haraka_service_jobs(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  amount          numeric(14,4) NOT NULL,
  payment_method  text,
  note            text,
  paid_at         timestamptz NOT NULL DEFAULT now(),
  created_by      uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS haraka_service_job_payments_job_idx
  ON haraka_service_job_payments(job_id);

-- ── Service job document config in org settings ───────────────────────────
ALTER TABLE organization_configs
  ADD COLUMN IF NOT EXISTS service_job_document_config jsonb;

-- ── RLS ───────────────────────────────────────────────────────────────────

-- haraka_service_job_counters — service-role only (no public policies)
ALTER TABLE haraka_service_job_counters ENABLE ROW LEVEL SECURITY;

-- haraka_service_invoice_counters — service-role only
ALTER TABLE haraka_service_invoice_counters ENABLE ROW LEVEL SECURITY;

-- haraka_service_jobs
ALTER TABLE haraka_service_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS haraka_service_jobs_platform_all ON haraka_service_jobs;
CREATE POLICY haraka_service_jobs_platform_all ON haraka_service_jobs
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS haraka_service_jobs_mgr_all ON haraka_service_jobs;
CREATE POLICY haraka_service_jobs_mgr_all ON haraka_service_jobs
  FOR ALL USING (public.is_org_manager(organization_id))
  WITH CHECK (public.is_org_manager(organization_id));

DROP POLICY IF EXISTS haraka_service_jobs_staff_read ON haraka_service_jobs;
CREATE POLICY haraka_service_jobs_staff_read ON haraka_service_jobs
  FOR SELECT USING (public.belongs_to_org(organization_id));

-- haraka_service_job_payments
ALTER TABLE haraka_service_job_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS haraka_service_job_payments_platform_all ON haraka_service_job_payments;
CREATE POLICY haraka_service_job_payments_platform_all ON haraka_service_job_payments
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS haraka_service_job_payments_mgr_all ON haraka_service_job_payments;
CREATE POLICY haraka_service_job_payments_mgr_all ON haraka_service_job_payments
  FOR ALL USING (public.is_org_manager(organization_id))
  WITH CHECK (public.is_org_manager(organization_id));

DROP POLICY IF EXISTS haraka_service_job_payments_staff_read ON haraka_service_job_payments;
CREATE POLICY haraka_service_job_payments_staff_read ON haraka_service_job_payments
  FOR SELECT USING (public.belongs_to_org(organization_id));

-- ── Managed list seeds ────────────────────────────────────────────────────

-- service_job_status: SYSTEM list — values drive status machine
INSERT INTO platform_list_items (list_key, value, label, label_ar, color, sort_order, is_system) VALUES
  ('service_job_status', 'new',         'New',         'جديد',        '#3b82f6', 1, true),
  ('service_job_status', 'confirmed',   'Confirmed',   'مؤكد',        '#6366f1', 2, true),
  ('service_job_status', 'in_progress', 'In Progress', 'قيد التنفيذ', '#f97316', 3, true),
  ('service_job_status', 'done',        'Done',        'منجز',        '#22c55e', 4, true),
  ('service_job_status', 'cancelled',   'Cancelled',   'ملغي',        '#ef4444', 5, true)
ON CONFLICT (list_key, value) DO NOTHING;

-- service_job_type: FREE list — org can add custom types
INSERT INTO platform_list_items (list_key, value, label, label_ar, color, sort_order, is_system) VALUES
  ('service_job_type', 'repair',       'Repair',           'إصلاح',       null, 1, false),
  ('service_job_type', 'appointment',  'Appointment',      'موعد',        null, 2, false),
  ('service_job_type', 'professional', 'Professional',     'خدمة مهنية',  null, 3, false),
  ('service_job_type', 'field',        'Field Service',    'خدمة ميدانية',null, 4, false),
  ('service_job_type', 'campaign',     'Campaign',         'حملة',        null, 5, false),
  ('service_job_type', 'other',        'Other',            'أخرى',        null, 6, false)
ON CONFLICT (list_key, value) DO NOTHING;

-- service_job_payment_method: SYSTEM list (same values as orders for consistency)
INSERT INTO platform_list_items (list_key, value, label, label_ar, color, sort_order, is_system) VALUES
  ('service_job_payment_method', 'cash',          'Cash',          'نقدي',         null, 1, true),
  ('service_job_payment_method', 'bank_transfer', 'Bank Transfer', 'تحويل بنكي',   null, 2, true),
  ('service_job_payment_method', 'card',          'Card',          'بطاقة',        null, 3, true),
  ('service_job_payment_method', 'other',         'Other',         'أخرى',         null, 4, true)
ON CONFLICT (list_key, value) DO NOTHING;

-- ═══════════════════ 0035_haraka_retainers.sql ═══════════════════
-- ════════════════════════════════════════════════════════════════════════
-- 0035_haraka_retainers.sql
-- Haraka Retainers — recurring billing contracts for businesses that
-- charge clients on a monthly, quarterly, or annual cycle.
-- Each retainer generates per-cycle invoice records for payment tracking.
-- ════════════════════════════════════════════════════════════════════════

-- ── Retainer number sequence ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS haraka_retainer_counters (
  organization_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  space_id              text NOT NULL DEFAULT '',
  last_retainer_number  integer NOT NULL DEFAULT 0,
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT haraka_retainer_counters_pk PRIMARY KEY (organization_id, space_id)
);

-- ── Retainer invoice number sequence ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS haraka_retainer_invoice_counters (
  organization_id uuid    NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  year            integer NOT NULL,
  last_sequence   bigint  NOT NULL DEFAULT 0,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT haraka_retainer_invoice_counters_pk PRIMARY KEY (organization_id, year)
);

-- ── Retainers ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS haraka_retainers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  space_id          text,

  -- Reference number (e.g. RET-000001)
  retainer_number   text NOT NULL,

  -- Human-readable contract/service name (e.g. "Social Media Management")
  name              text NOT NULL,

  -- Client
  customer_id       uuid REFERENCES pos_customers(id) ON DELETE SET NULL,
  customer_name     text NOT NULL,
  customer_phone    text,

  -- Assigned org member
  staff_member_id   uuid,
  staff_member_name text,

  -- Billing settings
  billing_cycle     text NOT NULL DEFAULT 'monthly'
                      CHECK (billing_cycle IN ('monthly', 'quarterly', 'annual')),
  amount_per_cycle  numeric(14,4) NOT NULL,
  -- Tax rate as decimal fraction (0.16 = 16%)
  tax_rate          numeric(5,4) NOT NULL DEFAULT 0,

  -- Contract dates
  start_date        date NOT NULL,
  end_date          date,   -- null = open-ended

  -- Lifecycle: active | paused | cancelled | expired
  status            text NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'paused', 'cancelled', 'expired')),

  -- Computed date of the next expected invoice; updated after each invoice created
  next_billing_date date,

  notes             text,

  created_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  updated_by        uuid
);

CREATE INDEX IF NOT EXISTS haraka_retainers_org_idx
  ON haraka_retainers(organization_id);
CREATE INDEX IF NOT EXISTS haraka_retainers_org_status_idx
  ON haraka_retainers(organization_id, status);
CREATE INDEX IF NOT EXISTS haraka_retainers_org_customer_idx
  ON haraka_retainers(organization_id, customer_id)
  WHERE customer_id IS NOT NULL;

CREATE OR REPLACE TRIGGER haraka_retainers_set_updated_at
  BEFORE UPDATE ON haraka_retainers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Retainer invoices ─────────────────────────────────────────────────────
-- One row per billing cycle. Created manually or on a schedule.
CREATE TABLE IF NOT EXISTS haraka_retainer_invoices (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  retainer_id           uuid NOT NULL REFERENCES haraka_retainers(id) ON DELETE CASCADE,
  organization_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Reference number (e.g. RINV-2026-000001)
  invoice_number        text NOT NULL,

  billing_period_start  date NOT NULL,
  billing_period_end    date NOT NULL,
  due_date              date,

  -- Snapshot of financials at invoice time
  amount                numeric(14,4) NOT NULL,
  tax_amount            numeric(14,4) NOT NULL DEFAULT 0,
  total                 numeric(14,4) NOT NULL,

  -- Payment tracking
  payment_status        text NOT NULL DEFAULT 'unpaid'
                          CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  amount_paid           numeric(14,4) NOT NULL DEFAULT 0,
  payment_method        text,
  paid_at               timestamptz,

  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid
);

CREATE INDEX IF NOT EXISTS haraka_retainer_invoices_retainer_idx
  ON haraka_retainer_invoices(retainer_id);
CREATE INDEX IF NOT EXISTS haraka_retainer_invoices_org_idx
  ON haraka_retainer_invoices(organization_id);
CREATE INDEX IF NOT EXISTS haraka_retainer_invoices_org_created_idx
  ON haraka_retainer_invoices(organization_id, created_at DESC);

-- ── RLS ───────────────────────────────────────────────────────────────────

-- Counters — service-role only
ALTER TABLE haraka_retainer_counters         ENABLE ROW LEVEL SECURITY;
ALTER TABLE haraka_retainer_invoice_counters ENABLE ROW LEVEL SECURITY;

-- haraka_retainers
ALTER TABLE haraka_retainers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS haraka_retainers_platform_all ON haraka_retainers;
CREATE POLICY haraka_retainers_platform_all ON haraka_retainers
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS haraka_retainers_mgr_all ON haraka_retainers;
CREATE POLICY haraka_retainers_mgr_all ON haraka_retainers
  FOR ALL USING (public.is_org_manager(organization_id))
  WITH CHECK (public.is_org_manager(organization_id));

DROP POLICY IF EXISTS haraka_retainers_staff_read ON haraka_retainers;
CREATE POLICY haraka_retainers_staff_read ON haraka_retainers
  FOR SELECT USING (public.belongs_to_org(organization_id));

-- haraka_retainer_invoices
ALTER TABLE haraka_retainer_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS haraka_retainer_invoices_platform_all ON haraka_retainer_invoices;
CREATE POLICY haraka_retainer_invoices_platform_all ON haraka_retainer_invoices
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS haraka_retainer_invoices_mgr_all ON haraka_retainer_invoices;
CREATE POLICY haraka_retainer_invoices_mgr_all ON haraka_retainer_invoices
  FOR ALL USING (public.is_org_manager(organization_id))
  WITH CHECK (public.is_org_manager(organization_id));

DROP POLICY IF EXISTS haraka_retainer_invoices_staff_read ON haraka_retainer_invoices;
CREATE POLICY haraka_retainer_invoices_staff_read ON haraka_retainer_invoices
  FOR SELECT USING (public.belongs_to_org(organization_id));

-- ── Managed list seeds ────────────────────────────────────────────────────

-- retainer_status: SYSTEM list
INSERT INTO platform_list_items (list_key, value, label, label_ar, color, sort_order, is_system) VALUES
  ('retainer_status', 'active',    'Active',    'نشط',     '#22c55e', 1, true),
  ('retainer_status', 'paused',    'Paused',    'متوقف',   '#eab308', 2, true),
  ('retainer_status', 'cancelled', 'Cancelled', 'ملغي',    '#ef4444', 3, true),
  ('retainer_status', 'expired',   'Expired',   'منتهي',   '#6b7280', 4, true)
ON CONFLICT (list_key, value) DO NOTHING;

-- retainer_billing_cycle: SYSTEM list
INSERT INTO platform_list_items (list_key, value, label, label_ar, color, sort_order, is_system) VALUES
  ('retainer_billing_cycle', 'monthly',   'Monthly',   'شهري',   null, 1, true),
  ('retainer_billing_cycle', 'quarterly', 'Quarterly', 'ربع سنوي', null, 2, true),
  ('retainer_billing_cycle', 'annual',    'Annual',    'سنوي',   null, 3, true)
ON CONFLICT (list_key, value) DO NOTHING;


COMMIT;

-- ── Verification: every count should be 1 (all 20 tables present) ────────
select
  (select count(*) from information_schema.tables where table_schema='public' and table_name='notifications')                = 1 as notifications,
  (select count(*) from information_schema.tables where table_schema='public' and table_name='haraka_cash_drawer_config')     = 1 as cash_drawer,
  (select count(*) from information_schema.tables where table_schema='public' and table_name='haraka_warranty_certs')         = 1 as warranty_certs,
  (select count(*) from information_schema.tables where table_schema='public' and table_name='haraka_card_terminal_config')   = 1 as card_terminal,
  (select count(*) from information_schema.tables where table_schema='public' and table_name='custom_field_values')           = 1 as banna,
  (select count(*) from information_schema.tables where table_schema='public' and table_name='haraka_service_jobs')           = 1 as service_jobs,
  (select count(*) from information_schema.tables where table_schema='public' and table_name='haraka_retainers')              = 1 as retainers;
