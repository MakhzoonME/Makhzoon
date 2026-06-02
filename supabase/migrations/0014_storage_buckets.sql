-- Dedicated Supabase Storage buckets, one per content type. Idempotent — safe
-- to run on dev, staging, and production. Replaces the Google Drive flow, which
-- failed because service accounts have no Drive quota (403 storageQuotaExceeded).
--
-- Public buckets (avatars, receipt-logos) serve open URLs for <img>.
-- Private buckets (financial/legal docs) are read via signed URLs.
--
-- Server uploads/reads use the service-role client (bypasses RLS), so no
-- storage.objects policies are required for the app to function.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars',            'avatars',            true,   5242880, array['image/jpeg','image/png','image/webp']),
  ('receipt-logos',      'receipt-logos',      true,   2097152, array['image/jpeg','image/png','image/webp','image/svg+xml']),
  ('asset-receipts',     'asset-receipts',     false, 10485760, array['image/jpeg','image/png','image/webp','application/pdf']),
  ('inventory-receipts', 'inventory-receipts', false, 10485760, array['image/jpeg','image/png','image/webp','application/pdf']),
  ('warranty-documents', 'warranty-documents', false, 10485760, array['image/jpeg','image/png','image/webp','application/pdf']),
  ('purchase-invoices',  'purchase-invoices',  false, 10485760, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
