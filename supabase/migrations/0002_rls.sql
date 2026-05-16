-- Makhzoon — Row Level Security (Phase 1 core tables)
-- Faithfully ports firestore.rules. Predicates use the SECURITY DEFINER
-- helpers from 0001_init.sql, which resolve role/org from public.users
-- (authoritative), matching the legacy verifySessionCookie() behavior.
--
-- The service-role client (lib/supabase/admin.ts) bypasses RLS by design and
-- is the path for superadmin tooling, invite acceptance, crons and seeds —
-- the equivalent of the firebase-admin SDK. These policies are the safety net
-- governing the per-user anon/SSR client.

alter table public.organizations        enable row level security;
alter table public.users                enable row level security;
alter table public.packages             enable row level security;
alter table public.subscriptions        enable row level security;
alter table public.assets               enable row level security;
alter table public.inventory_items      enable row level security;
alter table public.inventory_transactions enable row level security;
alter table public.invites              enable row level security;
alter table public.organization_configs enable row level security;

-- ── organizations: platform admins only (firestore: isSuperAdmin) ──────────
create policy organizations_platform_all on public.organizations
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());

-- ── subscriptions: platform r/w; org manager read ──────────────────────────
create policy subscriptions_platform_all on public.subscriptions
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy subscriptions_mgr_read on public.subscriptions
  for select using (public.is_org_manager(organization_id));

-- ── users: platform r/w; org manager r/w same org; staff read same org ─────
create policy users_platform_all on public.users
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy users_mgr_all on public.users
  for all using (public.is_org_manager(organization_id))
  with check (public.is_org_manager(organization_id));
create policy users_staff_read on public.users
  for select using (public.belongs_to_org(organization_id));

-- ── packages: any authenticated user reads; platform admins manage ─────────
create policy packages_read on public.packages
  for select using (auth.uid() is not null);
create policy packages_platform_write on public.packages
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());

-- ── assets: platform r/w; org manager r/w; staff read ──────────────────────
create policy assets_platform_all on public.assets
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy assets_mgr_all on public.assets
  for all using (public.is_org_manager(organization_id))
  with check (public.is_org_manager(organization_id));
create policy assets_staff_read on public.assets
  for select using (public.belongs_to_org(organization_id));

-- ── inventory_items: platform r/w; org manager r/w; staff read ─────────────
create policy inv_items_platform_all on public.inventory_items
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy inv_items_mgr_all on public.inventory_items
  for all using (public.is_org_manager(organization_id))
  with check (public.is_org_manager(organization_id));
create policy inv_items_staff_read on public.inventory_items
  for select using (public.belongs_to_org(organization_id));

-- ── inventory_transactions: platform r/w; org manager r/w; org staff read ──
create policy inv_tx_platform_all on public.inventory_transactions
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy inv_tx_mgr_all on public.inventory_transactions
  for all using (public.is_org_manager(organization_id))
  with check (public.is_org_manager(organization_id));
create policy inv_tx_staff_read on public.inventory_transactions
  for select using (public.belongs_to_org(organization_id));

-- ── invites: platform r/w; org manager r/w ─────────────────────────────────
create policy invites_platform_all on public.invites
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy invites_mgr_all on public.invites
  for all using (public.is_org_manager(organization_id))
  with check (public.is_org_manager(organization_id));

-- ── organization_configs: platform r/w; org manager r/w; staff read ────────
create policy org_cfg_platform_all on public.organization_configs
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy org_cfg_mgr_all on public.organization_configs
  for all using (public.is_org_manager(organization_id))
  with check (public.is_org_manager(organization_id));
create policy org_cfg_staff_read on public.organization_configs
  for select using (public.belongs_to_org(organization_id));
