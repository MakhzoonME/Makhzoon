-- ── 0011: inventory_storage_location managed list ──────────────────────────
-- Adds a new Bucket A (free, editable) managed list dedicated to the
-- "Storage Location" dropdown on inventory items. Separate from the existing
-- `location` list (which is used for asset locations like "Main Office").
--
-- Seeded with a small, generic starter set. Orgs can edit/disable/add their
-- own entries from /settings/lists. Re-running this migration is safe — the
-- ON CONFLICT clause makes the inserts idempotent.

insert into public.platform_list_items
  (list_key, value, label, label_ar, color, sort_order, is_system)
values
  ('inventory_storage_location', 'Warehouse',      'Warehouse',      'المستودع',         null, 1, false),
  ('inventory_storage_location', 'Storage Room A', 'Storage Room A', 'غرفة التخزين أ',   null, 2, false),
  ('inventory_storage_location', 'Storage Room B', 'Storage Room B', 'غرفة التخزين ب',   null, 3, false),
  ('inventory_storage_location', 'Front Shelf',    'Front Shelf',    'الرف الأمامي',     null, 4, false),
  ('inventory_storage_location', 'Back Storage',   'Back Storage',   'المخزن الخلفي',    null, 5, false)
on conflict (list_key, value) do nothing;
