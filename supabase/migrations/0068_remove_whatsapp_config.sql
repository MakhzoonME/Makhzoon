-- ════════════════════════════════════════════════════════════════════════
-- 0068_remove_whatsapp_config.sql
-- WhatsApp customer messaging removed for now (was Meta Cloud API, briefly
-- Infobip via 0067) — see git history if it needs to come back. Drops the
-- columns 0067 added rather than leaving dead ones around, same reasoning
-- 0063 used when it replaced the per-org table outright.
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE platform_notification_config
  DROP COLUMN IF EXISTS whatsapp_enabled,
  DROP COLUMN IF EXISTS infobip_base_url,
  DROP COLUMN IF EXISTS infobip_sender,
  DROP COLUMN IF EXISTS infobip_api_key_enc,
  DROP COLUMN IF EXISTS infobip_webhook_secret;
