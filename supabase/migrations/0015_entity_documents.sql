-- Attachment references for entities that carry uploaded files. Each column
-- holds a JSONB array of DocumentRef objects ({ bucket, path, name,
-- contentType, url?, public }). Files live in the dedicated Storage buckets
-- created in 0014. Idempotent — safe to run on dev, staging, and production.

alter table public.assets
  add column if not exists documents jsonb not null default '[]'::jsonb;

alter table public.inventory_items
  add column if not exists documents jsonb not null default '[]'::jsonb;

alter table public.warranties
  add column if not exists documents jsonb not null default '[]'::jsonb;

alter table public.purchases
  add column if not exists documents jsonb not null default '[]'::jsonb;
