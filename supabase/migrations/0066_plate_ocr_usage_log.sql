-- ════════════════════════════════════════════════════════════════════════
-- 0066_plate_ocr_usage_log.sql
-- Plate Recognizer's account is one shared credential across every org, so
-- its own usage stats are account-wide only — no per-org breakdown. This
-- table records one row per OCR call, tagged with the calling org, so
-- Superadmin can see usage per organization per month, not just the total.
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS haraka_plate_ocr_usage_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plate_found     boolean NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plate_ocr_usage_log_org_created
  ON haraka_plate_ocr_usage_log (organization_id, created_at);

-- Internal usage/billing data — service-role only, no org-facing policies.
ALTER TABLE haraka_plate_ocr_usage_log ENABLE ROW LEVEL SECURITY;
