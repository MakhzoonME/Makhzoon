-- ── POS session till name ──────────────────────────────────────────────────
-- Sessions now capture a human-readable till/register name entered by the
-- cashier when opening a session (defaults client-side to "{name} till").

alter table public.pos_sessions
  add column if not exists till_name text;

-- Recreate the atomic open RPC with the extra till-name parameter. Drop the
-- previous signature first so PostgREST doesn't see two ambiguous overloads.
drop function if exists public.open_pos_session(uuid, uuid, uuid, text, text, numeric);

create or replace function public.open_pos_session(
  p_org_id        uuid,
  p_space_id      uuid,
  p_cashier_id    uuid,
  p_cashier_name  text,
  p_location_id   text,
  p_opening_float numeric,
  p_till_name     text default null
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
    cashier_id, cashier_name, till_name, status, opening_float
  ) values (
    p_org_id, p_space_id, p_location_id,
    p_cashier_id, p_cashier_name,
    nullif(btrim(coalesce(p_till_name, '')), ''),
    'open', p_opening_float
  )
  returning id into v_session_id;

  return v_session_id;
end;
$$;

revoke all on function public.open_pos_session(uuid, uuid, uuid, text, text, numeric, text)
  from public, anon, authenticated;
grant execute on function public.open_pos_session(uuid, uuid, uuid, text, text, numeric, text)
  to service_role;
