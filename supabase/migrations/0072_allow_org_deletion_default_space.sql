-- The spaces_no_delete_default trigger (scripts/spaces/03_constraints_rls.sql)
-- blocks deleting a default space unconditionally. That also blocks the
-- ON DELETE CASCADE from organizations -> spaces when an org is deleted,
-- aborting the whole DELETE FROM organizations transaction with a
-- "default space cannot be deleted" error.
--
-- Only block the delete while the parent organization still exists; allow
-- it once the org row is already gone (i.e. we're mid-cascade from an
-- organization delete, in the same transaction).

create or replace function public.prevent_default_space_delete()
returns trigger language plpgsql as $$
begin
  if old.is_default and exists (
    select 1 from public.organizations where id = old.organization_id
  ) then
    raise exception 'The default space (% / %) cannot be deleted.', old.organization_id, old.slug
      using errcode = 'restrict_violation';
  end if;
  return old;
end $$;
