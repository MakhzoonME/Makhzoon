# Haraka — Retainers (العقود)

**Parent module**: Haraka (حركة) — Feature key: `pos`  
**Permission keys**: `pos.view_retainers`, `pos.manage_retainers`  
**Brand color**: `#C2185B` (inherited from Haraka)

---

## Overview

Retainers manage recurring billing contracts — monthly social media management, quarterly consulting retainers, annual maintenance contracts, or any subscription-like service engagement. Each retainer generates per-cycle invoice records that track payment independently.

Key characteristics:
- Each retainer has a `billing_cycle` (monthly, quarterly, annual) and an `amount_per_cycle` with an optional `tax_rate`.
- Invoices are created manually by the user per billing period (not automatically generated on a schedule).
- Invoice creation guards against duplicates for the same billing period.
- After each invoice is created, `next_billing_date` on the retainer advances by one billing cycle.
- Retainer status: `active | paused | cancelled | expired`. Expired is set when `end_date` passes today.
- Status transitions: `active ↔ paused`, `active/paused → cancelled`. `cancelled` and `expired` are terminal.

---

## Data Models

### HarakaRetainer
```
id, organizationId, spaceId
retainerNumber             ← sequential, e.g. RET-000001
name                       ← contract/service name, e.g. "Social Media Management"
customerId?, customerName, customerPhone?
staffMemberId?, staffMemberName?
billingCycle               ← monthly | quarterly | annual
amountPerCycle
taxRate                    ← decimal fraction (0.16 = 16%)
startDate, endDate?        ← endDate null = open-ended
status                     ← active | paused | cancelled | expired
nextBillingDate?           ← updated after each invoice creation
notes?
```

### HarakaRetainerInvoice (haraka_retainer_invoices)
One row per billing cycle.
```
id, retainerId, organizationId
invoiceNumber              ← e.g. RINV-2026-000001
billingPeriodStart, billingPeriodEnd
dueDate?
amount                     ← snapshot of amountPerCycle at invoice time
taxAmount, total
paymentStatus              ← unpaid | partial | paid
amountPaid, paymentMethod?, paidAt?
notes?
```

---

## Invoice Number Format

`RINV-YYYY-NNNNNN` — per org, per year. Allocated from `haraka_retainer_invoice_counters`.

Retainer numbers: `RET-NNNNNN` — per org, per space. Allocated from `haraka_retainer_counters`.

---

## Status Machine

```
active ◄──► paused
  │             │
  └─────────────┴──► cancelled (terminal)

expired (terminal — set when end_date < today)
```

Reactivating a cancelled retainer is not allowed.

---

## Key Files

| Layer | Path |
|---|---|
| DB migration | `supabase/migrations/0035_haraka_retainers.sql` |
| Types | `types/pos.types.ts` — `RetainerStatus`, `BillingCycle`, `HarakaRetainer`, `HarakaRetainerInvoice` |
| Repository | `lib/modules/haraka/retainers/retainers.repository.ts` |
| Service | `lib/modules/haraka/retainers/retainers.service.ts` |
| Schemas | `lib/modules/haraka/retainers/schemas.ts` |
| Numbering | `lib/modules/haraka/retainers/retainer-numbering.ts` |
| API list/create | `app/api/haraka/retainers/route.ts` |
| API detail | `app/api/haraka/retainers/[retainerId]/route.ts` |
| API status | `app/api/haraka/retainers/[retainerId]/status/route.ts` |
| API invoices | `app/api/haraka/retainers/[retainerId]/invoices/route.ts` |
| API invoice detail | `app/api/haraka/retainers/[retainerId]/invoices/[invoiceId]/route.ts` |
| Hook | `hooks/haraka/useRetainers.ts` |
| Status badge | `components/haraka/RetainerStatusBadge.tsx` |
| Invoice list | `components/haraka/RetainerInvoiceList.tsx` |
| List page | `app/[locale]/[orgSlug]/[space]/haraka/retainers/page.tsx` |
| New page | `app/[locale]/[orgSlug]/[space]/haraka/retainers/new/page.tsx` |
| Detail page | `app/[locale]/[orgSlug]/[space]/haraka/retainers/[retainerId]/page.tsx` |

---

## Managed Lists

| List key | Type | Purpose |
|---|---|---|
| `retainer_status` | SYSTEM | Status values |
| `retainer_billing_cycle` | SYSTEM | Billing cycle options |
