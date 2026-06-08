# Haraka — Service Jobs (الخدمات)

**Parent module**: Haraka (حركة) — Feature key: `pos`  
**Permission keys**: `pos.view_service_jobs`, `pos.manage_service_jobs`  
**Brand color**: `#C2185B` (inherited from Haraka)

---

## Overview

Service Jobs covers single-engagement service businesses — repair shops, salons, consultants, field service companies (AC, cleaning, plumbing), marketing agencies, and any business that sells a service rather than a physical product.

Unlike orders (which are tied to inventory items), service job line items are **free-text**. There is no inventory catalog involved. Financial calculations (tax, discount, totals) use the same `priceCart()` engine as the POS register and orders.

Key characteristics:
- Service lines are named by the user — no inventory ID, no stock tracking.
- Status machine: `new → confirmed → in_progress → done | cancelled`.
- Invoice generation: once a job reaches `done`, a `SVI-YYYY-NNNNNN` invoice number can be allocated. The document is shareable via a public URL.
- Payment tracking uses the same split-payment pattern as orders (`haraka_service_job_payments` sub-table).
- `service_type` is a free tag from the `service_job_type` managed list (repair, appointment, professional, field, campaign, other). Orgs can add custom types.
- `scheduled_at` is optional — used for appointment-based and field service jobs.
- `service_address` is optional — used for field service jobs (same shape as `delivery_address` on orders).

---

## Data Models

### HarakaServiceJob
```
id, organizationId, spaceId
jobNumber                     ← sequential, e.g. SVC-000042
invoiceNumber?                ← e.g. SVI-2026-000001 (allocated on demand, only when status = done)
serviceType?                  ← free tag from service_job_type managed list
status                        ← new | confirmed | in_progress | done | cancelled
customerId?, customerName, customerPhone?
staffMemberId?, staffMemberName?
items: ServiceLine[]          ← free-text service lines (no inventoryItemId)
subtotal, discountAmount, taxAmount, total
paymentStatus                 ← unpaid | partial | paid
amountPaid, paymentMethod?
scheduledAt?                  ← optional datetime
serviceAddress?               ← { street, area, city, notes } — optional
notes?
```

### ServiceLine
```
name            ← required, free text
description?    ← optional detail text
quantity
unitPrice
taxRate         ← decimal fraction (0.16 = 16%)
taxAmount       ← computed
discountAmount  ← absolute amount
lineTotal       ← computed
```

### HarakaServiceJobPayment (haraka_service_job_payments)
One row per payment entry. Same pattern as `haraka_order_payments`.
```
id, jobId, organizationId, amount, paymentMethod?, note?, paidAt, createdBy
```

---

## Status Machine

```
new ──────► confirmed ──────► in_progress ──────► done
│           │                 │
└──────────►│◄───────────────►│◄── cancelled (from any non-terminal state)
```

Terminal states: `done`, `cancelled`.

---

## Invoice Generation

Invoices are generated on demand by calling `POST /api/haraka/service-jobs/[jobId]/invoice`.

- Only allowed when `status === 'done'`.
- Idempotent: if an invoice number is already allocated, the same number is returned.
- Invoice number format: `SVI-YYYY-NNNNNN` (per org, per year), allocated from `haraka_service_invoice_counters`.
- Public URL: `/service-job-invoice/[orgSlug]/[jobId]` — renders `ServiceJobInvoicePreview` with org branding (no auth required).

Document config is stored in `organization_configs.service_job_document_config` (JSONB). Keys:
- `invoiceTitle` (default: "SERVICE INVOICE")
- `showServiceType`, `showStaffMember`, `showServiceAddress` (all default `true`)
- `termsText`, `thankYouText`

---

## Key Files

| Layer | Path |
|---|---|
| DB migration | `supabase/migrations/0034_haraka_service_jobs.sql` |
| Types | `types/pos.types.ts` — `ServiceJobStatus`, `ServiceLine`, `HarakaServiceJob` |
| Repository | `lib/modules/haraka/service-jobs/service-jobs.repository.ts` |
| Service | `lib/modules/haraka/service-jobs/service-jobs.service.ts` |
| Schemas | `lib/modules/haraka/service-jobs/schemas.ts` |
| Invoice numbering | `lib/modules/haraka/service-jobs/invoice-numbering.ts` |
| Document config | `lib/modules/haraka/service-jobs/service-job-document-config.ts` |
| Document loader | `lib/modules/haraka/service-jobs/service-job-document-loader.ts` |
| API list/create | `app/api/haraka/service-jobs/route.ts` |
| API detail | `app/api/haraka/service-jobs/[jobId]/route.ts` |
| API status | `app/api/haraka/service-jobs/[jobId]/status/route.ts` |
| API invoice | `app/api/haraka/service-jobs/[jobId]/invoice/route.ts` |
| API payments | `app/api/haraka/service-jobs/[jobId]/payments/route.ts` |
| Hook | `hooks/haraka/useServiceJobs.ts` |
| Status badge | `components/haraka/ServiceJobStatusBadge.tsx` |
| Line editor | `components/haraka/ServiceLineEditor.tsx` |
| Payments panel | `components/haraka/ServiceJobPaymentsPanel.tsx` |
| Invoice dialog | `components/haraka/ServiceJobInvoiceDialog.tsx` |
| Invoice preview | `components/haraka/ServiceJobInvoicePreview.tsx` |
| List page | `app/[locale]/[orgSlug]/[space]/haraka/service-jobs/page.tsx` |
| New page | `app/[locale]/[orgSlug]/[space]/haraka/service-jobs/new/page.tsx` |
| Detail page | `app/[locale]/[orgSlug]/[space]/haraka/service-jobs/[jobId]/page.tsx` |
| Public invoice | `app/service-job-invoice/[orgSlug]/[jobId]/page.tsx` |

---

## Managed Lists

| List key | Type | Purpose |
|---|---|---|
| `service_job_status` | SYSTEM | Status values — cannot add/remove |
| `service_job_type` | FREE | Service categories — org can add custom types |
| `service_job_payment_method` | SYSTEM | Payment methods |
