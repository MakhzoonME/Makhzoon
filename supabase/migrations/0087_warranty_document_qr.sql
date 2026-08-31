-- ════════════════════════════════════════════════════════════════════════
-- 0087_warranty_document_qr.sql
-- Unifies haraka_warranty_configs' QR handling with the DocumentQrConfig
-- system receipts/invoices/reports already use (lib/qr.ts): qr_source
-- replaces the old show_qr boolean, plus qr_caption/qr_position_a4/
-- qr_position_thermal so the QR can carry a caption and be positioned like
-- every other document type. qr_target is NOT stored — a warranty cert has
-- no "custom link"/"uploaded file" concept, so it's always 'self' in code.
--
-- show_qr is left in place (unused by new code) rather than dropped —
-- nothing reads it after this ships, but dropping a column is harder to
-- undo than leaving a harmless legacy one. Idempotent — safe to replay.
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE public.haraka_warranty_configs
  ADD COLUMN IF NOT EXISTS qr_source text,
  ADD COLUMN IF NOT EXISTS qr_caption text,
  ADD COLUMN IF NOT EXISTS qr_position_a4 text,
  ADD COLUMN IF NOT EXISTS qr_position_thermal text;

-- Backfill from the boolean it replaces, so existing orgs keep printing
-- exactly what they print today.
UPDATE public.haraka_warranty_configs
  SET qr_source = CASE WHEN show_qr THEN 'link' ELSE 'none' END
  WHERE qr_source IS NULL;

COMMENT ON COLUMN public.haraka_warranty_configs.qr_source IS
  'DocumentQrSource (none|link) — supersedes show_qr, unified with the DocumentQrConfig system. Always resolves to the cert''s own public link (qrTarget is not stored here — always self).';
COMMENT ON COLUMN public.haraka_warranty_configs.qr_position_a4 IS
  'QrPositionA4 — corner the QR prints at on a4-modern/a4-certificate templates. Defaults to bottom-right.';
COMMENT ON COLUMN public.haraka_warranty_configs.qr_position_thermal IS
  'QrPositionThermal (top|bottom) — where the QR prints on thermal-58/80 templates. Defaults to bottom.';
