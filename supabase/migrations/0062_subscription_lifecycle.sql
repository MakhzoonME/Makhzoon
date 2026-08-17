-- ════════════════════════════════════════════════════════════════════════
-- 0062_subscription_lifecycle.sql
-- Adds the columns needed for real cancel / refund / scheduled-downgrade
-- lifecycle operations (status itself is free text already — ACTIVE, GRACE,
-- READ_ONLY, EXPIRED, SUSPENDED, CANCELLED; PENDING, PAID, OVERDUE,
-- READ_ONLY_TRIGGERED, REFUNDED, VOID — no DDL needed for the new values).
-- ════════════════════════════════════════════════════════════════════════

alter table public.subscriptions
  add column if not exists cancelled_at                timestamptz,
  add column if not exists cancel_reason                text,
  add column if not exists pending_package_id           uuid references public.packages(id),
  add column if not exists pending_change_effective_at  timestamptz;

alter table public.invoices
  add column if not exists refunded_at    timestamptz,
  add column if not exists refunded_by    uuid,
  add column if not exists refund_amount  numeric(14,4),
  add column if not exists refund_reason  text;
