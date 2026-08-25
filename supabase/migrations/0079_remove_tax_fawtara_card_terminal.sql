-- ════════════════════════════════════════════════════════════════════════
-- 0079_remove_tax_fawtara_card_terminal.sql
-- Removes the tax-rate, JoFotara/Fawtara e-invoicing, and card-terminal
-- features entirely — app code, UI, and API routes were removed in the same
-- change. This permanently drops any existing tax rate, Fawtara config/
-- submission, and card-terminal data for all organizations. Idempotent —
-- safe to replay.
-- ════════════════════════════════════════════════════════════════════════

-- ── haraka_complete_sale: drop the tax_amount / fawtara columns from the
-- atomic sale-completion insert before the columns themselves go away.
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
    customer_id, customer_name, items, subtotal, discount_amount,
    total, payments, change, status, receipt_number, offline_id, synced_at,
    parent_transaction_id, discount_approved_by, discount_approved_by_name
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
    coalesce((p_tx->>'discount_amount')::numeric, 0),
    coalesce((p_tx->>'total')::numeric, 0),
    coalesce(p_tx->'payments', '[]'::jsonb),
    coalesce((p_tx->>'change')::numeric, 0),
    coalesce(nullif(p_tx->>'status', ''), 'completed'),
    v_receipt,
    p_tx->>'offline_id',
    nullif(p_tx->>'synced_at', '')::timestamptz,
    nullif(p_tx->>'parent_transaction_id', '')::uuid,
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

-- ── Fawtara invoice-numbering function (0047) — dead now that fawtara_counters goes away
drop function if exists public.next_fawtara_sequence(uuid, integer);

-- ── Tables ───────────────────────────────────────────────────────────────
drop table if exists public.tax_rates cascade;
drop table if exists public.fawtara_counters cascade;
drop table if exists public.organizations_private cascade;
drop table if exists public.haraka_card_charges cascade;
drop table if exists public.haraka_card_terminal_config cascade;

-- ── Columns ──────────────────────────────────────────────────────────────
alter table public.inventory_items drop column if exists tax_rate_id;
alter table public.haraka_services drop column if exists tax_rate_id;
alter table public.organizations drop column if exists fawtara;
alter table public.pos_transactions drop column if exists tax_amount;
alter table public.pos_transactions drop column if exists fawtara;
alter table public.haraka_orders drop column if exists tax_amount;
alter table public.haraka_retainer_invoices drop column if exists tax_amount;
alter table public.haraka_service_jobs drop column if exists tax_amount;
alter table public.haraka_appointments drop column if exists tax_amount;
alter table public.haraka_retainers drop column if exists tax_rate;
alter table public.haraka_service_job_items drop column if exists tax_rate;
alter table public.haraka_appointments drop column if exists tax_rate;
