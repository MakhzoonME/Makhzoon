-- Customer share token for orders (read-only tracking link)
--
-- The existing delivery_token powers the interactive "Share internally" link
-- (driver/staff can advance status and record payments via /delivery/[token]).
-- This adds a SEPARATE customer_token that powers a read-only "Share with
-- customer" link (/track/[token]) where the customer can view status, items,
-- totals and payment breakdown but cannot take any action.
--
-- Kept independent from delivery_token so both links can be shared and revoked
-- on their own lifecycle, and so a customer link can never be escalated to the
-- driver's mutation routes (those look up delivery_token only).

alter table haraka_orders
  add column if not exists customer_token            text,
  add column if not exists customer_token_expires_at timestamptz,
  add column if not exists customer_token_revoked_at timestamptz;

-- Unique constraint on customer_token (idempotent guard).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'haraka_orders_customer_token_key'
  ) then
    alter table haraka_orders
      add constraint haraka_orders_customer_token_key unique (customer_token);
  end if;
end $$;

create index if not exists haraka_orders_customer_token_idx
  on haraka_orders (customer_token);
