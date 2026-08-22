# Haraka — Appointments (المواعيد)

**Parent module**: Haraka (حركة) — Feature key: `pos`, HarakaModule key: `appointments`
**Permission keys**: `haraka.appointmentsView`, `haraka.appointmentsCreate`, `haraka.appointmentsUpdate`, plus per-status-transition keys `haraka.appointmentsConfirm`, `haraka.appointmentsComplete`, `haraka.appointmentsCancel`, `haraka.appointmentsMarkNoShow`, and `haraka.appointmentsGenerateInvoice`, `haraka.appointmentsAddPayment` — 9 appointment keys total, plus 2 shared with the staff directory (`haraka.staffManage`, `haraka.staffAvailabilityManage`); see [26-haraka-staff.md](./26-haraka-staff.md)
**Brand color**: inherited from Haraka

---

## Overview

Appointments are bookable time slots — clinics and paid service providers sell a slot on staff's calendar rather than a physical item. Each booking snapshots a service's price, tax rate, and duration at booking time so later catalog edits never rewrite history (same pattern as Service Jobs and Retainers).

Key characteristics:
- A booking needs a catalog service flagged `appointment_bookable` (with a `duration_minutes`) and a staff member tagged `appointment_provider` (see [26-haraka-staff.md](./26-haraka-staff.md)).
- Walk-ins are allowed: `customerId` is optional, but `customerName`/`customerPhone` are always captured so the calendar stays identifiable either way.
- The booking guard runs **server-side in the service layer**, not as a DB constraint — callers get a typed validation error instead of a Postgres exception.
- Split payments, one invoice number per completed appointment, same shape as Service Jobs/Retainers.
- Organizations have a governing IANA timezone (`organizations.timezone`, default `Asia/Amman`) that reconciles timezone-naive staff availability against `scheduled_at` (a `timestamptz`).

---

## Data Models

### HarakaAppointment (haraka_appointments)
```
id, organizationId, spaceId?
appointmentNumber          ← sequential, e.g. APT-000001
invoiceNumber?              ← APT-INV-YYYY-NNNNNN, allocated once completed

customerId?, customerName, customerPhone?    ← customerId nullable (walk-ins)
serviceId, staffId
serviceName?, staffName?    ← enriched on read, not stored columns

scheduledAt                 ← timestamptz
durationMinutes             ← snapshot from haraka_services.duration_minutes at booking time
price, taxRate?             ← snapshots from the catalog at booking time

status                      ← scheduled | confirmed | completed | cancelled | no_show
taxAmount, total             ← derived: taxAmount = price * taxRate, total = price + taxAmount
paymentStatus                ← unpaid | partial | paid
amountPaid                   ← rolled up from haraka_appointment_payments

notes?
```

### HarakaAppointmentPayment (haraka_appointment_payments)
Split-payment ledger, mirrors `haraka_service_job_payments`.
```
id, appointmentId, organizationId
amount, paymentMethod?, note?
paidAt
```
`amount_paid` / `payment_status` on the appointment are a cached rollup recomputed from this ledger on every add/remove (`recalcPayments` in `appointments.repository.ts`) — the ledger is the source of truth.

### Counters
- `haraka_appointment_counters` — one row per (org, space); produces `APT-NNNNNN`.
- `haraka_appointment_invoice_counters` — one row per (org, year); produces `APT-INV-YYYY-NNNNNN`, restarts annually.

### organizations.timezone
`text NOT NULL DEFAULT 'Asia/Amman'` (migration 0070). Governs how `haraka_staff_availability`'s timezone-naive `time` columns are interpreted against an appointment's `scheduled_at` (see Timezone Handling below).

### organization_configs.appointment_document_config
`jsonb` column added for appointment invoice/document templating (mirrors the config columns other Haraka sub-modules use); not otherwise wired up by this commit beyond the column existing.

---

## Number Formats

- Appointment number: `APT-NNNNNN` — per org, per space. Allocated from `haraka_appointment_counters`.
- Invoice number: `APT-INV-YYYY-NNNNNN` — per org, per year. Allocated from `haraka_appointment_invoice_counters`, only once the appointment is `completed`. `generateInvoiceNumber` is idempotent — a second call on an already-invoiced appointment returns the existing number rather than burning a new one.

---

## Status Machine

```
scheduled ──► confirmed ──► completed (terminal, unlocks invoicing)
    │              │
    └──► cancelled (terminal) / no_show (terminal)
```

Valid transitions (`isValidAppointmentTransition` in `lib/modules/haraka/appointments/schemas.ts`):
- `scheduled` → `confirmed | cancelled | no_show`
- `confirmed` → `completed | cancelled | no_show`
- `completed`, `cancelled`, `no_show` — all terminal, no further transitions.

Only `completed` unlocks invoice generation. `cancelled` and `no_show` free the slot for rebooking (see booking-conflict guard below); an edit/reschedule is blocked once an appointment is `completed`, `cancelled`, or `no_show`. Payments cannot be added to a `cancelled` or `no_show` appointment.

---

## Booking-Conflict Guard

Runs server-side in `AppointmentsService.assertSlotBookable` (`lib/modules/haraka/appointments/appointments.service.ts`), called from both `create` and `update` (any reschedule — a change to `scheduledAt`, `durationMinutes`, or `staffId` — re-runs the full guard against the new slot). Two checks, both against the org's timezone:

1. **Working-window fit** — the requested `[start, start+duration)` block must sit entirely inside one of the provider's working windows for that date (`fitsWorkingWindows` in `availability.ts`). A booking may not straddle two windows (e.g. the gap in a split shift is genuinely unavailable) or run past midnight. Windows come from `resolveWorkingWindows`: an availability *exception* for that date fully replaces the weekly pattern (no times = day off, both times = replacement hours); otherwise all weekly rows for that weekday apply, sorted by start time, so split shifts work.
2. **Overlap with existing bookings** — `findConflict` in `availability.ts` does a half-open interval overlap test `[aStart, aEnd) vs [bStart, bEnd)` against every appointment for that staff member found by `AppointmentsRepository.findBlockingBookings` (a ±24h window around the requested time, scanned because duration lives on the row rather than an end-time column). Only appointments whose status is in `BLOCKING_APPOINTMENT_STATUSES` (`scheduled`, `confirmed`, `completed`) are candidates — **cancelled and no-show bookings free their slot for rebooking**. Back-to-back slots (one ends exactly where the next starts) do **not** count as overlapping. When rescheduling, the appointment's own id is excluded (`excludeAppointmentId`) so it never conflicts with itself.

Both checks throw a 400 with a `code` (`OUTSIDE_WORKING_HOURS` or `SLOT_TAKEN`) rather than letting a DB exception surface, since none of this is enforced by a Postgres constraint.

Before the guard runs, `resolveBookingSnapshot` validates that the service is active and `appointment_bookable`, the staff member is active and tagged `appointment_provider`, and resolves the duration (override or catalog default) and price/tax snapshot — see [26-haraka-staff.md](./26-haraka-staff.md) for the `capabilities` tag mechanics.

---

## Timezone Handling

`haraka_staff_availability` and `haraka_staff_availability_exceptions` store `time` columns that are timezone-naive. `haraka_appointments.scheduled_at` is a `timestamptz`. Since the app runs on Cloudflare Workers (UTC server clock), comparing these directly would put working hours hours off from what the org actually means by "09:00–17:00."

`organizations.timezone` (default `'Asia/Amman'`, migration 0070) is the governing IANA zone. `toZonedInstant` (`lib/modules/haraka/appointments/availability.ts`) projects a `Date` into that zone using `Intl.DateTimeFormat` (not `Date`'s local getters, which would depend on the server's own TZ) to get:
- `isoDate` (`YYYY-MM-DD` in the org's zone) — used to find the day's exception row,
- `dayOfWeek` (0=Sunday…6=Saturday, matching `Date#getDay`) — used to find the weekly rows,
- `minutesOfDay` — used for the working-window and overlap math.

`AppointmentsRepository.getOrgTimezone` reads `organizations.timezone`, falling back to `DEFAULT_ORG_TIMEZONE` (`Asia/Amman`) if the column is empty.

---

## Calendar View

`/haraka/appointments/calendar` — a hand-built day-view grid (not a calendar library), one absolutely-positioned block per appointment. Renders `07:00`–`21:00` at `1.1px`/minute. Fetches via `useAppointments`/`useStaff`, colors blocks by `AppointmentStatus` (same palette as the `appointment_status` managed list). List view (`/haraka/appointments`) is the paginated table; `new` and `[appointmentId]` cover creation and detail/edit.

---

## Key Files

| Layer | Path |
|---|---|
| DB migrations | `supabase/migrations/0067_haraka_staff.sql` (staff rename), `0068_haraka_service_catalog_ext.sql` (catalog fields), `0069_haraka_staff_availability.sql` (availability — see staff doc), `0070_haraka_appointments.sql` (appointments schema + org timezone) |
| Types | `types/pos.types.ts` — `AppointmentStatus`, `BLOCKING_APPOINTMENT_STATUSES`, `HarakaAppointment`, `HarakaAppointmentPayment` |
| Repository | `lib/modules/haraka/appointments/appointments.repository.ts` |
| Service | `lib/modules/haraka/appointments/appointments.service.ts` |
| Availability math (pure functions) | `lib/modules/haraka/appointments/availability.ts` |
| Schemas | `lib/modules/haraka/appointments/schemas.ts` |
| Numbering | `lib/modules/haraka/appointments/appointment-numbering.ts` |
| API list/create | `app/api/haraka/appointments/route.ts` |
| API detail | `app/api/haraka/appointments/[appointmentId]/route.ts` |
| API status | `app/api/haraka/appointments/[appointmentId]/status/route.ts` |
| API invoice | `app/api/haraka/appointments/[appointmentId]/invoice/route.ts` |
| API payments | `app/api/haraka/appointments/[appointmentId]/payments/route.ts`, `.../payments/[paymentId]/route.ts` |
| Hook | `hooks/haraka/useAppointments.ts` |
| Status badge | `components/haraka/AppointmentStatusBadge.tsx` |
| Payments panel | `components/haraka/AppointmentPaymentsPanel.tsx` |
| Provider picker | `components/haraka/StaffPicker.tsx` (shared with Service Jobs; see staff doc) |
| List page | `app/[locale]/[orgSlug]/[space]/haraka/appointments/page.tsx` |
| New page | `app/[locale]/[orgSlug]/[space]/haraka/appointments/new/page.tsx` |
| Detail page | `app/[locale]/[orgSlug]/[space]/haraka/appointments/[appointmentId]/page.tsx` |
| Calendar page | `app/[locale]/[orgSlug]/[space]/haraka/appointments/calendar/page.tsx` |

---

## Permissions

Checked in `lib/modules/haraka/appointments/appointments.service.ts` against the `haraka` permission module:

| Key | Gates |
|---|---|
| `haraka.appointmentsView` | List/detail reads, listing payments |
| `haraka.appointmentsCreate` | Book a new appointment |
| `haraka.appointmentsUpdate` | Edit/reschedule; also gates delete |
| `haraka.appointmentsConfirm` | Status → `confirmed` |
| `haraka.appointmentsComplete` | Status → `completed` |
| `haraka.appointmentsCancel` | Status → `cancelled` |
| `haraka.appointmentsMarkNoShow` | Status → `no_show` |
| `haraka.appointmentsGenerateInvoice` | Allocate the invoice number |
| `haraka.appointmentsAddPayment` | Add or remove a payment entry |

Each status transition has its **own** permission key, mirroring how Retainers gates pause/cancel/reactivate separately (see `requireStatusChange` in `appointments.service.ts`).

The API routes additionally gate on `requireFeature(tenant, 'pos')` and `requireHarakaModule(tenant, 'appointments')` — subscription module gating, see below and `app/api/haraka/appointments/route.ts`.

For the 2 staff-directory permission keys (`staffManage`, `staffAvailabilityManage`) that appointments also depends on, see [26-haraka-staff.md](./26-haraka-staff.md).

---

## HarakaModule Subscription Gate

`'appointments'` was added to the `HarakaModule` union (`types/subscription.types.ts`): `'pos' | 'services' | 'orders' | 'retainers' | 'appointments'`. Every appointments API route calls `requireHarakaModule(tenant, 'appointments')` (`lib/permissions/require-module.ts`) in addition to `requireFeature(tenant, 'pos')`. The super-admin `PackageForm` (`components/super-admin/PackageForm.tsx`) gained an `appointments` add-on price slot alongside `services`/`orders`/`retainers`, so it's billable per-package like the other Haraka sub-modules.

---

## Managed Lists

| List key | Type | Purpose |
|---|---|---|
| `appointment_status` | SYSTEM | Status values. Codes drive the status machine (only `completed` unlocks invoicing); labels/colors/order stay editable. Seeded: `scheduled` (#3b82f6), `confirmed` (#6366f1), `completed` (#22c55e), `cancelled` (#ef4444), `no_show` (#f97316). |

---

## Deviations From the Design Doc

- Design doc §3.2 (ServicePicker writing `haraka_service_job_items` directly) was **not** shipped in this commit — Service Jobs still writes its legacy free-text `items` JSONB. `haraka_service_job_items` (migration 0068) exists as a table but nothing writes to it yet; wiring the FK write-path into Service Jobs is deferred as unrelated scope creep for this feature.
