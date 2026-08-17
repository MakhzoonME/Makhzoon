-- ════════════════════════════════════════════════════════════════════════
-- 0063_global_notification_config.sql
-- WhatsApp/OCR credentials are Makhzoon's own accounts, shared across every
-- organization — not something each org configures. Replaces the per-org
-- haraka_service_notification_config (0059) with a single global config row,
-- editable only by superadmins.
--
-- haraka_service_notification_config was added this same dev cycle and never
-- used by a real org, so dropping it outright (rather than leaving dead
-- rows around) is safe here.
-- ════════════════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS haraka_service_notification_config;

-- Singleton pattern: id is a boolean PK that must be `true`, so Postgres's
-- uniqueness constraint physically prevents a second row from ever existing.
CREATE TABLE IF NOT EXISTS platform_notification_config (
  id                       boolean PRIMARY KEY DEFAULT true,
  CONSTRAINT platform_notification_config_singleton CHECK (id),
  whatsapp_enabled         boolean NOT NULL DEFAULT false,
  whatsapp_phone_number_id text,           -- Meta Cloud API phone number ID
  whatsapp_token_enc       text,           -- server-side encrypted permanent access token
  whatsapp_webhook_secret  text,           -- verifies inbound Meta delivery-status webhooks
  ocr_provider             text NOT NULL DEFAULT 'fastplateocr',
  ocr_api_key_enc          text,           -- server-side encrypted
  updated_at               timestamptz NOT NULL DEFAULT now(),
  updated_by               uuid
);

CREATE OR REPLACE TRIGGER platform_notification_config_set_updated_at
  BEFORE UPDATE ON platform_notification_config
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Holds encrypted secrets; service-role only, no public policies (same as
-- the table it replaces).
ALTER TABLE platform_notification_config ENABLE ROW LEVEL SECURITY;
