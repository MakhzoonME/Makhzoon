-- ════════════════════════════════════════════════════════════════════════
-- 0061_service_ops_addon_pricing.sql
-- Promote vehicleIntake and loyalty from the legacy free features flag
-- (0058) to real priced add-ons on the pricing model (0049) — same pattern
-- as delivery_agents_included / active_add_ons.deliveryAgents. The legacy
-- packages.features flags from 0058 stay in place as the client-side "is
-- this turned on in the UI for this org" switch; these new columns are the
-- billing enforcement layer, checked server-side via requireAddOn().
-- ════════════════════════════════════════════════════════════════════════

alter table public.packages
  add column if not exists vehicle_intake_included boolean not null default false,
  add column if not exists loyalty_included         boolean not null default false;
