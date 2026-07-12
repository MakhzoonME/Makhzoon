-- Distinguish stock-tracked products from non-stock services in Raseed.
-- Services skip quantity/threshold/reorder/stock-status tracking entirely.
alter table public.inventory_items
  add column if not exists item_type text not null default 'product'
    check (item_type in ('product', 'service'));

create index if not exists idx_inventory_items_item_type
  on public.inventory_items (organization_id, item_type);
