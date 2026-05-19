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
drop policy if exists organizations_platform_all on public.organizations;
create policy organizations_platform_all on public.organizations
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());

-- ── subscriptions: platform r/w; org manager read ──────────────────────────
drop policy if exists subscriptions_platform_all on public.subscriptions;
create policy subscriptions_platform_all on public.subscriptions
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());
drop policy if exists subscriptions_mgr_read on public.subscriptions;
create policy subscriptions_mgr_read on public.subscriptions
  for select using (public.is_org_manager(organization_id));

-- ── users: platform r/w; org manager r/w same org; staff read same org ─────
drop policy if exists users_platform_all on public.users;
create policy users_platform_all on public.users
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());
drop policy if exists users_mgr_all on public.users;
create policy users_mgr_all on public.users
  for all using (public.is_org_manager(organization_id))
  with check (public.is_org_manager(organization_id));
drop policy if exists users_staff_read on public.users;
create policy users_staff_read on public.users
  for select using (public.belongs_to_org(organization_id));

-- ── packages: any authenticated user reads; platform admins manage ─────────
drop policy if exists packages_read on public.packages;
create policy packages_read on public.packages
  for select using (auth.uid() is not null);
drop policy if exists packages_platform_write on public.packages;
create policy packages_platform_write on public.packages
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());

-- ── assets: platform r/w; org manager r/w; staff read ──────────────────────
drop policy if exists assets_platform_all on public.assets;
create policy assets_platform_all on public.assets
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());
drop policy if exists assets_mgr_all on public.assets;
create policy assets_mgr_all on public.assets
  for all using (public.is_org_manager(organization_id))
  with check (public.is_org_manager(organization_id));
drop policy if exists assets_staff_read on public.assets;
create policy assets_staff_read on public.assets
  for select using (public.belongs_to_org(organization_id));

-- ── inventory_items: platform r/w; org manager r/w; staff read ─────────────
drop policy if exists inv_items_platform_all on public.inventory_items;
create policy inv_items_platform_all on public.inventory_items
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());
drop policy if exists inv_items_mgr_all on public.inventory_items;
create policy inv_items_mgr_all on public.inventory_items
  for all using (public.is_org_manager(organization_id))
  with check (public.is_org_manager(organization_id));
drop policy if exists inv_items_staff_read on public.inventory_items;
create policy inv_items_staff_read on public.inventory_items
  for select using (public.belongs_to_org(organization_id));

-- ── inventory_transactions: platform r/w; org manager r/w; org staff read ──
drop policy if exists inv_tx_platform_all on public.inventory_transactions;
create policy inv_tx_platform_all on public.inventory_transactions
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());
drop policy if exists inv_tx_mgr_all on public.inventory_transactions;
create policy inv_tx_mgr_all on public.inventory_transactions
  for all using (public.is_org_manager(organization_id))
  with check (public.is_org_manager(organization_id));
drop policy if exists inv_tx_staff_read on public.inventory_transactions;
create policy inv_tx_staff_read on public.inventory_transactions
  for select using (public.belongs_to_org(organization_id));

-- ── invites: platform r/w; org manager r/w ─────────────────────────────────
drop policy if exists invites_platform_all on public.invites;
create policy invites_platform_all on public.invites
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());
drop policy if exists invites_mgr_all on public.invites;
create policy invites_mgr_all on public.invites
  for all using (public.is_org_manager(organization_id))
  with check (public.is_org_manager(organization_id));

-- ── organization_configs: platform r/w; org manager r/w; staff read ────────
drop policy if exists org_cfg_platform_all on public.organization_configs;
create policy org_cfg_platform_all on public.organization_configs
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());
drop policy if exists org_cfg_mgr_all on public.organization_configs;
create policy org_cfg_mgr_all on public.organization_configs
  for all using (public.is_org_manager(organization_id))
  with check (public.is_org_manager(organization_id));
drop policy if exists org_cfg_staff_read on public.organization_configs;
create policy org_cfg_staff_read on public.organization_configs
  for select using (public.belongs_to_org(organization_id));
