-- ════════════════════════════════════════════════════════════════════════
-- 0052_invoices.sql
-- Calculated subscription invoices (distinct from payment_logs, which records
-- payments received). Written by /api/cron/monthly-billing; a human marks an
-- invoice PAID via the superadmin UI. Replay-safe.
-- ════════════════════════════════════════════════════════════════════════
create table if not exists public.invoices (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references public.organizations(id) on delete cascade,
  subscription_id          uuid references public.subscriptions(id) on delete set null,
  period_start             timestamptz not null,
  period_end               timestamptz not null,
  line_items               jsonb not null default '[]'::jsonb,
  subtotal                 numeric(14,4) not null default 0,
  founding_cohort_discount numeric(14,4) not null default 0,
  total                    numeric(14,4) not null default 0,
  currency                 text not null default 'JOD',
  due_date                 timestamptz not null,
  grace_deadline           timestamptz not null,
  status                   text not null default 'PENDING',
  payment_method           text,
  paid_at                  timestamptz,
  marked_paid_by           uuid,
  created_at               timestamptz not null default now()
);

create index if not exists invoices_org_idx on public.invoices (organization_id);
create index if not exists invoices_status_idx on public.invoices (status);
create index if not exists invoices_grace_idx on public.invoices (grace_deadline);
-- One invoice per subscription billing period (guards the cron against dupes).
create unique index if not exists invoices_sub_period_uidx
  on public.invoices (subscription_id, period_start);

alter table public.invoices enable row level security;

drop policy if exists invoices_platform_all on public.invoices;
create policy invoices_platform_all on public.invoices
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());

drop policy if exists invoices_org_read on public.invoices;
create policy invoices_org_read on public.invoices
  for select using (public.belongs_to_org(organization_id));
