-- Managed list for POS Services catalog categories (FREE list — org can add
-- custom categories, same model as inventory_category).
INSERT INTO platform_list_items (list_key, value, label, label_ar, color, sort_order, is_system) VALUES
  ('service_category', 'General',    'General',    'عام',      null, 1, false),
  ('service_category', 'Delivery',   'Delivery',   'توصيل',    null, 2, false),
  ('service_category', 'Repair',     'Repair',     'إصلاح',    null, 3, false),
  ('service_category', 'Consulting', 'Consulting', 'استشارات', null, 4, false)
ON CONFLICT (list_key, value) DO NOTHING;
