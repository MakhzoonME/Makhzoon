-- ════════════════════════════════════════════════════════════════════════
-- 0065_plate_recognizer_config.sql
-- Client-side Tesseract.js OCR proved unreliable in production testing
-- (misreads, hallucinated text on noisy images). Switching to Plate
-- Recognizer (platerecognizer.com) — a purpose-built plate-recognition API,
-- same global superadmin-owned credential pattern as WhatsApp.
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE platform_notification_config
  ADD COLUMN IF NOT EXISTS ocr_provider    text NOT NULL DEFAULT 'platerecognizer',
  ADD COLUMN IF NOT EXISTS ocr_api_key_enc text;
