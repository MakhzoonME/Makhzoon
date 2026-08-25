-- usage_counter_sync's DELETE path upserts into usage_counters unconditionally.
-- When an organization is deleted, ON DELETE CASCADE removes its assets/
-- inventory_items/users rows first, firing this AFTER DELETE trigger, which
-- then tries to upsert usage_counters for an organization_id that no longer
-- exists in public.organizations — violating usage_counters' own FK and
-- aborting the whole DELETE FROM organizations transaction.
--
-- Skip the upsert when the organization is already gone; usage_counters
-- itself cascade-deletes with the org, so there's nothing to sync.

create or replace function public.usage_counter_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_col   text := TG_ARGV[0];
  v_org   uuid;
  v_delta int;
begin
  if TG_OP = 'INSERT' then
    v_org := NEW.organization_id; v_delta := 1;
  elsif TG_OP = 'DELETE' then
    v_org := OLD.organization_id; v_delta := -1;
  else
    return null;
  end if;

  if v_org is null then
    return coalesce(NEW, OLD);
  end if;

  if TG_OP = 'DELETE' and not exists (
    select 1 from public.organizations where id = v_org
  ) then
    return OLD;
  end if;

  execute format(
    'insert into public.usage_counters (organization_id, %1$I, updated_at)
       values ($1, greatest($2, 0), now())
     on conflict (organization_id) do update
       set %1$I = greatest(public.usage_counters.%1$I + $2, 0),
           updated_at = now()',
    v_col)
  using v_org, v_delta;

  return coalesce(NEW, OLD);
end;
$$;
