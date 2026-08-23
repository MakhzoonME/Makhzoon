# Haraka — Staff (فريق العمل)

**Parent module**: Haraka (حركة) — Feature key: `pos`
**Permission keys**: reuses the legacy delivery-agent keys `haraka.deliveryAgentsView`, `haraka.deliveryAgentsCreate`, `haraka.deliveryAgentsUpdate`, `haraka.deliveryAgentsDelete` for directory CRUD, plus 2 new keys `haraka.staffManage` (capability tag edits) and `haraka.staffAvailabilityManage` (working-hours edits)
**Brand color**: inherited from Haraka

---

## Overview

`haraka_delivery_agents` was generalized into `haraka_staff` — a single non-auth staff directory (people who may not have login accounts) shared by three Haraka sub-modules instead of one table per module. A `capabilities` tag on each staff row says what that person can be assigned to: delivery routing, Service Job assignment, or Appointments booking. This is a rename plus additive columns — delivery flows, balanced routing, and public order-tracking behavior are unchanged.

Key characteristics:
- One directory, filtered by `capabilities` per use case (delivery dispatch, service-job assignment, appointment provider picker).
- Staff created through the legacy delivery-agent path still default to `capabilities: ['delivery']` — no behavior change for existing integrations.
- Appointment providers get a weekly recurring availability pattern plus optional per-date exceptions.
- `lib/modules/haraka/delivery-agents/*` remains as a deprecated compatibility shim — old call sites keep compiling and behaving identically.

---

## Data Models

### HarakaStaff (haraka_staff, renamed from haraka_delivery_agents)
```
id, organizationId
name, phone?, notes?
capabilities                ← text[]: delivery | service_job | appointment_provider
isActive
createdAt, createdBy?, updatedAt, updatedBy?
```
`capabilities` is **not** a CHECK constraint — enforcement is at the zod layer (`staffCapabilitySchema` in `lib/modules/haraka/staff/schemas.ts`), left open so other Haraka modules can add capability values later without a migration. Indexed with a GIN index (`haraka_staff_capabilities_idx`) so `capabilities @> ARRAY['appointment_provider']`-style filtering stays cheap. Pre-existing rows were backfilled to `['delivery']` in migration 0067.

`haraka_service_job_agents.delivery_agent_id` was renamed to `staff_id` in the same migration (replay-safe — guarded by an `information_schema` check).

`HarakaDeliveryAgent` is kept in `types/pos.types.ts` as `type HarakaDeliveryAgent = HarakaStaff` — a `@deprecated` alias so old call sites compile unchanged.

### HarakaStaffAvailability (haraka_staff_availability)
Recurring weekly working hours. Several rows may share a `dayOfWeek` (split shifts).
```
id, organizationId, staffId
dayOfWeek                   ← 0=Sunday … 6=Saturday, matches JS Date#getDay
startTime, endTime          ← 'HH:mm', timezone-naive; end must be > start (DB CHECK)
createdAt, updatedAt
```

### HarakaStaffAvailabilityException (haraka_staff_availability_exceptions)
One date overriding the weekly pattern; unique on `(staffId, exceptionDate)`.
```
id, organizationId, staffId
exceptionDate                ← 'YYYY-MM-DD'
startTime?, endTime?         ← both null = day off; both set = replacement hours for that date
reason?
createdAt, updatedAt
```
A DB CHECK rejects a half-specified override (start without end or vice versa) — both null or both set only.

Both tables store timezone-naive `time` values, reconciled against appointment bookings via `organizations.timezone`; see [25-haraka-appointments.md](./25-haraka-appointments.md#timezone-handling) for the comparison mechanics (this is a shared concern, documented once there to avoid duplication).

---

## Capabilities Tag Usage

`capabilities: text[]` on `haraka_staff`, one or more of `delivery | service_job | appointment_provider`:

- **Delivery routing** — `lib/modules/haraka/delivery-agents/balanced-routing.ts` and its `lib/modules/haraka/staff/balanced-routing.ts` counterpart filter/assign against staff carrying `delivery`. Behavior unchanged from the old `haraka_delivery_agents` table.
- **Service Job assignment** — `haraka_service_job_agents.staff_id` (renamed from `delivery_agent_id`) assigns staff tagged `service_job` to service jobs.
- **Appointment provider picker** — `StaffService.create`/`update` requires `staffManage` only when a caller tries to grant anything beyond the plain `['delivery']` default; `AppointmentsService.resolveBookingSnapshot` rejects booking a staff member who is inactive or doesn't carry `appointment_provider`. `StaffService.addAvailability` similarly rejects setting working hours for a staff member not tagged `appointment_provider`.

`components/haraka/StaffPicker.tsx` is the shared picker component, filtered by capability per caller (used by both Service Jobs and Appointments).

---

## Key Files

| Layer | Path |
|---|---|
| DB migrations | `supabase/migrations/0067_haraka_staff.sql` (rename + capabilities), `0068_haraka_service_catalog_ext.sql` (service catalog additions, see below), `0069_haraka_staff_availability.sql` (weekly + exceptions) |
| Types | `types/pos.types.ts` — `HarakaStaff`, `HarakaDeliveryAgent` (deprecated alias), `HarakaStaffAvailability`, `HarakaStaffAvailabilityException`, `StaffCapability` |
| Repository | `lib/modules/haraka/staff/staff.repository.ts` |
| Availability repository | `lib/modules/haraka/staff/availability.repository.ts` |
| Service | `lib/modules/haraka/staff/staff.service.ts` |
| Balanced routing | `lib/modules/haraka/staff/balanced-routing.ts` |
| Schemas | `lib/modules/haraka/staff/schemas.ts` — `staffSchema`, `staffCapabilitySchema`, `staffAvailabilitySchema`, `staffAvailabilityExceptionSchema` |
| API list/create | `app/api/haraka/staff/route.ts` |
| API detail | `app/api/haraka/staff/[staffId]/route.ts` |
| API availability | `app/api/haraka/staff/[staffId]/availability/route.ts` |
| API availability exceptions | `app/api/haraka/staff/[staffId]/availability/exceptions/route.ts` |
| Hook | `hooks/haraka/useStaff.ts` |
| Provider picker component | `components/haraka/StaffPicker.tsx` |
| List page | `app/[locale]/[orgSlug]/[space]/haraka/staff/page.tsx` |
| Availability page | `app/[locale]/[orgSlug]/[space]/haraka/staff/[staffId]/availability/page.tsx` |
| Legacy redirect | `app/[locale]/[orgSlug]/[space]/haraka/delivery-agents/page.tsx` → `/haraka/staff` |
| Deprecated shims | `lib/modules/haraka/delivery-agents/delivery-agents.repository.ts`, `.service.ts` — re-export the staff module's classes under the old names |

---

## Delivery-Agents → Staff Rename & Redirect

`/haraka/delivery-agents` now renders `redirect()` to `/haraka/staff` (same locale/org/space segments) so old bookmarks and links keep working — see `app/[locale]/[orgSlug]/[space]/haraka/delivery-agents/page.tsx`. `app/api/haraka/delivery-agents/route.ts` and `[agentId]/route.ts` remain live endpoints (not redirected — API consumers keep working unchanged), delegating to the same underlying `StaffRepository`/`StaffService`.

`lib/modules/haraka/delivery-agents/*` is kept as a **deprecated compatibility shim**:
- `delivery-agents.service.ts` re-exports `StaffService` as `DeliveryAgentsService`.
- `delivery-agents.repository.ts` preserves old call-site signatures exactly (e.g. `list(tenant, onlyActive)`'s boolean second argument), wrapping the new staff repository underneath.
- New code should import from `lib/modules/haraka/staff/*` directly; the shim exists purely so nothing outside this feature had to change.

`lib/modules/haraka/delivery-agents/balanced-routing.ts` also stayed in place, now delegating onto `haraka_staff`.

---

## Service Catalog Additions (haraka_services)

Migration 0068 extends `haraka_services` — documented here because these fields exist only to support staff/appointment coupling (a bookable service needs both a duration and an available provider):

```
duration_minutes    ← integer, nullable. Required only when appointment_bookable = true
                       (enforced in the zod schema, not a DB CHECK, for a field-level error).
appointment_bookable ← boolean, NOT NULL DEFAULT false.
```

A partial index (`haraka_services_org_bookable_idx`, `WHERE appointment_bookable = true`) feeds the Appointments service picker. See [25-haraka-appointments.md](./25-haraka-appointments.md) for how these fields are snapshotted onto a booking.

Migration 0068 also adds `haraka_service_job_items` (FK-referenced Service Job line items, price/tax snapshotted at add-time) — table exists but nothing writes to it yet; see the Deviations note in the appointments doc.

---

## Permissions

Checked in `lib/modules/haraka/staff/staff.service.ts`:

| Key | Gates |
|---|---|
| `haraka.deliveryAgentsView` **or** `haraka.appointmentsView` | Any read (list/detail/availability) — either grants read access, since Appointments' provider picker needs to read the directory even for a caller who can't manage delivery agents |
| `haraka.deliveryAgentsCreate` | Create a staff record |
| `haraka.deliveryAgentsUpdate` | Update a staff record (name/phone/notes/active) |
| `haraka.deliveryAgentsDelete` | Delete a staff record |
| `haraka.staffManage` | Grant/change `capabilities` beyond the plain `['delivery']` default, on create or update |
| `haraka.staffAvailabilityManage` | Add/remove weekly availability rows and set/remove per-date exceptions |

The directory intentionally kept the legacy `deliveryAgents*` keys rather than introducing new CRUD keys — this is a rename, not a re-authorization: anyone who could manage delivery agents before can manage the same records (now tagged with richer capabilities) after.

---

## Managed Lists

None — `capabilities` is a free-form `text[]` validated by the zod enum (`staffCapabilitySchema`), not a platform managed list.
