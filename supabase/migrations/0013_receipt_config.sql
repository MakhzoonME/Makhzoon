-- Add receipt_config JSONB column to organization_configs.
-- Stores per-org receipt template, branding, and content toggles.
alter table public.organization_configs
  add column if not exists receipt_config jsonb not null default '{}'::jsonb;
