# Zeyara (زيارة) — Clinic Vertical — Design

Status: Phases 1–4 implemented (2026-08-26). Not yet migrated against a live DB.
Supersedes nothing. Builds directly on
[2026-08-22-haraka-appointments-services-design.md](./2026-08-22-haraka-appointments-services-design.md).

## 1. Summary

Zeyara is a **clinic-branded vertical over Haraka's appointment engine** — not a
fork. Clinics get their own feature key, sidebar group, brand, permission
namespace, routes, and vocabulary (Patients / Providers / Visits), while the
data layer, service layer, and API stay the ones Haraka already ships.

The decision rests on what already exists. Migration `0070_haraka_appointments`
opens with *"Bookable time slots for **clinics** and paid service providers"* —
appointments, the `appointment_bookable` service catalog, provider availability,
appointment invoicing, and the customer history timeline were all built for this
use case. Duplicating ~35,000 lines to re-own them would double the maintenance
surface for zero product gain.

What a clinic genuinely lacks is a **clinical layer**: a per-visit record with
notes and attachments, configurable fields on appointments, and follow-ups.
That is what this design adds. Everything else it reuses.

### 1.1 What is reused as-is

| Concern | Existing implementation |
|---|---|
| Service catalog | `haraka_services` + `duration_minutes` + `appointment_bookable` (0044, 0068) |
| Appointments | `haraka_appointments`, `haraka_appointment_payments`, counters (0070) |
| Booking guard | `appointments/availability.ts` — working hours + overlap |
| Providers | `haraka_staff`, `haraka_staff_availability`, `appointment_provider` tag (0067, 0069) |
| Patients | `pos_customers` + `custom_fields(module='customers')` |
| Patient timeline | `CustomersService.history()` — already merges appointments |
| Invoicing | `APT-INV-YYYY-NNNNNN`, `appointment_document_config`, split payments |
| Tax, currency, printing, Jo Fotara | org-level, vertical-agnostic already |

### 1.2 What is new

| Concern | Phase |
|---|---|
| `zeyara` feature key, permission namespace, nav group, brand, routes | 1 |
| Vertical resolution layer (dual entitlement gate) | 1 |
| Clinic vocabulary (Patient / Provider / Visit) in EN + AR | 1 |
| Visit record: per-visit clinical notes, structured findings | 2 |
| Visit attachments (files, images) | 2 |
| Configurable custom fields on appointments/visits | 3 |
| Appointment reminders (channel + scheduler) | 4 |
| Follow-up / recurring appointment chains | 4 |

## 2. Vertical resolution layer

### 2.1 The problem

Shared services hard-code a single vertical's entitlement:

```ts
// lib/modules/haraka/appointments/appointments.service.ts
requireFeature(tenant, 'pos')                              // route layer
hasPermission(tenant, 'haraka', 'appointmentsView')        // service layer
```

A clinic org holds `zeyara`, not `pos`, and `zeyara.appointmentsView`, not
`haraka.appointmentsView`. Without a resolution layer, a Zeyara org is
403-blocked out of the very engine it bought.

### 2.2 The mechanism

A new `lib/platform/verticals.ts` declares the registry, and shared gates accept
**any vertical the tenant holds**:

```ts
export type Vertical = 'haraka' | 'zeyara';

export const VERTICALS: Record<Vertical, VerticalConfig> = {
  haraka: { featureKey: 'pos',    permModule: 'haraka', segment: 'haraka', ... },
  zeyara: { featureKey: 'zeyara', permModule: 'zeyara', segment: 'zeyara', ... },
};
```

- `requireAnyVerticalFeature(tenant)` replaces `requireFeature(tenant, 'pos')`
  on **shared** routes (appointments, services, customers, staff). It passes if
  the org holds `pos` **or** `zeyara`. Haraka-exclusive routes (register, orders,
  warranty certs, cash drawer, card terminal) keep the strict `pos` gate.
- `hasVerticalPermission(tenant, op)` returns true if **either**
  `haraka.<op>` or `zeyara.<op>` is granted.

Both are additive. An existing Haraka-only org holds `pos` + `haraka.*` and its
behaviour is bit-for-bit unchanged — every new branch is an `OR` over a
namespace it does not have.

### 2.3 Why not a shared permission namespace

Letting Zeyara reuse `haraka.*` keys directly would be less code, but a clinic
admin configuring staff would see a "Haraka" permission group listing "Point of
Sale" operations they never bought. The namespace split costs one `OR` per gate
and keeps the product honest.

### 2.4 Client side

`useModuleGuard` already accepts `featureKey` + `moduleKey`. A React context
(`VerticalProvider`) supplies the active vertical to shared page bodies so one
component serves both surfaces:

```tsx
const { featureKey, permModule, basePath, colorVar } = useVertical();
```

`/haraka/*` pages mount it as `haraka`, `/zeyara/*` as `zeyara`. Page bodies stop
hard-coding `'pos'`, `'haraka'`, `.../haraka`, and `var(--mod-haraka)`.

## 3. Entitlement model

Zeyara is a **feature key**, not a Haraka sub-module. Buying Zeyara implies the
appointment + catalog surface, so Zeyara routes do **not** additionally require
`harakaModule: 'appointments'` — that gate exists to sell appointments à la carte
*inside* Haraka, which is a different product decision.

```
FeatureKey  += 'zeyara'
ModuleGroup += 'zeyara'
UserPermissions += zeyara: ZeyaraPermissions
```

A clinic package therefore ships `features.zeyara = true` and leaves
`features.pos = false`. Nothing about `HARAKA_MODULES` changes.

### 3.1 Mixed orgs

An org may hold both (a spa with a retail counter and a treatment calendar).
Both sidebar groups render; both permission groups appear; the shared engine
serves both. Appointments booked from either surface are the same rows — which
is correct, because they occupy the same providers' calendars.

## 4. Permissions

`ZeyaraPermissions` mirrors the clinic-relevant slice of `HarakaPermissions`,
renamed to clinic vocabulary, plus the new clinical operations:

```
view                                          — Zeyara dashboard
appointmentsView/Create/Update                — same semantics as Haraka's
appointmentsConfirm/Complete/Cancel/MarkNoShow
appointmentsGenerateInvoice/AddPayment
patientsView/Create/Update/Delete/Export      — over pos_customers
patientsHistoryView
patientFieldsView/Create/Update/Delete        — over custom_fields(module='customers')
serviceCatalogView/Create/Update/Delete       — over haraka_services
providersManage, providersAvailabilityManage  — over haraka_staff
visitsView/Create/Update                      — Phase 2, clinical record
visitNotesView/Create                         — Phase 2
visitAttachmentsView/Upload/Delete            — Phase 2
analyticsView
```

Operation *keys* deliberately match Haraka's where the underlying operation is
identical (`appointmentsCreate`, not `bookVisit`) so `hasVerticalPermission`
can resolve one op name against both namespaces without a translation table.
Only the **labels** speak clinic.

## 5. Clinical layer (Phase 2)

New tables, `zeyara_`-prefixed because they are genuinely new — not copies:

### 5.1 zeyara_visits

One clinical record per completed (or in-progress) appointment. Separate from
`haraka_appointments` because an appointment is a *scheduling + billing* object
with a lifecycle that ends at `completed`, while a visit record is a *clinical*
object that is amended afterwards and must retain its own authorship trail.

```
id, organization_id, space_id
appointment_id      → haraka_appointments(id) ON DELETE RESTRICT
customer_id         → pos_customers(id)
provider_id         → haraka_staff(id)
visit_date          timestamptz
chief_complaint     text
findings            text
diagnosis           text
treatment_plan      text
follow_up_due       date
custom_values       jsonb    -- resolved against custom_fields(module='visits')
created_at/by, updated_at/by
```

`ON DELETE RESTRICT` is deliberate: an appointment carrying a clinical record
must not be deletable. The appointments service already refuses to delete an
invoiced appointment; this extends the same protection to clinical data.

### 5.2 zeyara_visit_notes

Append-only. Clinical notes are amended by addition, never edited in place —
the same reason `haraka_appointment_payments` is a ledger.

```
id, visit_id, organization_id, body, author_id, author_name, created_at
```

### 5.3 zeyara_visit_attachments

```
id, visit_id, organization_id, storage_path, file_name, mime_type,
size_bytes, uploaded_by, created_at
```

Reuses the existing Supabase storage bucket conventions from the assets module.

### 5.4 RLS

Identical shape to `haraka_appointments`: platform-admin all, org-manager all,
org-member select. Clinical data is **not** given a broader read policy than
appointments — per-provider record isolation is deferred and noted in §9.

## 6. Custom fields on appointments and visits (Phase 3)

The `custom_fields.module` CHECK is currently
`('assets','inventory','requests','customers')` (0026, extended by 0043). Phase 3
extends it with `'appointments'` and `'visits'`, which makes the entire existing
Banna stack — 7 field types, conditional visibility (commit `3dadee6`),
required/visible toggles, the admin CRUD page, `CustomFieldValuesSection` — apply
to bookings and clinical records with no new field-rendering code.

Value storage follows the `custom_values jsonb` column pattern rather than the
`banna_values` join table, matching how the appointment row already snapshots
its own data.

## 7. Routes

```
/[locale]/[orgSlug]/[space]/zeyara/
  page.tsx                          — clinic dashboard (today's schedule)
  appointments/                     — list, new, [id], calendar
  patients/                         — list, new, [id], [id]/edit, fields
  providers/                        — list, [id], [id]/availability
  services/                         — service catalog
  visits/                           — Phase 2
  analytics/
```

Each page is a thin shell that mounts `VerticalProvider vertical="zeyara"` around
a shared page body. The corresponding `/haraka/*` page mounts the same body with
`vertical="haraka"`.

## 8. Brand

```
Name:    Zeyara / زيارة  ("a visit")
Color:   --mod-zeyara: #0F766E   (deep teal — medical, distinct from
                                  Usool's #00695C at sidebar sizes)
```

## 9. Open questions

1. **Per-provider record isolation.** Should a provider see only their own
   patients' clinical records? Current RLS gives every org member select on
   appointments. Clinical data may warrant stricter. Deferred to Phase 2 review.
2. **Patient vs customer separation.** Zeyara reads `pos_customers`. If a mixed
   org must keep retail customers out of the patient list, a `customer_type`
   discriminator is the cheap answer. Not needed for clinic-only orgs.
3. **Reminder channel.** No notification transport exists for SMS/WhatsApp today
   (`notificationQueue` is in-app). Phase 4 needs a provider decision.
4. **Retention / medical records compliance.** Out of scope for Phase 1–4;
   flagged because clinical data has jurisdictional retention rules that audit
   logs alone may not satisfy.

## 10. Rollout sequencing

| Phase | Content | Ships behind |
|---|---|---|
| 1 | Vertical layer, feature key, permissions, nav, brand, routes, i18n | `features.zeyara` off for every existing org |
| 2 | `zeyara_visits` + notes + attachments | same flag |
| 3 | Custom fields on appointments/visits | same flag |
| 4 | Reminders + follow-ups | same flag |

Every phase is inert for existing orgs until `features.zeyara` is switched on
per-subscription, so `DevBranch` stays deployable throughout.

## 11. What shipped differently from this plan

Three things changed once the code met the codebase:

1. **Custom-field values use the existing join table, not a `jsonb` column.**
   §6 proposed `custom_values jsonb` on each row. The repo already has a
   generic `custom_field_values(record_type, record_id, field_id, value)` store
   (migration 0029) that the whole Banna stack reads and writes. Phase 3 is
   therefore two `CHECK` constraints and a widened TypeScript union — no new
   storage, no new rendering code.

2. **`requireHarakaModule` had to become vertical-aware.** §3 said Zeyara routes
   would not require `harakaModule: 'appointments'`. That was implemented on the
   client in Phase 1, but the shared API routes still called
   `requireHarakaModule`, which would have 403'd a Zeyara-only org out of its
   own appointments. Fixed at the gate (`ZEYARA_IMPLIED_MODULES`) rather than
   across 21 route files. Service *jobs* and service *vehicles* deliberately
   keep the strict check — a clinic never buys them.

3. **Reminders reuse the existing WhatsApp transport.** §9.3 flagged that no
   SMS/WhatsApp channel existed. It does: `lib/notifications/channels/whatsapp.ts`
   plus per-org credentials. Phase 4 rides it. The real constraint is not
   transport but **Meta template approval** — `appointment_reminder` and
   `follow_up_due` must be approved as Utility templates in the org's WhatsApp
   Business account before anything is delivered. The settings page says so
   in a warning banner rather than leaving a clinic to file a bug.

A fourth item is worth recording because it was a live defect, not a design
change: **the reminder sweep originally logged an attempt only *after* sending**,
so the hourly cron would have re-messaged every patient every hour. The sweep
now filters candidates through `withoutAlreadyReminded()` before sending; the
unique index on `(appointment_id, reminder_kind)` is the backstop, not the
mechanism.

## 12. Document Reports (added 2026-08-26)

Zeyara reaches the generic Document Reports module rather than growing its own.
It is the same templates + instances engine a Haraka retailer uses; only the
route root and the wording differ. See
[2026-08-26-reports-module-design.md §7](./2026-08-26-reports-module-design.md)
for the gate-by-gate change list. What it means here:

- `/zeyara/reports` and `/zeyara/reports/[reportId]` mount the same shared page
  bodies as their `/haraka` counterparts, via `VerticalProvider`.
- Reports are granted through the **`documentReports`** permission namespace on
  both surfaces, not a duplicated `zeyara.reports*` — the operation is
  identical and the module is not owned by either vertical. This is the
  documented exception to §4's "operation keys live in the vertical's
  namespace" rule, and the nav contract test names it explicitly.
- The `documentReports` **add-on** still gates the module. A clinic that holds
  `zeyara` but not the add-on sees no Reports nav item, no template builder,
  and no report section on the clinical record.
- The clinical record panel generates and lists reports anchored on the visit
  (`encounter_type = 'visit'`, migration 0085), so "what paperwork came out of
  this consultation" is answerable from the record itself.

Superadmin surfaces changed alongside: the per-org subscription page had **no
Zeyara toggle at all** — the feature key existed in `FEATURE_KEYS` and in the
package form, but the org-level Feature Overrides card never rendered it, so a
superadmin could ship a clinic package and still had no way to switch a single
existing org onto it. It now has its own module card, next to a cross-module
Document Reports card.
