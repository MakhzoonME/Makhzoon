-- ════════════════════════════════════════════════════════════════════════
-- 0092_report_document_config.sql
-- Per-org appearance settings for generated reports (the public
-- /r/:org/reports/:token page), alongside the existing receipt_config /
-- order_document_config / service_job_document_config /
-- appointment_document_config blobs. Same shape (DocumentQrConfig +
-- showLogo) — see 0086_appointment_document_config.sql for the pattern.
-- Null/absent means "no QR, logo shown" (today's behavior), so existing
-- orgs are unaffected. Idempotent — safe to replay.
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE public.organization_configs
  ADD COLUMN IF NOT EXISTS report_document_config jsonb;

COMMENT ON COLUMN public.organization_configs.report_document_config IS
  'ReportDocumentConfig — generated-report QR/logo appearance settings.';
