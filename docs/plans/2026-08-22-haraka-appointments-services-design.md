# Haraka Appointments & Services Catalog — Design

Status: draft, pending review
Date: 2026-08-22

## 1. Summary

Add an **Appointments** feature to Haraka for clinics and paid service providers to sell bookable time slots, and generalize two pieces of existing infrastructure to support it:

1. **`haraka_delivery_agents` → `haraka_staff`** — a general, non-auth staff directory (people who may not have login accounts) usable across deliveries, service jobs, and appointments, tagged with capabilities.
2. **`haraka_services` catalog** — already exists as a free-text prefill helper for Service Jobs; extend it with `duration_minutes` and `appointment_bookable`, and make Service Jobs actually reference catalog rows by FK instead of copying text.

Appointments are booked **internally by staff only** in v1 (no public self-service booking page). Appointment statuses are configurable via the existing Managed Lists system, matching the pattern already used for `order_status`, `service_job_status`, and `retainer_status`.

## 2. Staff generalization

### 2.1 Current state

`haraka_delivery_agents` (`supabase/migrations/0017_haraka_orders.sql`): `id, organization_id, name, phone, notes, is_active, created_at/by, updated_at/by`. No `user_id` — pure directory record, "people who do deliveries but may not be org members." Already assigned to jobs via a join table, `haraka_service_job_agents` (`job_id, delivery_agent_id, role`).

Referenced from:
- `haraka_orders.delivery_agent_id` (nullable FK)
- `haraka_service_job_agents` (multi-agent job assignment)
- `lib/modules/haraka/delivery-agents/{delivery-agents.service.ts,delivery-agents.repository.ts,schemas.ts,balanced-routing.ts}`
- API: `app/api/haraka/delivery-agents/route.ts`, `[agentId]/route.ts`, `app/api/haraka/service-jobs/[jobId]/agents/route.ts`
- Frontend: `app/[locale]/[orgSlug]/[space]/haraka/delivery-agents/page.tsx`, `components/haraka/DeliveryAgentPicker.tsx`, `hooks/haraka/useDeliveryAgents.ts`
- Public tracking: `app/api/track/[token]/route.ts`, `app/api/delivery/[token]/route.ts`
- Gated by `requireAddOn(tenant, 'deliveryAgents')`

### 2.2 Target state

Migration renames the table and adds a capability tag:

```sql
ALTER TABLE haraka_delivery_agents RENAME TO haraka_staff;
ALTER TABLE haraka_staff ADD COLUMN capabilities text[] NOT NULL DEFAULT '{}';
-- backfill existing rows
UPDATE haraka_staff SET capabilities = ARRAY['delivery'];
```

`capabilities` values: `delivery`, `service_job`, `appointment_provider`. Multi-valued — one staff record can hold several (e.g. a technician who both does field service jobs and takes appointments).

Rename `haraka_service_job_agents.delivery_agent_id` → `staff_id` (column rename, FK target unchanged in identity, just table name).

Code-level renames (mechanical, one PR):
- `lib/modules/haraka/delivery-agents/` → `lib/modules/haraka/staff/`, service/repo/schema names updated, `capabilities` added to the zod schema and filtering support added (`GET /api/haraka/staff?capability=appointment_provider`).
- `DeliveryAgentPicker.tsx` → `StaffPicker.tsx` with a `capability` filter prop; existing delivery-agent call sites pass `capability="delivery"` so behavior is unchanged.
- `useDeliveryAgents` → `useStaff({ capability })`.
- Add-on flag `deliveryAgents` kept as-is (still gates delivery-specific UI); a separate flag or module check (see §6) gates appointment-provider UI.
- `balanced-routing.ts` logic unchanged, just reads from the renamed table.
- Public tracking endpoints unchanged (still expose name/phone from `haraka_staff`).

### 2.3 Availability (appointment providers only)

Two new tables, only populated for staff with `appointment_provider` in `capabilities`:

```sql
CREATE TABLE haraka_staff_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  staff_id uuid NOT NULL REFERENCES haraka_staff(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL CHECK (end_time > start_time),
  created_at/by, updated_at/by
);

CREATE TABLE haraka_staff_availability_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  staff_id uuid NOT NULL REFERENCES haraka_staff(id) ON DELETE CASCADE,
  exception_date date NOT NULL,
  -- null start/end = full day off; both set = override hours for that date
  start_time time,
  end_time time,
  reason text,
  created_at/by, updated_at/by,
  UNIQUE (staff_id, exception_date)
);
```

A staff member can have multiple `day_of_week` rows (e.g. split shifts). Exceptions override the weekly pattern for that specific date.

## 3. Services Catalog extension

### 3.1 Current state

`haraka_services` (`supabase/migrations/0044_haraka_services.sql`): `id, organization_id, space_id (nullable), name, category, description, price, tax_rate_id, active`, audit columns. Managed via `/{orgSlug}/{space}/haraka/services`, permission `pos.manage_services`. `ServicePicker.tsx` searches this catalog and **prefills** free-text Service Job line items — it does not create a persisted reference.

Service Jobs (`haraka_service_jobs`) store line items as free-text JSONB (`items`), with no FK back to `haraka_services`.

### 3.2 Target state

```sql
ALTER TABLE haraka_services ADD COLUMN duration_minutes integer;
ALTER TABLE haraka_services ADD COLUMN appointment_bookable boolean NOT NULL DEFAULT false;
```

- `duration_minutes` — nullable; required (enforced in the zod schema, not a DB constraint) when `appointment_bookable = true`.
- `appointment_bookable` — explicit flag, independent of `duration_minutes` being set. Admins choose per-service whether it appears in the Appointments picker. A service can be `appointment_bookable = true` and also usable in Service Jobs — the flag doesn't restrict Service Job usage, it only gates the Appointments picker.

**Service Jobs move from free-text to FK-referenced items.** New join table:

```sql
CREATE TABLE haraka_service_job_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  job_id uuid NOT NULL REFERENCES haraka_service_jobs(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES haraka_services(id),
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL,   -- snapshot of haraka_services.price at booking time
  tax_rate numeric,               -- snapshot
  created_at/by
);
```

Snapshotting price/tax at creation time (rather than joining live) matches the existing pattern in `haraka_service_job_payments`/`haraka_retainer_invoices`, where historical records must not change if the catalog price changes later. The legacy free-text `items` JSONB column stays on `haraka_service_jobs` for old rows (read-only, not written by new code) — no backfill, since existing free text can't be reliably mapped to catalog IDs.

`ServicePicker.tsx` changes from a "prefill text" component to a real multi-select that writes rows into `haraka_service_job_items`.

## 4. Appointments

### 4.1 Schema

Follows the same counter + main-table + payments pattern as Service Jobs and Retainers:

```sql
CREATE TABLE haraka_appointment_counters (
  organization_id uuid NOT NULL,
  space_id text NOT NULL,
  next_number integer NOT NULL DEFAULT 1,
  PRIMARY KEY (organization_id, space_id)
);
-- generates APT-NNNNNN

CREATE TABLE haraka_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  space_id text NOT NULL,
  appointment_number text NOT NULL,   -- APT-NNNNNN
  customer_id uuid REFERENCES haraka_customers(id),
  service_id uuid NOT NULL REFERENCES haraka_services(id),
  staff_id uuid NOT NULL REFERENCES haraka_staff(id),
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL,  -- snapshot from haraka_services at booking time
  status text NOT NULL DEFAULT 'scheduled',  -- driven by managed list 'appointment_status'
  price numeric NOT NULL,             -- snapshot
  tax_rate numeric,                   -- snapshot
  notes text,
  created_at/by, updated_at/by
);

CREATE TABLE haraka_appointment_invoice_counters ( ... );  -- APT-INV-YYYY-NNNNNN, mirrors service jobs
CREATE TABLE haraka_appointment_payments ( ... );          -- mirrors haraka_service_job_payments
```

### 4.2 Conflict prevention

On create/reschedule, before insert:
1. Resolve `staff_id`'s availability for `scheduled_at`'s date: check `haraka_staff_availability_exceptions` first (full override for that date), fall back to `haraka_staff_availability` for that `day_of_week`. Reject if the requested `[scheduled_at, scheduled_at + duration_minutes)` window falls outside working hours.
2. Query existing `haraka_appointments` for the same `staff_id` where status not in `(cancelled, no_show)` and time ranges overlap. Reject on overlap.

Both checks run server-side in the service layer (`lib/modules/haraka/appointments/appointments.service.ts`), not as DB constraints — overlap checks need duration math that's awkward as a raw SQL constraint, and we want a clean validation error rather than a DB exception.

### 4.3 Status

New Managed List key `appointment_status`, registered in `types/managed-lists.types.ts` `LIST_REGISTRY` as `scope: 'org', isSystem: true`, seeded via a migration (same pattern as `0045_service_category_list.sql`) with base values: `scheduled, confirmed, completed, cancelled, no_show`. `is_system = true` means the underlying codes are locked (business logic — e.g. completing an appointment triggers invoice generation, cancelling/no-show does not) but orgs can relabel, recolor, reorder, and toggle visibility, same as `order_status` today.

Status transitions enforced in the service layer: `scheduled → confirmed → completed`, or `scheduled|confirmed → cancelled|no_show`. `completed` is the only state that unlocks invoice generation (mirrors Service Jobs' `done` state).

## 5. Payments & invoicing

Directly mirrors Service Jobs:
- `haraka_appointment_invoice_counters` — per-org, per-year, `APT-INV-YYYY-NNNNNN`.
- `haraka_appointment_payments` — split payments, same columns as `haraka_service_job_payments`.
- Document config stored in `organization_configs` (new `appointment_document_config` JSONB column, alongside existing `service_job_document_config`).
- Public no-auth invoice preview route: `app/appointment-invoice/[orgSlug]/[appointmentId]/page.tsx`, mirroring `app/service-job-invoice/[orgSlug]/[jobId]/page.tsx`.

## 6. API & frontend

Repository → Service → Schemas layering, same as every other Haraka feature:

- `lib/modules/haraka/appointments/{appointments.repository.ts,appointments.service.ts,schemas.ts}`
- `lib/modules/haraka/staff/` (renamed from `delivery-agents/`)
- API: `app/api/haraka/appointments/route.ts` (list/create), `[appointmentId]/route.ts`, `[appointmentId]/status/route.ts`, `[appointmentId]/invoice/route.ts`, `[appointmentId]/payments/route.ts`
- API: `app/api/haraka/staff/route.ts`, `[staffId]/route.ts`, `[staffId]/availability/route.ts`, `[staffId]/availability/exceptions/route.ts`
- Frontend pages: `app/[locale]/[orgSlug]/[space]/haraka/appointments/{page.tsx,new/page.tsx,[appointmentId]/page.tsx,calendar/page.tsx}`
- Calendar view (`calendar/page.tsx`): day/week grid, filterable by staff, reads from the appointments list API with a date-range query param. New component — no existing calendar UI to reuse in this codebase. Recommend a lightweight custom grid (time rows × staff columns) rather than pulling in a full calendar library, consistent with this codebase's preference for hand-built UI over heavy dependencies (confirm during implementation planning).
- Staff settings page: `app/[locale]/[orgSlug]/[space]/haraka/staff/page.tsx` (renamed from `delivery-agents`), with a new per-staff availability editor (`[staffId]/availability/page.tsx`) shown only when `appointment_provider` is in that staff member's capabilities.

## 7. Permissions & feature gating

Two gates, mirroring the existing dual-gate pattern:

- **Module gate**: add `'appointments'` to `HarakaModule` (`types/subscription.types.ts`), enforced via `requireHarakaModule(tenant, 'appointments')`.
- **RBAC**: add to `MODULE_PERMISSIONS_CONFIG` under `haraka`: `appointmentsView`, `appointmentsCreate`, `appointmentsConfirm`, `appointmentsComplete`, `appointmentsCancel`, `appointmentsMarkNoShow`, `appointmentsGenerateInvoice`, `appointmentsAddPayment`, `appointmentsUpdate`, `staffManage`, `staffAvailabilityManage` — each declaring `requiresKey: 'appointmentsView'` (or `staffManage` for staff-related ops), following the existing dependency-chain pattern used by `servicesView`/`retainersView`.

## 8. Migration & rollout sequencing

Recommended order, each shippable independently:

1. **Staff rename** (`haraka_delivery_agents` → `haraka_staff` + capabilities). Verify delivery flows, routing, and tracking links are unaffected — this is a rename, not a behavior change, so regression risk is entirely in the mechanical rename being complete (no leftover references to the old table/module name).
2. **Services Catalog extension** (`duration_minutes`, `appointment_bookable`, `haraka_service_job_items`, ServicePicker → FK-based selection). Service Jobs behavior changes here: existing in-flight jobs keep their free-text `items`, new jobs use catalog references.
3. **Appointment status list** — seed `appointment_status` in Managed Lists.
4. **Staff availability** (weekly hours + exceptions) — schema + settings UI, independent of appointments existing yet.
5. **Appointments core** — schema, conflict checking, CRUD, payments/invoicing.
6. **Calendar view** — built last, once appointment data exists to render.
7. **Permissions/module gating** — wired in from step 5 onward, not a separate phase.

## 9. Testing considerations

- Staff rename: regression tests for delivery-agent assignment, balanced routing, and public tracking endpoints against the renamed table.
- Services Catalog: Service Job creation with catalog-referenced items produces correct price/tax snapshots even if the catalog entry is later edited or deactivated.
- Availability: overlapping weekly hours, exceptions overriding weekly hours (both "day off" and "custom hours" cases), timezone handling for `scheduled_at` vs `time`-typed availability columns (org timezone assumed — confirm during implementation).
- Conflict prevention: back-to-back appointments at exact boundary times (no false-positive overlap), cancelled/no-show appointments don't block rebooking the same slot.
- Status machine: invoice generation only reachable from `completed`; cancelling/no-show does not generate an invoice.

## 10. Open questions for implementation planning

- Org timezone handling for availability (`time` columns are timezone-naive; need to confirm which org timezone field governs conversion to/from `scheduled_at`).
- Whether `haraka_appointments.customer_id` should be required or optional (walk-in appointments with no customer record).
- Calendar UI library vs. hand-built grid (noted in §6) — worth a quick spike before committing.
