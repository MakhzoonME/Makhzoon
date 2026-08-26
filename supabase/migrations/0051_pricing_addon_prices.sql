-- ════════════════════════════════════════════════════════════════════════
-- 0051_pricing_addon_prices.sql
-- Populate add-on prices (from the approved Financial Plan) on the tier
-- packages and correct Growth's included spaces to 1 (all standard tiers are
-- 1 space / 2 users). Add-ons are plan-agnostic, so every standard tier gets
-- the same price map. Idempotent (keys on name).
--
-- Prices (JOD/month): +10 Usool 1 · +20 Raseed 1 · Purchases&Requests 2 ·
-- POS 15 · Services 15 · Orders 10 · Retainers 10 · Delivery agents 5 ·
-- Warranty certs 5 · Customization 2 · Reports 5 (not sold yet) ·
-- +1 user 3 · +1 space 5.
-- ════════════════════════════════════════════════════════════════════════

update public.packages set
  add_on_prices = jsonb_build_object(
    'usoolBlock', 1,
    'raseedBlock', 1,
    'purchasesRequests', 2,
    'harakaModules', jsonb_build_object('pos', 15, 'services', 15, 'orders', 10, 'retainers', 10),
    'deliveryAgents', 5,
    'warrantyCerts', 5,
    'customization', 2,
    'reports', 5,
    'extraUser', 3,
    'extraSpace', 5
  )
where name in ('Starter', 'Pro', 'Growth');

-- Correct Growth spaces: all standard tiers include 1 space (not 2).
update public.packages set
  spaces_included = 1,
  limits = jsonb_set(limits, '{maxSpaces}', '1'::jsonb)
where name = 'Growth';
