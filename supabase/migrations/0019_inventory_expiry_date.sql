-- Add expiry_date to inventory_items
alter table public.inventory_items
  add column if not exists expiry_date date;
