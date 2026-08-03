-- Atomic POS sale completion.
--
-- Fixes an orphaned-transaction bug: TransactionsRepository.completeSale used
-- to (1) insert the pos_transactions row with status='completed' — which the
-- Supabase client commits immediately — and (2) *then* decrement stock via
-- separate inventory_apply_stock_out calls. When a line had insufficient stock
-- the code threw, the cashier saw "charge failed", but the already-committed
-- 'completed' row was never rolled back and lingered on the transactions page.
--
-- This function folds the insert + every stock-out into ONE plpgsql function,
-- which runs in a single transaction. inventory_apply_stock_out raises
-- INSUFFICIENT_STOCK / INVENTORY_ITEM_NOT_FOUND on failure; because that raise
-- propagates out of this function, the whole transaction — including the
-- pos_transactions insert — is rolled back. Either the sale is fully written
-- with all stock decremented, or nothing is written at all.
--
-- Pricing, validation and idempotency stay in the application layer; this
-- function receives already-computed values and performs only the atomic write.
--
-- Idempotent — safe to run on dev, staging, and production.

create or replace function public.haraka_complete_sale(
  p_tx          jsonb,   -- full pos_transactions insert payload (snake_case keys)
  p_stock_lines jsonb,   -- array of { item_id, qty, item_name } for stock items only
  p_actor       jsonb    -- { by, by_email, by_name, by_role }
)
returns public.pos_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx      public.pos_transactions;
  v_line    jsonb;
  v_receipt text := p_tx->>'receipt_number';
begin
  insert into public.pos_transactions (
    organization_id, space_id, session_id, location_id, cashier_id, cashier_name,
    customer_id, customer_name, items, subtotal, tax_amount, discount_amount,
    total, payments, change, status, receipt_number, offline_id, synced_at,
    parent_transaction_id, fawtara
  ) values (
    (p_tx->>'organization_id')::uuid,
    (p_tx->>'space_id')::uuid,
    nullif(p_tx->>'session_id', '')::uuid,
    coalesce(nullif(p_tx->>'location_id', ''), 'default'),
    nullif(p_tx->>'cashier_id', '')::uuid,
    p_tx->>'cashier_name',
    nullif(p_tx->>'customer_id', '')::uuid,
    p_tx->>'customer_name',
    coalesce(p_tx->'items', '[]'::jsonb),
    coalesce((p_tx->>'subtotal')::numeric, 0),
    coalesce((p_tx->>'tax_amount')::numeric, 0),
    coalesce((p_tx->>'discount_amount')::numeric, 0),
    coalesce((p_tx->>'total')::numeric, 0),
    coalesce(p_tx->'payments', '[]'::jsonb),
    coalesce((p_tx->>'change')::numeric, 0),
    coalesce(nullif(p_tx->>'status', ''), 'completed'),
    v_receipt,
    p_tx->>'offline_id',
    nullif(p_tx->>'synced_at', '')::timestamptz,
    nullif(p_tx->>'parent_transaction_id', '')::uuid,
    case when jsonb_typeof(p_tx->'fawtara') = 'object' then p_tx->'fawtara' else null end
  )
  returning * into v_tx;

  -- Decrement stock for each non-service line. Any raise here (INSUFFICIENT_STOCK
  -- or INVENTORY_ITEM_NOT_FOUND) aborts the whole function transaction, rolling
  -- back the insert above.
  for v_line in
    select value from jsonb_array_elements(coalesce(p_stock_lines, '[]'::jsonb))
  loop
    perform public.inventory_apply_stock_out(
      v_tx.organization_id,
      v_tx.space_id,
      (v_line->>'item_id')::uuid,
      (v_line->>'qty')::integer,
      v_line->>'item_name',
      'POS sale',
      'Receipt ' || coalesce(v_receipt, ''),
      'pos',
      v_tx.id,
      nullif(p_actor->>'by', '')::uuid,
      p_actor->>'by_email',
      p_actor->>'by_name',
      p_actor->>'by_role'
    );
  end loop;

  return v_tx;
end;
$$;

revoke all on function public.haraka_complete_sale(jsonb, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.haraka_complete_sale(jsonb, jsonb, jsonb)
  to service_role;
