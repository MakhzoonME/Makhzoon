# Zeyara (زيارة) — Clinic Vertical — Rebuild Design

Status: design only, not yet implemented.
Supersedes nothing; builds on the surviving
[2026-08-26-zeyara-clinic-vertical-design.md](./2026-08-26-zeyara-clinic-vertical-design.md),
which fully documents the original implementation. That implementation was
removed entirely in commit `5a394cc` ("remove Zeyara vertical entirely, keep
Haraka appointments as-is", 77 files, 4130 deletions). This document is a
**fresh implementation plan**, not a revert — written against current HEAD,
which has diverged from what Zeyara originally reused:

1. **Unified payments ledger** — appointments (and orders/service-jobs/
   retainers) now write to a shared `payments` table (`reference_type`/
   `reference_id`/`status` ∈ `paid`|`unpaid`|`written_off`) instead of the
   old `haraka_appointment_payments` table the original design references
   directly. See [2026-08-30-unified-payments-design.md](./2026-08-30-unified-payments-design.md).
2. **`haraka_appointment_products`** — products/medication dispensed during
   an appointment, with stock deduction/restock wired to payment status
   transitions. Built by a concurrent session after Zeyara's removal, with
   clinics as the explicit motivating example.
3. **Nav reorg** — the Haraka sidebar is now grouped into Operations/
   Records/Finance; Zeyara's nav entries need to slot into that grouping.
4. `lib/platform/verticals.ts` was stripped back to `haraka` only — no
   Zeyara references survive anywhere in the codebase (verified: clean grep
   across `lib/modules/document-reports`, `app/api`).

## 1. Vertical layer, entitlements, routes

`lib/platform/verticals.ts` gets a `Vertical = 'haraka' | 'zeyara'` registry
again:

```ts
export const VERTICALS: Record<Vertical, VerticalConfig> = {
  haraka: { featureKey: 'pos', permModule: 'haraka', segment: 'haraka', ... },
  zeyara: { featureKey: 'zeyara', permModule: 'zeyara', segment: 'zeyara',
            label: 'Zeyara', labelAr: 'زيارة', color: '#0F766E' },
};
```

`requireAnyVerticalFeature`/`hasVerticalPermission` gate shared routes
(appointments, services, customers, staff) on **either** vertical's feature
key — additive, every new branch is an `OR` over a namespace an existing
Haraka org doesn't hold, so its behavior is unchanged. Haraka-exclusive
routes (register, orders, warranty certs, cash drawer, service jobs) keep
the strict `pos` gate.

`ZeyaraPermissions` is its own namespace on `UserPermissions`: `view`,
`appointments*`, `patients*` (over `pos_customers`), `patientFields*`,
`serviceCatalog*`, `providers*`, `visits*`/`visitNotes*`/`visitAttachments*`,
`analyticsView`. Operation keys match Haraka's where the operation is
identical, so the vertical-OR gate resolves one op name against both
namespaces with no translation table.

Routes under `/[locale]/[orgSlug]/[space]/zeyara/`: dashboard, appointments
(list/new/[id]/calendar), patients, providers, services, visits, reports,
analytics — each a thin shell mounting `VerticalProvider vertical="zeyara"`
around the shared page bodies `/haraka/*` already uses. Nav entries slot
into the post-reorg Operations/Records/Finance grouping rather than the
flat list the original design assumed. Brand: `Zeyara / زيارة`,
`--mod-zeyara: #0F766E`.

## 2. Clinical data model

New tables — unchanged from the original design, since visits reference
appointments by id and never touch payments/products directly:

**`zeyara_visits`** — one clinical record per appointment:
```
id, organization_id, space_id
appointment_id → haraka_appointments(id) ON DELETE RESTRICT
customer_id → pos_customers(id), provider_id → haraka_staff(id)
visit_date, chief_complaint, findings, diagnosis, treatment_plan, follow_up_due
created_at/by, updated_at/by
```
`ON DELETE RESTRICT` matches the appointments service's existing refusal to
delete an invoiced appointment.

**`zeyara_visit_notes`** — append-only: `id, visit_id, organization_id, body,
author_id, author_name, created_at`.

**`zeyara_visit_attachments`**: `id, visit_id, organization_id, storage_path,
file_name, mime_type, size_bytes, uploaded_by, created_at`.

**Custom fields**: extend `custom_fields.module` CHECK with `'appointments'`
and `'visits'`; values stored through the existing
`custom_field_values(record_type, record_id, field_id, value)` join table —
reuses the whole Banna field-rendering stack with zero new rendering code.

**RLS**: identical shape to `haraka_appointments` — platform-admin all,
org-manager all, org-member select.

## 3. Products-in-visit, split-payment UI, reminders

**Products dispensed during a visit**: the visit record page gets a
"Products / Medication" section reading/writing `haraka_appointment_products`
via the linked appointment — no new schema, a clinic-framed view over the
existing appointment-level feature. Stock deduction/restock already works
via the existing trigger in `appointments.repository.ts`.

**Split/insurance-payment UI** — the actual payoff of the payments-ledger
project this design follows from. The appointment payment section (shared
with Haraka) gains:
- `addPayment` accepting a `status` parameter (today hardcoded to `'paid'`),
  so a payment line can be entered as `unpaid` (e.g. the insurer's share).
- A "settle" action: PATCH a specific payment row's status
  (`unpaid → paid` when the insurer pays, or `→ written_off` if denied).
- UI: a status badge per payment line; an "outstanding by method" total
  distinct from the existing paid/partial/unpaid appointment-level badge.

This lives in the shared appointment payment component, not a
Zeyara-specific one — Haraka orgs get it too, consistent with the "reuse
as-is" philosophy the original design established.

**Reminders/follow-ups**: reuses the existing WhatsApp transport
(`lib/notifications/channels/whatsapp.ts`), including the
`withoutAlreadyReminded()` dedup fix documented in the original design's
"what shipped differently" section — a real bug fix, carried forward as-is.

## 4. Rollout, migration, safety

**Migrations**: net-new only — `zeyara_visits`, `zeyara_visit_notes`,
`zeyara_visit_attachments`, plus the two `custom_fields`/
`custom_field_values` CHECK extensions. The `addPayment` status change is
code, not schema (`payments.status` already supports `unpaid`/`written_off`
from migration 0090). Independent of the still-pending Migration B (drop of
the old ledger tables) — Zeyara only ever touches payments through
`appointments.repository.ts`, already repointed. Sequenced *after* Migration
B ships and is verified, so clinic features aren't built atop an unverified
payments path.

**Feature flag**: every phase behind `features.zeyara`, off for every
existing org — `DevBranch` stays deployable throughout.

**Subscription/superadmin surface**: re-add the per-org Zeyara toggle on the
subscription page (the original design's §12 fix — `FEATURE_KEYS` had the
key but no UI rendered it); confirm whether `FEATURE_KEYS` itself survived
removal before implementing.

**Testing**: `tests/platform/zeyara-clinical.contract.test.ts` (deleted in
the removal commit) comes back, covering the vertical-OR gate, visit CRUD +
RLS, and the new split-payment status transitions.

## 5. Implementation sequencing

1. Vertical layer + permissions + nav + routes + brand, inert behind the flag.
2. Clinical tables + visit UI.
3. Custom fields on appointments/visits.
4. Products-in-visit + split-payment UI.
5. Reminders/follow-ups.

Each phase independently testable and deployable, matching the original's
phase boundaries.
