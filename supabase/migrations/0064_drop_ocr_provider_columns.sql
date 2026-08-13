-- ════════════════════════════════════════════════════════════════════════
-- 0064_drop_ocr_provider_columns.sql
-- Plate OCR moved to a fully client-side engine (Tesseract.js, in-browser)
-- after FastPlateOCR stopped working — no provider account/API key to store
-- anymore.
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE platform_notification_config
  DROP COLUMN IF EXISTS ocr_provider,
  DROP COLUMN IF EXISTS ocr_api_key_enc;
