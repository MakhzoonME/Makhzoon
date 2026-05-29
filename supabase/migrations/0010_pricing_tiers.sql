-- ── 0010: pricing tiers ─────────────────────────────────────────────────────
-- Adds configurable pricing, trial, ordering, and plan-inclusion fields to
-- packages (subscription tiers), then seeds the four standard Makhzoon tiers.
-- Usage limits (maxSpaces, maxInventoryItems) live inside the existing
-- `limits` jsonb, so no column change is needed for those.

alter table public.packages
  add column if not exists monthly_price     numeric,
  add column if not exists annual_price      numeric,
  add column if not exists currency          text    not null default 'USD',
  add column if not exists is_custom_pricing boolean not null default false,
  add column if not exists trial_days        integer not null default 0,
  add column if not exists sort_order        integer not null default 0,
  add column if not exists inclusions        jsonb   not null default '{}'::jsonb;

create index if not exists packages_sort_order_idx on public.packages (sort_order);

-- ── Seed the four standard tiers (idempotent: skip if a tier of that name
--    already exists, so re-running the migration never duplicates rows). ──────
do $$
declare
  all_features  jsonb := jsonb_build_object(
    'dashboard', true, 'assets', true, 'inventory', true, 'warranties', true,
    'requests', true, 'reports', true, 'support', true, 'auditLogs', true,
    'maintenance', true, 'assetCheckouts', true, 'assetNotes', true, 'pos', true
  );
begin
  -- Starter
  if not exists (select 1 from public.packages where name = 'Starter') then
    insert into public.packages
      (name, description, is_active, monthly_price, annual_price, currency,
       is_custom_pricing, trial_days, sort_order, limits, features, inclusions)
    values (
      'Starter',
      'The retail shop''s first step off spreadsheets.',
      true, 29, 290, 'USD', false, 90, 1,
      jsonb_build_object('maxAssets', 150, 'maxUsers', 2, 'maxWarranties', -1,
        'maxRequests', -1, 'maxSpaces', 1, 'maxInventoryItems', 150),
      all_features,
      jsonb_build_object('csvExport', true, 'emailSupport', true,
        'prioritySupport', false, 'dedicatedOnboarding', false, 'customSla', false)
    );
  end if;

  -- Pro
  if not exists (select 1 from public.packages where name = 'Pro') then
    insert into public.packages
      (name, description, is_active, monthly_price, annual_price, currency,
       is_custom_pricing, trial_days, sort_order, limits, features, inclusions)
    values (
      'Pro',
      'The SMB that outgrew Starter.',
      true, 79, 790, 'USD', false, 90, 2,
      jsonb_build_object('maxAssets', 750, 'maxUsers', 8, 'maxWarranties', -1,
        'maxRequests', -1, 'maxSpaces', 3, 'maxInventoryItems', 750),
      all_features,
      jsonb_build_object('csvExport', true, 'emailSupport', true,
        'prioritySupport', false, 'dedicatedOnboarding', false, 'customSla', false)
    );
  end if;

  -- Growth
  if not exists (select 1 from public.packages where name = 'Growth') then
    insert into public.packages
      (name, description, is_active, monthly_price, annual_price, currency,
       is_custom_pricing, trial_days, sort_order, limits, features, inclusions)
    values (
      'Growth',
      'The mid-size operation that needs scale.',
      true, 179, 1790, 'USD', false, 90, 3,
      jsonb_build_object('maxAssets', 3000, 'maxUsers', 20, 'maxWarranties', -1,
        'maxRequests', -1, 'maxSpaces', 10, 'maxInventoryItems', 3000),
      all_features,
      jsonb_build_object('csvExport', true, 'emailSupport', true,
        'prioritySupport', true, 'dedicatedOnboarding', false, 'customSla', false)
    );
  end if;

  -- Enterprise (custom / "from $399")
  if not exists (select 1 from public.packages where name = 'Enterprise') then
    insert into public.packages
      (name, description, is_active, monthly_price, annual_price, currency,
       is_custom_pricing, trial_days, sort_order, limits, features, inclusions)
    values (
      'Enterprise',
      'Custom deal, high-touch, negotiated SLA.',
      true, 399, null, 'USD', true, 90, 4,
      jsonb_build_object('maxAssets', -1, 'maxUsers', -1, 'maxWarranties', -1,
        'maxRequests', -1, 'maxSpaces', -1, 'maxInventoryItems', -1),
      all_features,
      jsonb_build_object('csvExport', true, 'emailSupport', true,
        'prioritySupport', true, 'dedicatedOnboarding', true, 'customSla', true)
    );
  end if;
end $$;
