-- ════════════════════════════════════════════════════════════════════════
-- 0067_infobip_whatsapp_config.sql
-- Replaces the direct Meta WhatsApp Cloud API integration with Infobip (a
-- WhatsApp Business Solution Provider). Same global superadmin-owned
-- credential pattern (platform_notification_config) as before — still one
-- shared WhatsApp sender across every organization.
--
-- infobip_webhook_secret is a Makhzoon-generated shared secret appended as
-- a query param on the webhook URL registered in Infobip's dashboard
-- (Infobip does not HMAC-sign inbound webhook payloads the way Meta did).
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE platform_notification_config
  DROP COLUMN IF EXISTS whatsapp_phone_number_id,
  DROP COLUMN IF EXISTS whatsapp_token_enc,
  DROP COLUMN IF EXISTS whatsapp_webhook_secret;

ALTER TABLE platform_notification_config
  ADD COLUMN IF NOT EXISTS infobip_base_url      text,           -- e.g. k95dkx.api.infobip.com
  ADD COLUMN IF NOT EXISTS infobip_sender         text,           -- registered WhatsApp sender number
  ADD COLUMN IF NOT EXISTS infobip_api_key_enc    text,           -- server-side encrypted
  ADD COLUMN IF NOT EXISTS infobip_webhook_secret text;           -- query-param secret for inbound webhook auth
