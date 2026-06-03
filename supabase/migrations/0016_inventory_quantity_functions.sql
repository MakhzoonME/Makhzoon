-- Inventory quantity helpers. Quantity is ledger-derived (the latest
-- inventory_transactions.quantity_after per item), which previously forced the
-- app to scan the entire ledger to render a list and made concurrent POS sales
-- racy. These two functions move both concerns into the database.
--
-- Idempotent — safe to run on dev, staging, and production.

-- ── Read: latest quantity per item, one bounded row each ───────────────────
-- Replaces the unbounded `.in(ids).order()` full-ledger fetch in the inventory
-- list. Uses the existing (item_id, performed_at desc) index, so each item
-- resolves with an index seek. Items with no ledger rows are simply absent
-- from the result; the caller falls back to their cached quantity_on_hand.
create or replace function public.inventory_latest_quantities(item_ids uuid[])
returns table (item_id uuid, quantity integer)
language sql
stable
security definer
set search_path = public
as $$
  select distinct on (t.item_id) t.item_id, t.quantity_after as quantity
  from public.inventory_transactions t
  where t.item_id = any(item_ids)
  order by t.item_id, t.performed_at desc
$$;

grant execute on function public.inventory_latest_quantities(uuid[]) to authenticated, service_role;

-- ── Write: atomic stock-out for a single line ──────────────────────────────
-- Locks the inventory_items row (`for update`) before reading the current
-- quantity and inserting the OUT ledger row, so two concurrent sales of the
-- same item cannot both pass the stock check and oversell. Returns the new
-- on-hand quantity, or raises 'INSUFFICIENT_STOCK:<item>' if the sale would
-- drive stock negative.
--
-- INTEGRATION NOTE: this is the race-free replacement for the per-line ledger
-- insert in TransactionsRepository.completeSale (and the void/refund inverse).
-- Wiring the hot path to call this requires a staging smoke test of the POS
-- sale flow before relying on it; until then the function is available but the
-- application continues to use its existing (documented "acceptable for v1")
-- read-modify-write path.
create or replace function public.inventory_apply_stock_out(
  p_org       uuid,
  p_space     uuid,
  p_item      uuid,
  p_qty       integer,
  p_item_name text,
  p_reason    text,
  p_note      text,
  p_source    text,
  p_pos_tx    uuid,
  p_by        uuid,
  p_by_email  text,
  p_by_name   text,
  p_by_role   text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before    integer;
  v_after     integer;
  v_threshold integer;
begin
  -- Serialize concurrent mutations of this item.
  perform 1 from public.inventory_items where id = p_item for update;

  select
    coalesce(
      (select t.quantity_after
         from public.inventory_transactions t
        where t.item_id = p_item
        order by t.performed_at desc
        limit 1),
      i.quantity_on_hand),
    i.minimum_threshold
  into v_before, v_threshold
  from public.inventory_items i
  where i.id = p_item;

  if v_before is null then
    raise exception 'INVENTORY_ITEM_NOT_FOUND:%', p_item using errcode = 'no_data_found';
  end if;

  v_after := v_before - p_qty;
  if v_after < 0 then
    raise exception 'INSUFFICIENT_STOCK:%', p_item using errcode = 'check_violation';
  end if;

  insert into public.inventory_transactions (
    organization_id, space_id, item_id, item_name, type, quantity,
    quantity_before, quantity_after, reason, note, source,
    pos_transaction_id, performed_by, performed_by_email, performed_by_name, performed_by_role
  ) values (
    p_org, p_space, p_item, p_item_name, 'out', p_qty,
    v_before, v_after, p_reason, p_note, p_source,
    p_pos_tx, p_by, p_by_email, p_by_name, p_by_role
  );

  update public.inventory_items
     set stock_status = case
           when v_after = 0 then 'out'
           when v_after < v_threshold then 'low'
           else 'ok'
         end,
         updated_by = p_by
   where id = p_item;

  return v_after;
end;
$$;

grant execute on function public.inventory_apply_stock_out(
  uuid, uuid, uuid, integer, text, text, text, text, uuid, uuid, text, text, text
) to authenticated, service_role;
