# Unified Payments Module — Design

## Problem

Payment tracking is fragmented across the four Haraka verticals:

- `haraka_order_payments`, `haraka_appointment_payments`, `haraka_service_job_payments` — three near-identical append-only ledger tables, each with its own repository and its own duplicated `derivePaymentStatus` logic.
- Retainers have no ledger at all — `haraka_retainer_invoices` bakes payment state into single mutable `amount_paid`/`payment_status` columns, so a retainer invoice can't represent "paid partly by cash, partly still owed via insurance."
- Discounts exist as `discount_amount` on orders, appointments, and service jobs, but not on retainers.
- Total-due calculation is shared between orders/service-jobs (`lib/modules/haraka/pricing/calc.ts`) but reimplemented inline, separately, for appointments and retainers.
- There is no way to represent "this payment method still owes the rest" (e.g. an insurer owes the remainder of a co-pay) or to report on it — needed for the Zeyara clinic use case (insurance-covered visits) but generally useful (corporate accounts, installment plans, delayed bank transfers).

## Goals

- One shared `payments` ledger table across all four verticals, replacing the three duplicated tables and the retainer invoice's mutable fields.
- Any payment line can be split and independently marked `paid` / `unpaid` / `written_off`, regardless of payment method — no per-method configuration needed.
- Discounts available uniformly across all four verticals, applied at the entity level (not the payment level).
- One shared total-due and payment-status calculation, replacing the three duplicated implementations.
- Outstanding-balance reporting: total per payment method, aging (time since the unpaid line was created), and per-vertical breakdown — all statuses visible together, filterable by status.

## Data model

```sql
create table payments (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organizations(id),
  reference_type    text not null check (reference_type in ('order','appointment','job','retainer_invoice')),
  reference_id      uuid not null,
  amount            numeric(14,4) not null,
  payment_method    text not null,
  status            text not null check (status in ('paid','unpaid','written_off')) default 'paid',
  paid_at           timestamptz,          -- set only when status = 'paid'
  note              text,
  created_by        uuid references auth.users(id),
  created_at        timestamptz not null default now()
);

create index payments_reference_idx on payments (reference_type, reference_id);
create index payments_org_status_idx on payments (organization_id, status);
```

`reference_id` points at `haraka_orders.id` / `haraka_appointments.id` / `haraka_service_jobs.id` / `haraka_retainer_invoices.id` depending on `reference_type`. No DB-level FK constraint (polymorphic reference, per the earlier trade-off decision) — integrity enforced in the shared repository layer.

Discounts: `discount_amount numeric(14,4)` added to `haraka_retainer_invoices` (already present on the other three entities). Discount reduces the computed total; it never appears as a `payments` row.

## Shared logic

Two new functions in `lib/modules/haraka/pricing/calc.ts`, used by all four repositories (replacing the inline duplicates in appointments and retainers):

- `computeTotalDue(subtotal, taxAmount, discountAmount)` — total-due calculation.
- `derivePaymentStatus(totalDue, paidPayments)` — `unpaid` / `partial` / `paid`, computed from `sum(amount) where status='paid'` for the entity's payment rows.

## Migration & cutover

1. Create `payments` table; add `discount_amount` to `haraka_retainer_invoices`.
2. Backfill: one `payments` row per existing row in the three old ledger tables (`status='paid'`, `paid_at` copied). For retainer invoices with `amount_paid > 0`, insert one `payments` row (`reference_type='retainer_invoice'`, `status='paid'`); invoices with `amount_paid = 0` get no row.
3. Verify backfill row counts and `sum(amount)` match the old tables before proceeding.
4. Drop `haraka_order_payments`, `haraka_appointment_payments`, `haraka_service_job_payments`; drop `amount_paid`/`payment_status` from `haraka_retainer_invoices`.
5. Repoint all four repositories, and `transactions.repository.ts`'s `aggregate()`, at `payments` filtered by `reference_type`.

This is a hard cutover (old tables dropped, not kept as compatibility views), matching the big-bang rollout already chosen. Any code outside the four repositories that reads the old tables directly needs to be found and updated first — a full grep for those table/column names is a required implementation step before the drop migration is written.

## Reporting

Outstanding-balances view: all `payments` rows regardless of status, filterable by `status`, groupable by `payment_method`, `reference_type`, and age bucket (`now() - created_at` for `status='unpaid'` rows). Extends the existing `AggregateGroupBy` in `transactions.repository.ts`.

## Cross-session coordination

A concurrent session is building appointment-linked products with stock deduction gated on "appointment is paid." They were given the finalized `payments` schema and will read `exists (... where reference_type='appointment' and reference_id=... and status='paid')` instead of relying on the now-dropped `haraka_appointment_payments`.
