-- ════════════════════════════════════════════════════════════════════════
-- 0056_discount_approval.sql
-- Discount-approval PIN feature: staff holding haraka.approveDiscount each
-- set their own 4-digit PIN (bcrypt-hashed, same pattern as
-- haraka_cash_drawer_config.pin_hash — see 0027). A cashier who applies a
-- discount but lacks approveDiscount must supply an approver's PIN at
-- checkout; the completed sale records which approver authorized it.
-- Idempotent — safe to replay.
-- ════════════════════════════════════════════════════════════════════════

alter table public.users
  add column if not exists discount_pin_hash text;

alter table public.pos_transactions
  add column if not exists discount_approved_by      uuid references public.users(id) on delete set null,
  add column if not exists discount_approved_by_name  text;

-- Re-create haraka_complete_sale (0055) with the two new columns added to
-- the insert list. Everything else is unchanged from 0055.
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
    parent_transaction_id, fawtara, discount_approved_by, discount_approved_by_name
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
    case when jsonb_typeof(p_tx->'fawtara') = 'object' then p_tx->'fawtara' else null end,
    nullif(p_tx->>'discount_approved_by', '')::uuid,
    p_tx->>'discount_approved_by_name'
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
