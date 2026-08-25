-- ════════════════════════════════════════════════════════════════════════
-- 0074_configurable_appointment_status.sql
-- Makes appointment_status a fully org-configurable list: orgs can add,
-- rename, reorder, and disable statuses (not just relabel/recolor).
--
-- Behavior that used to be hardcoded to the 5 built-in status codes
-- (invoicing trigger, calendar-slot blocking, edit lock) becomes per-status
-- flags on the list item instead, so custom statuses can opt into the same
-- behavior.
-- ════════════════════════════════════════════════════════════════════════

alter table public.platform_list_items
  add column if not exists is_invoicing_trigger boolean not null default false,
  add column if not exists is_blocking           boolean not null default false,
  add column if not exists is_terminal           boolean not null default false;

alter table public.org_list_items
  add column if not exists is_invoicing_trigger boolean,
  add column if not exists is_blocking           boolean,
  add column if not exists is_terminal           boolean;

-- appointment_status becomes a FREE list: orgs may add/remove/reorder items,
-- not just relabel/recolor the 5 built-ins.
update public.platform_list_items
   set is_system = false
 where list_key = 'appointment_status';

-- Set the flags on the 5 built-in defaults to match today's hardcoded rules.
update public.platform_list_items set
  is_invoicing_trigger = (value = 'completed'),
  is_blocking           = (value in ('scheduled', 'confirmed', 'completed')),
  is_terminal            = (value in ('completed', 'cancelled', 'no_show'))
where list_key = 'appointment_status';
