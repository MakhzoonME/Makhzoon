-- ═══════════════════════════════════════════════════════════════════
-- Spaces feature — Script 2: Backfill
-- ═══════════════════════════════════════════════════════════════════
-- WHAT THIS DOES
--   1. Creates a "Default" space for every org that doesn't have one.
--   2. Sets space_id = that org's default space on every existing row
--      across all 18 space-scoped tables.
--   3. Sets users.all_spaces = true for every org_owner.
--   4. Creates space_members rows linking existing admin/staff users
--      to their org's default space (one row each).
--
-- WHEN TO RUN
--   AFTER Script 1 has been applied on this env.
--   BEFORE Script 3 (constraints + RLS).
--   App code is NOT required for Script 2 — it's pure data backfill.
--
-- PER-ENV CHECKLIST
--   [ ] dev      [ ] staging      [ ] prod
--
-- IDEMPOTENT
--   Safe to re-run. Every step skips rows it has already processed.
-- ═══════════════════════════════════════════════════════════════════


-- ── 1. Default space per organization ─────────────────────────────
-- One Default space per org, marked is_default=true so the partial
-- unique index from Script 1 guards against duplicates.
insert into public.spaces (organization_id, name, slug, is_default, created_at, updated_at)
select o.id, 'Default', 'default', true, now(), now()
from public.organizations o
where not exists (
  select 1 from public.spaces s
  where s.organization_id = o.id and s.is_default = true
);


-- ── 2. Backfill space_id on every space-scoped table ──────────────
-- A reusable CTE pattern: join each org's row to that org's default
-- space, and fill space_id only where it's still NULL.

-- 2a. Assets + asset-related
update public.assets a
set space_id = s.id
from public.spaces s
where s.organization_id = a.organization_id
  and s.is_default = true
  and a.space_id is null;

update public.asset_notes an
set space_id = s.id
from public.spaces s
where s.organization_id = an.organization_id
  and s.is_default = true
  and an.space_id is null;

update public.asset_checkouts c
set space_id = s.id
from public.spaces s
where s.organization_id = c.organization_id
  and s.is_default = true
  and c.space_id is null;

update public.maintenance_records m
set space_id = s.id
from public.spaces s
where s.organization_id = m.organization_id
  and s.is_default = true
  and m.space_id is null;

update public.warranties w
set space_id = s.id
from public.spaces s
where s.organization_id = w.organization_id
  and s.is_default = true
  and w.space_id is null;

-- 2b. Inventory + related
update public.inventory_items i
set space_id = s.id
from public.spaces s
where s.organization_id = i.organization_id
  and s.is_default = true
  and i.space_id is null;

update public.inventory_transactions t
set space_id = s.id
from public.spaces s
where s.organization_id = t.organization_id
  and s.is_default = true
  and t.space_id is null;

update public.inventory_audits ia
set space_id = s.id
from public.spaces s
where s.organization_id = ia.organization_id
  and s.is_default = true
  and ia.space_id is null;

update public.inventory_audit_items iai
set space_id = s.id
from public.spaces s
where s.organization_id = iai.organization_id
  and s.is_default = true
  and iai.space_id is null;

update public.stock_audits sa
set space_id = s.id
from public.spaces s
where s.organization_id = sa.organization_id
  and s.is_default = true
  and sa.space_id is null;

update public.stock_audit_items sai
set space_id = s.id
from public.spaces s
where s.organization_id = sai.organization_id
  and s.is_default = true
  and sai.space_id is null;

update public.purchases p
set space_id = s.id
from public.spaces s
where s.organization_id = p.organization_id
  and s.is_default = true
  and p.space_id is null;

-- 2c. Requests
update public.requests r
set space_id = s.id
from public.spaces s
where s.organization_id = r.organization_id
  and s.is_default = true
  and r.space_id is null;

-- 2d. POS
update public.pos_sessions ps
set space_id = s.id
from public.spaces s
where s.organization_id = ps.organization_id
  and s.is_default = true
  and ps.space_id is null;

update public.pos_transactions pt
set space_id = s.id
from public.spaces s
where s.organization_id = pt.organization_id
  and s.is_default = true
  and pt.space_id is null;

update public.pos_customers pc
set space_id = s.id
from public.spaces s
where s.organization_id = pc.organization_id
  and s.is_default = true
  and pc.space_id is null;

update public.pos_receipt_counters prc
set space_id = s.id
from public.spaces s
where s.organization_id = prc.organization_id
  and s.is_default = true
  and prc.space_id is null;

-- 2e. Audit logs
update public.audit_logs al
set space_id = s.id
from public.spaces s
where s.organization_id = al.organization_id
  and s.is_default = true
  and al.space_id is null;


-- ── 3. Owners get all_spaces = true ───────────────────────────────
-- Locked decision: owner default access = all spaces, changeable later.
update public.users
set all_spaces = true
where role = 'org_owner'
  and all_spaces = false;


-- ── 4. Admin/staff → Default space membership ─────────────────────
-- Each admin/staff in an org gets a row linking them to that org's
-- default space. Platform roles (super_admin / makhzoon_*) skipped
-- because they don't belong to a tenant org.
insert into public.space_members (organization_id, space_id, user_id, created_at)
select u.organization_id, s.id, u.id, now()
from public.users u
join public.spaces s
  on s.organization_id = u.organization_id
 and s.is_default = true
where u.role in ('admin', 'staff')
  and u.organization_id is not null
  and not exists (
    select 1 from public.space_members sm
    where sm.user_id = u.id and sm.space_id = s.id
  );


-- ═══════════════════════════════════════════════════════════════════
-- VERIFICATION — run these by hand to confirm the backfill worked.
-- Each should return zero / sensible counts.
-- ═══════════════════════════════════════════════════════════════════
-- 1. Every org has exactly one default space:
--    select organization_id, count(*)
--    from public.spaces where is_default = true
--    group by organization_id having count(*) <> 1;
--
-- 2. No space-scoped row left with NULL space_id (sample):
--    select 'assets' as t, count(*) from public.assets where space_id is null
--    union all select 'inventory_items', count(*) from public.inventory_items where space_id is null
--    union all select 'requests', count(*) from public.requests where space_id is null
--    union all select 'audit_logs', count(*) from public.audit_logs where space_id is null;
--
-- 3. Every org_owner has all_spaces = true:
--    select count(*) from public.users
--    where role = 'org_owner' and all_spaces = false;
--
-- 4. Every admin/staff has at least one membership:
--    select u.id, u.email
--    from public.users u
--    left join public.space_members sm on sm.user_id = u.id
--    where u.role in ('admin','staff') and sm.id is null;
-- ═══════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════
-- DONE. Foundation data is in place. Next:
--   • PR-2 (routing restructure) lands in the codebase.
--   • PR-3 (tenant context + repos) reads space_id.
--   • Script 3 (constraints + RLS) tightens the lock.
-- ═══════════════════════════════════════════════════════════════════
