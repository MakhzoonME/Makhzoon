-- Per-organization display currency (defaults to JOD, the app-wide default).
alter table public.organizations
  add column if not exists currency text not null default 'JOD';
