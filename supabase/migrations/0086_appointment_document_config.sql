-- ════════════════════════════════════════════════════════════════════════
-- 0086_appointment_document_config.sql
-- Per-org settings for the appointment invoice document, alongside the
-- existing receipt_config / order_document_config / service_job_document_config
-- blobs. Anticipated by docs/plans/2026-08-22-haraka-appointments-services-design.md.
--
-- Holds the document QR settings (qrSource / qrCaption): each document type
-- chooses independently whether its QR encodes the public document link or an
-- e-invoicing payload. Null/absent means "no QR", so existing orgs are
-- unaffected. Idempotent — safe to replay.
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE public.organization_configs
  ADD COLUMN IF NOT EXISTS appointment_document_config jsonb;

COMMENT ON COLUMN public.organization_configs.appointment_document_config IS
  'AppointmentDocumentConfig — appointment invoice settings (QR source/caption).';
