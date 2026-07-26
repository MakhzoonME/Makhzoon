-- BUG-01: Replace non-atomic read-modify-write counters with atomic RPCs.
--
-- The existing codebase has six counters that use read-modify-write which can
-- produce duplicates under concurrency:
--   1. Receipt numbering (pos_receipt_counters)
--   2. Invoice numbering (fawtara_counters)
--   3. Inventory stock-in (inventory_transactions append)
--   4. Inventory stock adjustment (inventory_transactions append)
--   5. Stock-audit submitItem (stock_audits counters)
--   6. Single-open-session invariant (pos_sessions)
--
-- Migration 0016 already created inventory_apply_stock_out with FOR UPDATE.
-- This migration extends the pattern to all remaining counters.


-- ── 1. Atomic receipt number allocation ────────────────────────────────────
-- Uses INSERT … ON CONFLICT DO UPDATE to atomically increment the per-org
-- (per-space) receipt counter. Two concurrent callers never see the same value.
create or replace function public.next_receipt_number(
  p_org_id   uuid,
  p_space_id uuid
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next bigint;
begin
  insert into public.pos_receipt_counters
    (organization_id, space_id, last_receipt_number, updated_at)
  values
    (p_org_id, p_space_id, 1, now())
  on conflict (organization_id, space_id) do update
    set last_receipt_number = pos_receipt_counters.last_receipt_number + 1,
        updated_at = now()
  returning last_receipt_number into v_next;

  return v_next;
end;
$$;

revoke all on function public.next_receipt_number(uuid, uuid) from public, anon, authenticated;
grant execute on function public.next_receipt_number(uuid, uuid) to service_role;


-- ── 2. Atomic Fawtara invoice sequence ─────────────────────────────────────
-- Year-scoped: if the row's year matches p_year, increment; otherwise reset to 1.
create or replace function public.next_fawtara_sequence(
  p_org_id uuid,
  p_year   integer
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seq integer;
begin
  insert into public.fawtara_counters
    (organization_id, year, last_sequence, updated_at)
  values
    (p_org_id, p_year, 1, now())
  on conflict (organization_id) do update
    set last_sequence = case
                          when fawtara_counters.year = p_year
                            then fawtara_counters.last_sequence + 1
                          else 1
                        end,
        year = p_year,
        updated_at = now()
  returning last_sequence into v_seq;

  return v_seq;
end;
$$;

revoke all on function public.next_fawtara_sequence(uuid, integer) from public, anon, authenticated;
grant execute on function public.next_fawtara_sequence(uuid, integer) to service_role;


-- ── 3. Atomic stock-IN (mirror of inventory_apply_stock_out from 0016) ─────
-- Serializes via FOR UPDATE on inventory_items. Used for voids, refunds,
-- purchase receives, and manual stock-ins.
create or replace function public.inventory_apply_stock_in(
  p_org         uuid,
  p_space       uuid,
  p_item        uuid,
  p_qty         integer,
  p_item_name   text,
  p_reason      text,
  p_note        text,
  p_source      text,
  p_purchase_id uuid,
  p_pos_tx      uuid,
  p_by          uuid,
  p_by_email    text,
  p_by_name     text,
  p_by_role     text
) returns integer
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
    raise exception 'INVENTORY_ITEM_NOT_FOUND:%', p_item
      using errcode = 'no_data_found';
  end if;

  v_after := v_before + p_qty;

  insert into public.inventory_transactions (
    organization_id, space_id, item_id, item_name, type, quantity,
    quantity_before, quantity_after, reason, note, source,
    purchase_id, pos_transaction_id,
    performed_by, performed_by_email, performed_by_name, performed_by_role
  ) values (
    p_org, p_space, p_item, p_item_name, 'in', p_qty,
    v_before, v_after, p_reason, p_note, p_source,
    p_purchase_id, p_pos_tx,
    p_by, p_by_email, p_by_name, p_by_role
  );

  update public.inventory_items
     set stock_status = case
           when v_after = 0 then 'out'
           when v_after < v_threshold then 'low'
           else 'ok'
         end,
         updated_by      = p_by,
         updated_by_email = p_by_email,
         updated_by_name  = p_by_name
   where id = p_item;

  return v_after;
end;
$$;

grant execute on function public.inventory_apply_stock_in(
  uuid, uuid, uuid, integer, text, text, text, text, uuid, uuid, uuid, text, text, text
) to authenticated, service_role;


-- ── 4. Atomic stock ADJUSTMENT (audit reconciliation) ─────────────────────
-- Sets stock to an absolute target value. Serializes via FOR UPDATE.
create or replace function public.inventory_apply_stock_adjust(
  p_org       uuid,
  p_space     uuid,
  p_item      uuid,
  p_target    integer,
  p_item_name text,
  p_reason    text,
  p_note      text,
  p_by        uuid,
  p_by_email  text,
  p_by_name   text,
  p_by_role   text
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before    integer;
  v_threshold integer;
begin
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
    raise exception 'INVENTORY_ITEM_NOT_FOUND:%', p_item
      using errcode = 'no_data_found';
  end if;

  insert into public.inventory_transactions (
    organization_id, space_id, item_id, item_name, type, quantity,
    quantity_before, quantity_after, reason, note,
    performed_by, performed_by_email, performed_by_name, performed_by_role
  ) values (
    p_org, p_space, p_item, p_item_name, 'adjustment', p_target,
    v_before, p_target, p_reason, p_note,
    p_by, p_by_email, p_by_name, p_by_role
  );

  update public.inventory_items
     set stock_status = case
           when p_target = 0 then 'out'
           when p_target < v_threshold then 'low'
           else 'ok'
         end,
         updated_by      = p_by,
         updated_by_email = p_by_email,
         updated_by_name  = p_by_name
   where id = p_item;

  return p_target;
end;
$$;

grant execute on function public.inventory_apply_stock_adjust(
  uuid, uuid, uuid, integer, text, text, text, uuid, text, text, text
) to authenticated, service_role;


-- ── 5. Atomic stock-audit submitItem ───────────────────────────────────────
-- Serializes via advisory lock on audit_id. Atomically updates both the
-- audit-item row and the parent audit's counters (counted_count, pending_count,
-- variance_total) in one transaction.
create or replace function public.submit_stock_audit_item(
  p_audit_id     uuid,
  p_audit_item_id uuid,
  p_counted_qty  numeric,
  p_note         text,
  p_user_id      uuid,
  p_user_name    text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item          record;
  v_audit         record;
  v_expected      numeric;
  v_prev_counted  numeric;
  v_was_counted   boolean;
  v_new_counted   integer;
  v_new_pending   integer;
  v_prev_abs      numeric;
  v_next_abs      numeric;
  v_new_variance  numeric;
  v_now           timestamptz;
begin
  -- Serialize all submits for the same audit to prevent counter drift.
  perform pg_advisory_xact_lock(hashtext('stock_audit:' || p_audit_id::text));

  select status, expected_quantity, counted_quantity
  into v_item
  from public.stock_audit_items
  where id = p_audit_item_id;

  select counted_count, pending_count, variance_total, status, organization_id
  into v_audit
  from public.stock_audits
  where id = p_audit_id;

  if v_item is null or v_audit is null then
    raise exception 'Not found';
  end if;

  if v_audit.status = 'completed' then
    raise exception 'Audit already completed';
  end if;

  v_expected     := coalesce(v_item.expected_quantity, 0);
  v_prev_counted := v_item.counted_quantity;
  v_was_counted  := v_item.status = 'counted';

  v_new_counted := coalesce(v_audit.counted_count, 0)
                   + case when v_was_counted then 0 else 1 end;
  v_new_pending := coalesce(v_audit.pending_count, 0)
                   + case when v_was_counted then 0 else -1 end;

  v_prev_abs := case
                  when v_was_counted and v_prev_counted is not null
                    then abs(v_prev_counted - v_expected)
                  else 0
                end;
  v_next_abs := abs(p_counted_qty - v_expected);
  v_new_variance := coalesce(v_audit.variance_total, 0) - v_prev_abs + v_next_abs;

  v_now := now();

  update public.stock_audit_items set
    counted_quantity = p_counted_qty,
    note             = p_note,
    status           = 'counted',
    checked_at       = v_now,
    checked_by       = p_user_id,
    checked_by_name  = p_user_name
  where id = p_audit_item_id;

  update public.stock_audits set
    counted_count  = v_new_counted,
    pending_count  = v_new_pending,
    variance_total = v_new_variance,
    updated_by     = p_user_id
  where id = p_audit_id;
end;
$$;

revoke all on function public.submit_stock_audit_item(uuid, uuid, numeric, text, uuid, text)
  from public, anon, authenticated;
grant execute on function public.submit_stock_audit_item(uuid, uuid, numeric, text, uuid, text)
  to service_role;


-- ── 6. Atomic session open (single-open-session invariant) ─────────────────
-- Advisory-locks on the cashier identity, checks for an existing open session,
-- and inserts atomically. Prevents two concurrent opens from creating two
-- sessions for the same cashier.
create or replace function public.open_pos_session(
  p_org_id        uuid,
  p_space_id      uuid,
  p_cashier_id    uuid,
  p_cashier_name  text,
  p_location_id   text,
  p_opening_float numeric
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_existing   uuid;
begin
  -- Serialize session opens per cashier.
  perform pg_advisory_xact_lock(hashtext('pos_session:' || p_cashier_id::text));

  select id into v_existing
  from public.pos_sessions
  where organization_id = p_org_id
    and cashier_id = p_cashier_id
    and status = 'open'
    and (space_id = p_space_id or (space_id is null and p_space_id is null))
  limit 1;

  if v_existing is not null then
    raise exception 'OPEN_SESSION_EXISTS'
      using hint = 'Close your current session before opening a new one.';
  end if;

  insert into public.pos_sessions (
    organization_id, space_id, location_id,
    cashier_id, cashier_name, status, opening_float
  ) values (
    p_org_id, p_space_id, p_location_id,
    p_cashier_id, p_cashier_name, 'open', p_opening_float
  )
  returning id into v_session_id;

  return v_session_id;
end;
$$;

revoke all on function public.open_pos_session(uuid, uuid, uuid, text, text, numeric)
  from public, anon, authenticated;
grant execute on function public.open_pos_session(uuid, uuid, uuid, text, text, numeric)
  to service_role;
