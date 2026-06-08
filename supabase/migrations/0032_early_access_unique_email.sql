-- Remove duplicate early_access rows, keeping the earliest per email,
-- then add a unique constraint so the DB enforces it going forward.

delete from public.early_access
where id not in (
  select distinct on (email) id
  from public.early_access
  order by email, created_at asc
);

alter table public.early_access
  add constraint early_access_email_unique unique (email);
