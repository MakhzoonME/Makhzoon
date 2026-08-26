-- ════════════════════════════════════════════════════════════════════════
-- 0078_unify_payment_methods.sql
-- Collapse order_payment_method + service_job_payment_method (and the
-- previously code-only POS tender set) into one shared, org-configurable
-- managed list: payment_method. Orgs now add a payment method once (e.g. an
-- insurance company name) and it shows up in Orders, Service Jobs,
-- Appointments, Retainers, and the POS register alike.
--
-- 'cash' and 'card' stay is_system = true — POS cash-drawer reconciliation,
-- the card terminal integration, and the Fawtara e-invoicing mapper all key
-- off those two literal values. Everything else is a free label.
-- ════════════════════════════════════════════════════════════════════════

insert into public.platform_list_items (list_key, value, label, label_ar, color, sort_order, is_system) values
  ('payment_method', 'cash',          'Cash',          'نقدي',        '#22c55e', 1, true),
  ('payment_method', 'card',          'Card',          'بطاقة',       '#3b82f6', 2, true),
  ('payment_method', 'bank_transfer', 'Bank Transfer', 'تحويل بنكي',  null,      3, false),
  ('payment_method', 'cliq',          'CliQ',          'كليك',        '#a855f7', 4, false),
  ('payment_method', 'other',         'Other',         'أخرى',        '#9ca3af', 5, false)
on conflict (list_key, value) do nothing;

-- Carry over org customizations (relabels, reorders, custom additions like a
-- previously-added insurer name) from the two old lists onto the unified one.
-- service_job_payment_method migrates first since it was already the
-- org-extensible list; order_payment_method fills in anything left over,
-- skipping values that would collide.
update public.org_list_items
   set list_key = 'payment_method'
 where list_key = 'service_job_payment_method'
   and not exists (
     select 1 from public.org_list_items x
      where x.organization_id = org_list_items.organization_id
        and x.list_key = 'payment_method'
        and x.value = org_list_items.value
   );

update public.org_list_items
   set list_key = 'payment_method'
 where list_key = 'order_payment_method'
   and not exists (
     select 1 from public.org_list_items x
      where x.organization_id = org_list_items.organization_id
        and x.list_key = 'payment_method'
        and x.value = org_list_items.value
   );

-- Anything left under the old keys couldn't move without colliding — drop it,
-- the value is already represented under payment_method for that org.
delete from public.org_list_items where list_key in ('service_job_payment_method', 'order_payment_method');

-- The old platform catalog rows are superseded by the seed above.
delete from public.platform_list_items where list_key in ('service_job_payment_method', 'order_payment_method');
