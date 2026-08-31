-- ════════════════════════════════════════════════════════════════════════
-- 0088_qr_target_file_bucket.sql
-- Storage bucket for the new DocumentQrConfig.qrUploadedFileUrl option — an
-- org can point a receipt/invoice QR at a file they upload (a menu PDF, a
-- promo flyer) instead of the document's own link. Public: the QR is scanned
-- with no session to sign a URL with, same reasoning as receipt-logos.
-- Idempotent — safe to replay. See 0014_storage_buckets.sql for the pattern.
-- ════════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('qr-target-files', 'qr-target-files', true, 10485760, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
