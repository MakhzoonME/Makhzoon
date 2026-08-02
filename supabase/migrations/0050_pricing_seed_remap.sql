-- ════════════════════════════════════════════════════════════════════════
-- 0050_pricing_seed_remap.sql
-- ACTIVATION step for the new pricing model. Two parts:
--   (A) Re-seed the Starter/Pro/Growth tier packages to the approved
--       allowances/prices, flipping them to "new-model" (which turns ON the
--       module/limit gating added in prior migrations).
--   (B) Big-bang re-map of every existing subscription: backfill each org's
--       active Haraka modules AND detectable add-ons FROM ACTUAL USAGE, so no
--       org loses access to something it already uses.
--
-- NOTE (intended, per product decision): the new caps are lower than the old
-- ones (e.g. Growth 3000 -> 200 assets). Orgs already above a new cap keep
-- their data but are blocked from creating MORE of that resource until they
-- upgrade / add capacity. Warranties/requests stay unlimited (-1).
--
-- Values below come from the approved pricing sheet: Starter 12 / Pro 30 /
-- Growth 50 JOD; assets 50/100/200; items 100/200/500; Haraka slots 0/1/2;
-- 2 users each; Growth includes delivery + warranty certs + customization.
-- spaces (1/1/2) and add-on prices are provisional — adjust per package later.
-- Idempotent: package updates key on name; usage backfills only touch rows not
-- yet configured (active_haraka_modules still empty).
-- ════════════════════════════════════════════════════════════════════════

-- ── (A) Tier packages ──────────────────────────────────────────────────────
update public.packages set
  monthly_price = 12, currency = 'JOD', is_custom = false,
  usool_included = 50, raseed_included = 100, purchases_requests_included = false,
  haraka_included_module_slots = 0,
  delivery_agents_included = false, warranty_certs_included = false, customization_included = false,
  spaces_included = 1, users_included = 2, reports_available = false,
  limits = jsonb_build_object('maxAssets', 50, 'maxInventoryItems', 100,
    'maxUsers', 2, 'maxSpaces', 1, 'maxWarranties', -1, 'maxRequests', -1)
where name = 'Starter';

update public.packages set
  monthly_price = 30, currency = 'JOD', is_custom = false,
  usool_included = 100, raseed_included = 200, purchases_requests_included = false,
  haraka_included_module_slots = 1,
  delivery_agents_included = false, warranty_certs_included = false, customization_included = false,
  spaces_included = 1, users_included = 2, reports_available = false,
  limits = jsonb_build_object('maxAssets', 100, 'maxInventoryItems', 200,
    'maxUsers', 2, 'maxSpaces', 1, 'maxWarranties', -1, 'maxRequests', -1)
where name = 'Pro';

update public.packages set
  monthly_price = 50, currency = 'JOD', is_custom = false,
  usool_included = 200, raseed_included = 500, purchases_requests_included = false,
  haraka_included_module_slots = 2,
  delivery_agents_included = true, warranty_certs_included = true, customization_included = true,
  spaces_included = 2, users_included = 2, reports_available = false,
  limits = jsonb_build_object('maxAssets', 200, 'maxInventoryItems', 500,
    'maxUsers', 2, 'maxSpaces', 2, 'maxWarranties', -1, 'maxRequests', -1)
where name = 'Growth';

-- Enterprise stays custom + unlimited: leaving its allowances NULL keeps it
-- "non-new-model", so module/limit gating no-ops (everything allowed).
update public.packages set is_custom = true where name = 'Enterprise';

-- ── (B) Backfill active Haraka modules from usage (untouched subs only) ─────
update public.subscriptions s set
  active_haraka_modules = (
    select coalesce(array_agg(m order by m), '{}')
    from (
      select 'pos'::text as m
        where exists (select 1 from public.pos_transactions t where t.organization_id = s.organization_id)
           or exists (select 1 from public.pos_sessions ps where ps.organization_id = s.organization_id)
      union
      select 'services'
        where exists (select 1 from public.haraka_services x where x.organization_id = s.organization_id)
           or exists (select 1 from public.haraka_service_jobs x where x.organization_id = s.organization_id)
      union
      select 'orders'
        where exists (select 1 from public.haraka_orders x where x.organization_id = s.organization_id)
      union
      select 'retainers'
        where exists (select 1 from public.haraka_retainers x where x.organization_id = s.organization_id)
    ) mods
  )
where s.active_haraka_modules = '{}'::text[];

-- ── (B) Backfill detectable add-ons from usage so live orgs keep access ────
-- (delivery agents, warranty certs, purchases & requests). Growth already
-- INCLUDES delivery/warranty in the package; setting the flag too is harmless.
update public.subscriptions s set
  active_add_ons = coalesce(s.active_add_ons, '{}'::jsonb) || jsonb_build_object(
    'deliveryAgents',
      exists (select 1 from public.haraka_delivery_agents x where x.organization_id = s.organization_id),
    'warrantyCerts',
      exists (select 1 from public.haraka_warranty_certs x where x.organization_id = s.organization_id),
    'purchasesRequests',
      exists (select 1 from public.purchases x where x.organization_id = s.organization_id)
  )
where not (s.active_add_ons ? 'deliveryAgents');
