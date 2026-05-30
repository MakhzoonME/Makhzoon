-- ═══════════════════════════════════════════════════════════════════
-- Spaces feature — Script 3: Constraints + RLS lockdown
-- ═══════════════════════════════════════════════════════════════════
-- WHAT THIS DOES
--   1. Adds the can_access_space() SECURITY-DEFINER helper.
--   2. Tightens space_id: NOT NULL + FK on every space-scoped table
--      EXCEPT audit_logs (platform-level events have no space and must
--      keep NULL). audit_logs gets a BEFORE-INSERT trigger that
--      auto-fills space_id from the org's default when org_id is set.
--   3. Reworks pos_receipt_counters primary key (org → (org, space)).
--   4. Adds per-space unique indexes (asset serial_number, inventory sku).
--   5. Adds default-space safety triggers:
--        - cannot delete a row with is_default = true
--        - auto-creates a Default space on every new organization
--        - sets users.all_spaces = true on new org_owner inserts
--   6. Swaps every space-scoped table's RLS policies to AND with
--      can_access_space(space_id). Platform admins bypass unchanged.
--
-- WHEN TO RUN
--   AFTER PR-3 + PR-3b are deployed on this env. Without those, the
--   tightened policies will start rejecting API calls. Script 2 must
--   already be applied so no rows have NULL space_id.
--
-- PER-ENV CHECKLIST
--   [ ] dev      [ ] staging      [ ] prod
--
-- IDEMPOTENT
--   Safe to re-run. Uses CREATE OR REPLACE / IF NOT EXISTS / DROP IF
--   EXISTS throughout.
-- ═══════════════════════════════════════════════════════════════════


-- ──────────────────────────────────────────────────────────────────
-- 1. Helper function: can_access_space(space)
-- ──────────────────────────────────────────────────────────────────
-- Mirrors app_org() / is_org_manager() from 0001_init.sql. Resolves
-- access via:
--   - platform admin       → true (cross-tenant bypass)
--   - users.all_spaces=true → any space in caller's org
--   - otherwise            → membership row in space_members
--
-- NULL space input → false (defense-in-depth; rows should never
-- have NULL space_id after this script anyway).
create or replace function public.can_access_space(s uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when s is null then false
    when public.is_platform_admin() then true
    when (select coalesce(all_spaces, false) from public.users where id = auth.uid()) then
      exists (
        select 1 from public.spaces
        where id = s and organization_id = public.app_org()
      )
    else exists (
      select 1 from public.space_members
      where space_id = s and user_id = auth.uid()
    )
  end;
$$;


-- ──────────────────────────────────────────────────────────────────
-- 2. space_id NOT NULL + FK on every space-scoped table
-- ──────────────────────────────────────────────────────────────────
-- Defensive sanity check (uncomment to verify before running this block):
--   select 'assets' t, count(*) from public.assets where space_id is null
--   union all select 'inventory_items', count(*) from public.inventory_items where space_id is null
--   ...
-- All counts must be 0 (Script 2 backfilled).

do $$
declare
  t text;
  -- NOTE: audit_logs is intentionally NOT in this list. Platform-level
  -- events (transfer mode, org creation, package mgmt, …) have no tenant
  -- and therefore no space, so audit_logs.space_id stays nullable. A
  -- BEFORE INSERT trigger (section 2b) auto-fills it from the org's
  -- default space when org_id is set, so tenant events always get a
  -- space_id. Platform-only events keep NULL — only platform admins
  -- can see those rows via the audit_logs_read policy.
  tables text[] := array[
    'assets', 'asset_notes', 'asset_checkouts', 'maintenance_records', 'warranties',
    'inventory_items', 'inventory_transactions', 'inventory_audits',
    'inventory_audit_items', 'stock_audits', 'stock_audit_items', 'purchases',
    'requests',
    'pos_sessions', 'pos_transactions', 'pos_customers', 'pos_receipt_counters'
  ];
begin
  foreach t in array tables loop
    execute format('alter table public.%I alter column space_id set not null', t);
    -- Add FK only if missing; constraint name follows <table>_space_id_fkey convention.
    execute format($f$
      do $inner$
      begin
        if not exists (
          select 1 from pg_constraint
          where conname = %L and conrelid = %L::regclass
        ) then
          alter table public.%I
            add constraint %I
            foreign key (space_id) references public.spaces (id) on delete cascade;
        end if;
      end $inner$
    $f$, t || '_space_id_fkey', 'public.' || t, t, t || '_space_id_fkey');
  end loop;
end $$;


-- ──────────────────────────────────────────────────────────────────
-- 2b. audit_logs: nullable space_id + auto-fill trigger + FK
-- ──────────────────────────────────────────────────────────────────
-- Backfill any audit_logs rows that drifted between Script 2 and now
-- (events written by the still-old logger before PR-3b deployed).
-- Only rows whose org has a Default space are touched; truly
-- platform-level events (org_id IS NULL) keep NULL space_id.
update public.audit_logs al
set space_id = s.id
from public.spaces s
where s.organization_id = al.organization_id
  and s.is_default = true
  and al.space_id is null
  and al.organization_id is not null;

-- Auto-fill space_id on future inserts whenever org_id is set. Keeps
-- the application logger simple (it can still pass NULL when there's
-- no active space context) without violating the contract.
create or replace function public.fill_audit_log_default_space()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.space_id is null and new.organization_id is not null then
    select id into new.space_id
    from public.spaces
    where organization_id = new.organization_id and is_default = true
    limit 1;
  end if;
  return new;
end $$;

drop trigger if exists audit_logs_fill_default_space on public.audit_logs;
create trigger audit_logs_fill_default_space
  before insert on public.audit_logs
  for each row execute function public.fill_audit_log_default_space();

-- FK is safe on a nullable column — NULL values are not validated.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'audit_logs_space_id_fkey'
      and conrelid = 'public.audit_logs'::regclass
  ) then
    alter table public.audit_logs
      add constraint audit_logs_space_id_fkey
      foreign key (space_id) references public.spaces (id) on delete set null;
  end if;
end $$;


-- ──────────────────────────────────────────────────────────────────
-- 3. pos_receipt_counters primary key → (org, space)
-- ──────────────────────────────────────────────────────────────────
-- The original PK was on organization_id alone. Receipt sequences are
-- now per-space (each branch numbers its own receipts).
alter table public.pos_receipt_counters drop constraint if exists pos_receipt_counters_pkey;
-- After the NOT NULL step above, both columns are non-null → safe PK.
alter table public.pos_receipt_counters
  add constraint pos_receipt_counters_pkey
  primary key (organization_id, space_id);


-- ──────────────────────────────────────────────────────────────────
-- 4. Per-space uniqueness indexes
-- ──────────────────────────────────────────────────────────────────
-- Locked decision: serial_number and SKU are unique within a space,
-- not org-wide. Empty/NULL values are excluded from the constraint.

create unique index if not exists assets_space_serial_uidx
  on public.assets (organization_id, space_id, lower(serial_number))
  where serial_number is not null and serial_number <> '';

create unique index if not exists inv_items_space_sku_uidx
  on public.inventory_items (organization_id, space_id, lower(sku))
  where sku is not null and sku <> '';


-- ──────────────────────────────────────────────────────────────────
-- 5. Default-space safety triggers
-- ──────────────────────────────────────────────────────────────────

-- 5a. Prevent deleting the default space.
create or replace function public.prevent_default_space_delete()
returns trigger language plpgsql as $$
begin
  if old.is_default then
    raise exception 'The default space (% / %) cannot be deleted.', old.organization_id, old.slug
      using errcode = 'restrict_violation';
  end if;
  return old;
end $$;

drop trigger if exists spaces_no_delete_default on public.spaces;
create trigger spaces_no_delete_default
  before delete on public.spaces
  for each row execute function public.prevent_default_space_delete();

-- 5b. Auto-create the Default space on every new organization.
create or replace function public.create_default_space_for_org()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.spaces (organization_id, name, slug, is_default)
  values (new.id, 'Default', 'default', true)
  on conflict do nothing;
  return new;
end $$;

drop trigger if exists orgs_create_default_space on public.organizations;
create trigger orgs_create_default_space
  after insert on public.organizations
  for each row execute function public.create_default_space_for_org();

-- 5c. New org_owners default to all_spaces = true. Owners may opt out
-- later via the user-config popup (PR-5); we only set on insert.
create or replace function public.set_owner_all_spaces()
returns trigger language plpgsql as $$
begin
  if new.role = 'org_owner' then
    new.all_spaces := true;
  end if;
  return new;
end $$;

drop trigger if exists users_owner_all_spaces on public.users;
create trigger users_owner_all_spaces
  before insert on public.users
  for each row execute function public.set_owner_all_spaces();


-- ──────────────────────────────────────────────────────────────────
-- 6. RLS — swap every space-scoped table's policies to add
--    can_access_space(space_id). Platform-admin policies untouched.
-- ──────────────────────────────────────────────────────────────────
-- Pattern for each table:
--   mgr_all   → using/with check: is_org_manager(org) AND can_access_space(space)
--   staff_*   → using/with check: belongs_to_org(org) AND can_access_space(space)

-- spaces + space_members themselves get fresh policies (Script 1 left them
-- with RLS ON but no policies). Now: members read their own org's spaces;
-- managers manage; platform admins do anything.

drop policy if exists spaces_platform_all on public.spaces;
create policy spaces_platform_all on public.spaces
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());

drop policy if exists spaces_mgr_all on public.spaces;
create policy spaces_mgr_all on public.spaces
  for all using (public.is_org_manager(organization_id))
  with check (public.is_org_manager(organization_id));

drop policy if exists spaces_member_read on public.spaces;
create policy spaces_member_read on public.spaces
  for select using (public.belongs_to_org(organization_id));

drop policy if exists space_members_platform_all on public.space_members;
create policy space_members_platform_all on public.space_members
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());

drop policy if exists space_members_mgr_all on public.space_members;
create policy space_members_mgr_all on public.space_members
  for all using (public.is_org_manager(organization_id))
  with check (public.is_org_manager(organization_id));

drop policy if exists space_members_self_read on public.space_members;
create policy space_members_self_read on public.space_members
  for select using (user_id = auth.uid());

-- ── assets ───────────────────────────────────────────────────────
drop policy if exists assets_mgr_all on public.assets;
create policy assets_mgr_all on public.assets
  for all using (public.is_org_manager(organization_id) and public.can_access_space(space_id))
  with check (public.is_org_manager(organization_id) and public.can_access_space(space_id));
drop policy if exists assets_staff_read on public.assets;
create policy assets_staff_read on public.assets
  for select using (public.belongs_to_org(organization_id) and public.can_access_space(space_id));

-- ── asset_notes ──────────────────────────────────────────────────
drop policy if exists asset_notes_mgr_all on public.asset_notes;
create policy asset_notes_mgr_all on public.asset_notes
  for all using (public.is_org_manager(organization_id) and public.can_access_space(space_id))
  with check (public.is_org_manager(organization_id) and public.can_access_space(space_id));
drop policy if exists asset_notes_staff_read on public.asset_notes;
create policy asset_notes_staff_read on public.asset_notes
  for select using (public.belongs_to_org(organization_id) and public.can_access_space(space_id));
drop policy if exists asset_notes_staff_create on public.asset_notes;
create policy asset_notes_staff_create on public.asset_notes
  for insert with check (public.belongs_to_org(organization_id) and public.can_access_space(space_id));
drop policy if exists asset_notes_staff_delete_own on public.asset_notes;
create policy asset_notes_staff_delete_own on public.asset_notes
  for delete using (
    public.belongs_to_org(organization_id)
    and public.can_access_space(space_id)
    and created_by = auth.uid()
  );

-- ── asset_checkouts ──────────────────────────────────────────────
drop policy if exists checkouts_mgr_all on public.asset_checkouts;
create policy checkouts_mgr_all on public.asset_checkouts
  for all using (public.is_org_manager(organization_id) and public.can_access_space(space_id))
  with check (public.is_org_manager(organization_id) and public.can_access_space(space_id));
drop policy if exists checkouts_staff_read on public.asset_checkouts;
create policy checkouts_staff_read on public.asset_checkouts
  for select using (public.belongs_to_org(organization_id) and public.can_access_space(space_id));
drop policy if exists checkouts_staff_create on public.asset_checkouts;
create policy checkouts_staff_create on public.asset_checkouts
  for insert with check (public.belongs_to_org(organization_id) and public.can_access_space(space_id));
drop policy if exists checkouts_staff_update on public.asset_checkouts;
create policy checkouts_staff_update on public.asset_checkouts
  for update using (public.belongs_to_org(organization_id) and public.can_access_space(space_id))
  with check (public.belongs_to_org(organization_id) and public.can_access_space(space_id));

-- ── maintenance_records ──────────────────────────────────────────
drop policy if exists maint_mgr_all on public.maintenance_records;
create policy maint_mgr_all on public.maintenance_records
  for all using (public.is_org_manager(organization_id) and public.can_access_space(space_id))
  with check (public.is_org_manager(organization_id) and public.can_access_space(space_id));
drop policy if exists maint_staff_read on public.maintenance_records;
create policy maint_staff_read on public.maintenance_records
  for select using (public.belongs_to_org(organization_id) and public.can_access_space(space_id));

-- ── warranties ───────────────────────────────────────────────────
drop policy if exists warranties_mgr_all on public.warranties;
create policy warranties_mgr_all on public.warranties
  for all using (public.is_org_manager(organization_id) and public.can_access_space(space_id))
  with check (public.is_org_manager(organization_id) and public.can_access_space(space_id));
drop policy if exists warranties_staff_read on public.warranties;
create policy warranties_staff_read on public.warranties
  for select using (public.belongs_to_org(organization_id) and public.can_access_space(space_id));

-- ── inventory_items ──────────────────────────────────────────────
drop policy if exists inv_items_mgr_all on public.inventory_items;
create policy inv_items_mgr_all on public.inventory_items
  for all using (public.is_org_manager(organization_id) and public.can_access_space(space_id))
  with check (public.is_org_manager(organization_id) and public.can_access_space(space_id));
drop policy if exists inv_items_staff_read on public.inventory_items;
create policy inv_items_staff_read on public.inventory_items
  for select using (public.belongs_to_org(organization_id) and public.can_access_space(space_id));

-- ── inventory_transactions ───────────────────────────────────────
drop policy if exists inv_tx_mgr_all on public.inventory_transactions;
create policy inv_tx_mgr_all on public.inventory_transactions
  for all using (public.is_org_manager(organization_id) and public.can_access_space(space_id))
  with check (public.is_org_manager(organization_id) and public.can_access_space(space_id));
drop policy if exists inv_tx_staff_read on public.inventory_transactions;
create policy inv_tx_staff_read on public.inventory_transactions
  for select using (public.belongs_to_org(organization_id) and public.can_access_space(space_id));

-- ── inventory_audits / items ─────────────────────────────────────
drop policy if exists inv_audits_mgr_all on public.inventory_audits;
create policy inv_audits_mgr_all on public.inventory_audits
  for all using (public.is_org_manager(organization_id) and public.can_access_space(space_id))
  with check (public.is_org_manager(organization_id) and public.can_access_space(space_id));
drop policy if exists inv_audits_staff_read on public.inventory_audits;
create policy inv_audits_staff_read on public.inventory_audits
  for select using (public.belongs_to_org(organization_id) and public.can_access_space(space_id));

drop policy if exists inv_audit_items_mgr_all on public.inventory_audit_items;
create policy inv_audit_items_mgr_all on public.inventory_audit_items
  for all using (public.is_org_manager(organization_id) and public.can_access_space(space_id))
  with check (public.is_org_manager(organization_id) and public.can_access_space(space_id));
drop policy if exists inv_audit_items_staff_read on public.inventory_audit_items;
create policy inv_audit_items_staff_read on public.inventory_audit_items
  for select using (public.belongs_to_org(organization_id) and public.can_access_space(space_id));

-- ── stock_audits / items ─────────────────────────────────────────
drop policy if exists stock_audits_mgr_all on public.stock_audits;
create policy stock_audits_mgr_all on public.stock_audits
  for all using (public.is_org_manager(organization_id) and public.can_access_space(space_id))
  with check (public.is_org_manager(organization_id) and public.can_access_space(space_id));
drop policy if exists stock_audits_staff_read on public.stock_audits;
create policy stock_audits_staff_read on public.stock_audits
  for select using (public.belongs_to_org(organization_id) and public.can_access_space(space_id));

drop policy if exists stock_audit_items_mgr_all on public.stock_audit_items;
create policy stock_audit_items_mgr_all on public.stock_audit_items
  for all using (public.is_org_manager(organization_id) and public.can_access_space(space_id))
  with check (public.is_org_manager(organization_id) and public.can_access_space(space_id));
drop policy if exists stock_audit_items_staff_read on public.stock_audit_items;
create policy stock_audit_items_staff_read on public.stock_audit_items
  for select using (public.belongs_to_org(organization_id) and public.can_access_space(space_id));

-- ── purchases ────────────────────────────────────────────────────
drop policy if exists purchases_mgr_all on public.purchases;
create policy purchases_mgr_all on public.purchases
  for all using (public.is_org_manager(organization_id) and public.can_access_space(space_id))
  with check (public.is_org_manager(organization_id) and public.can_access_space(space_id));
drop policy if exists purchases_staff_read on public.purchases;
create policy purchases_staff_read on public.purchases
  for select using (public.belongs_to_org(organization_id) and public.can_access_space(space_id));

-- ── requests ─────────────────────────────────────────────────────
drop policy if exists requests_mgr_all on public.requests;
create policy requests_mgr_all on public.requests
  for all using (public.is_org_manager(organization_id) and public.can_access_space(space_id))
  with check (public.is_org_manager(organization_id) and public.can_access_space(space_id));
drop policy if exists requests_staff_read on public.requests;
create policy requests_staff_read on public.requests
  for select using (public.belongs_to_org(organization_id) and public.can_access_space(space_id));
drop policy if exists requests_staff_create on public.requests;
create policy requests_staff_create on public.requests
  for insert with check (public.belongs_to_org(organization_id) and public.can_access_space(space_id));

-- ── POS: sessions / transactions / customers / receipt counters ──
drop policy if exists pos_sessions_mgr_all on public.pos_sessions;
create policy pos_sessions_mgr_all on public.pos_sessions
  for all using (public.is_org_manager(organization_id) and public.can_access_space(space_id))
  with check (public.is_org_manager(organization_id) and public.can_access_space(space_id));
drop policy if exists pos_sessions_staff_rw on public.pos_sessions;
create policy pos_sessions_staff_rw on public.pos_sessions
  for all using (public.belongs_to_org(organization_id) and public.can_access_space(space_id))
  with check (public.belongs_to_org(organization_id) and public.can_access_space(space_id));

drop policy if exists pos_tx_mgr_all on public.pos_transactions;
create policy pos_tx_mgr_all on public.pos_transactions
  for all using (public.is_org_manager(organization_id) and public.can_access_space(space_id))
  with check (public.is_org_manager(organization_id) and public.can_access_space(space_id));
drop policy if exists pos_tx_staff_rw on public.pos_transactions;
create policy pos_tx_staff_rw on public.pos_transactions
  for all using (public.belongs_to_org(organization_id) and public.can_access_space(space_id))
  with check (public.belongs_to_org(organization_id) and public.can_access_space(space_id));

drop policy if exists pos_customers_mgr_all on public.pos_customers;
create policy pos_customers_mgr_all on public.pos_customers
  for all using (public.is_org_manager(organization_id) and public.can_access_space(space_id))
  with check (public.is_org_manager(organization_id) and public.can_access_space(space_id));
drop policy if exists pos_customers_staff_rw on public.pos_customers;
create policy pos_customers_staff_rw on public.pos_customers
  for all using (public.belongs_to_org(organization_id) and public.can_access_space(space_id))
  with check (public.belongs_to_org(organization_id) and public.can_access_space(space_id));

-- pos_receipt_counters had no policies in earlier migrations (RLS on,
-- service-role only). Add the same per-space gating now.
drop policy if exists pos_receipt_counters_platform_all on public.pos_receipt_counters;
create policy pos_receipt_counters_platform_all on public.pos_receipt_counters
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());
drop policy if exists pos_receipt_counters_mgr_all on public.pos_receipt_counters;
create policy pos_receipt_counters_mgr_all on public.pos_receipt_counters
  for all using (public.is_org_manager(organization_id) and public.can_access_space(space_id))
  with check (public.is_org_manager(organization_id) and public.can_access_space(space_id));
drop policy if exists pos_receipt_counters_staff_rw on public.pos_receipt_counters;
create policy pos_receipt_counters_staff_rw on public.pos_receipt_counters
  for all using (public.belongs_to_org(organization_id) and public.can_access_space(space_id))
  with check (public.belongs_to_org(organization_id) and public.can_access_space(space_id));

-- ── audit_logs (hard-scoped per locked decision) ─────────────────
-- Old policy: super_admin reads all; org admin reads own org. New
-- policy: same as before AND the row's space must be accessible.
drop policy if exists audit_logs_read on public.audit_logs;
create policy audit_logs_read on public.audit_logs
  for select using (
    public.is_platform_admin()
    or (
      public.app_role() = 'admin'
      and public.app_org() = organization_id
      and public.can_access_space(space_id)
    )
  );


-- ═══════════════════════════════════════════════════════════════════
-- VERIFICATION — run these by hand after the script completes.
-- ═══════════════════════════════════════════════════════════════════
-- 1. No NULL space_id on the hard-locked tables:
--      select 'assets' t, count(*) from public.assets where space_id is null
--      union all select 'inventory_items', count(*) from public.inventory_items where space_id is null
--      union all select 'requests', count(*) from public.requests where space_id is null
--      union all select 'pos_transactions', count(*) from public.pos_transactions where space_id is null;
--    Each row must be 0.
--    (audit_logs is intentionally allowed to keep NULL space_id for
--     platform-level events — see section 2b.)
--
-- 2. Default space exists and is undeletable:
--      delete from public.spaces where is_default;     -- should ERROR.
--
-- 3. Creating a new org auto-creates the Default space:
--      insert into public.organizations (name, subdomain, contact_email)
--      values ('test-spaces', 'test-spaces', 'a@b.c') returning id;
--      select * from public.spaces where organization_id = '<that id>';
--      -- should show one row with name='Default', is_default=true.
--      delete from public.organizations where subdomain = 'test-spaces';
--
-- 4. can_access_space() works:
--      -- as superadmin via service role: select public.can_access_space('<some space>');
-- ═══════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════
-- DONE. Spaces are now hard-enforced. From this point forward:
--   • Every space-scoped row MUST have space_id.
--   • Cross-space access is impossible at the DB layer (except for
--     platform admins via service role / the *_platform_all policies).
--   • Org owners default to all_spaces=true; admin/staff scoped by
--     space_members rows.
-- ═══════════════════════════════════════════════════════════════════
