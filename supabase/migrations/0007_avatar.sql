-- Add avatar_url to public.users for Google Drive-hosted profile pictures.
-- See lib/drive/upload.ts and app/api/profile/route.ts.

alter table public.users
  add column if not exists avatar_url text;
