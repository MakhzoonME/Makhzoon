# Haraka — Service Vehicles & Plate OCR (المركبات وقراءة اللوحات)

**Parent module**: Haraka (حركة) — Feature key: `pos`, sub-module: `services`
**Add-on / feature flag**: `vehicleIntake` (car-care vertical only — gated via `requireFeature(tenant, 'vehicleIntake')` and `requireAddOn(tenant, 'vehicleIntake')`, backed by `PackageAllowances.vehicleIntakeIncluded`)
**Permission keys**: reuses Service Jobs' keys — `haraka.servicesView` (read), `haraka.serviceJobsCreate` / `haraka.serviceJobsUpdate` (write, either grants access) — there are no dedicated vehicle permission keys
**Brand color**: `#C2185B` (inherited from Haraka, via `--mod-haraka`)

---

## Overview

Service Vehicles is not a standalone feature with its own list/detail pages — it's a small supporting module that backs two entry points:

1. **New Service Job intake** (`app/[locale]/[orgSlug]/[space]/haraka/service-jobs/new/page.tsx`) — capture or type a plate number, resolve/create the `haraka_service_vehicles` row, and link it to the job via `haraka_service_jobs.vehicle_id`.
2. **Customer custom fields** (Banna) — a `plate_reader`-type custom field renders a repeatable plate list (`PlateReaderFieldInput` in `components/banna/CustomFieldValuesSection.tsx`); saving it upserts into the same `haraka_service_vehicles` table via `BannaValuesService`, not plain JSON. Both entry points converge on the same rows, so a plate captured on a customer profile shows up as a "saved vehicle" on the next service job for that customer.

Key characteristics:
- A vehicle is uniquely identified by `(organization_id, plate_number)` — one row per plate per org, optionally linked to a `pos_customers` row.
- **Find-or-create by plate** is the core operation (`ServiceVehiclesService.findOrCreateByPlate`): an exact plate match returns the existing vehicle (and, if unmatched to a customer yet, the UI auto-fills the customer from the vehicle's owner); no match creates a new row.
- **Plate OCR** is a server-side proxy to **Plate Recognizer** (platerecognizer.com), a purpose-built plate-recognition API — not generic OCR. It replaced an earlier client-side Tesseract.js approach that produced misreads/hallucinations on noisy or watermarked images.
- The OCR API key is a single **global** credential (encrypted, stored in `platform_notification_config`, set by Superadmin) — shared across every organization, not per-tenant.
- Every OCR call is rate-limited per tenant (30 calls / 60s via `rateLimitTenant`) since the provider bills per call.
- Every OCR call is logged per-org (`haraka_plate_ocr_usage_log`) so Superadmin can see usage broken down by organization, since Plate Recognizer's own account stats are account-wide only.
- Camera capture (`PlateCaptureDialog`) just streams `getUserMedia` video and grabs one still frame as a JPEG data URI on tap — no live decode loop (unlike the barcode `CameraScannerDialog`).
- The OCR response includes alternate `candidates` (other plate readings ranked by confidence, excluding the top pick) so the UI can offer a quick-pick when the top guess looks wrong.

---

## Data Models

### HarakaServiceVehicle (haraka_service_vehicles)
```
id, organizationId
customerId?         ← FK to pos_customers, ON DELETE SET NULL
plateNumber          ← UNIQUE per (organizationId, plateNumber); stored/compared uppercase
make?, model?, color?
notes?
createdAt, createdBy?
updatedAt, updatedBy?
```

### haraka_service_jobs.vehicle_id
`ALTER TABLE haraka_service_jobs ADD COLUMN vehicle_id uuid REFERENCES haraka_service_vehicles(id) ON DELETE SET NULL` — added in the same migration (0059) as the vehicles table. Indexed with `WHERE vehicle_id IS NOT NULL`.

### haraka_plate_ocr_usage_log
```
id, organizationId
plateFound            ← boolean, whether the OCR call returned a plate
createdAt
```
One row per OCR call. Service-role only — no org-facing RLS policy (internal usage/billing data).

### PlateOcrResult (not persisted — API response shape)
```
plateNumber: string | null    ← uppercased top reading
confidence:  number | null    ← top reading's score
candidates:  { plate, score }[]   ← alternate readings, top pick excluded
```

---

## OCR Provider Config

Stored on the shared `platform_notification_config` row (via `PlatformNotificationConfigRepository`), managed under Superadmin → Notifications:
```
ocrProvider     ← defaults to 'fastplateocr' at the DB level, 'platerecognizer' in the repo's read fallback
ocrApiKeyEnc    ← encrypted, decrypted only server-side, never sent to the client
```
Note: `ocrProvider` is stored but not actually branched on anywhere — `lib/modules/haraka/service-vehicles/plate-recognizer.ts` always calls Plate Recognizer's API (`api.platerecognizer.com`) regardless of the stored value. There is only one implemented provider despite the column suggesting pluggability, and the two hardcoded default strings (`fastplateocr` in the migration vs. `platerecognizer` in the repository fallback) disagree with each other.

If no `ocrApiKey` is configured, the OCR route returns `409` with a message pointing the org to ask a superadmin to set it up.

---

## Key Files

| Layer | Path |
|---|---|
| DB migration (vehicles table, job FK) | `supabase/migrations/0059_haraka_service_vehicles.sql` |
| DB migration (OCR usage log) | `supabase/migrations/0066_plate_ocr_usage_log.sql` |
| Types | `types/pos.types.ts` — `HarakaServiceVehicle` |
| Schemas | `lib/modules/haraka/service-vehicles/schemas.ts` |
| Repository | `lib/modules/haraka/service-vehicles/service-vehicles.repository.ts` |
| Service | `lib/modules/haraka/service-vehicles/service-vehicles.service.ts` |
| Plate Recognizer client | `lib/modules/haraka/service-vehicles/plate-recognizer.ts` |
| OCR usage log repo | `lib/modules/haraka/service-vehicles/ocr-usage.repository.ts` |
| API list/create | `app/api/haraka/service-vehicles/route.ts` |
| API detail/update | `app/api/haraka/service-vehicles/[vehicleId]/route.ts` |
| API OCR proxy | `app/api/haraka/service-vehicles/ocr/route.ts` |
| API Superadmin usage | `app/api/superadmin/notification-config/ocr-usage/route.ts` |
| Notification config repo (shared OCR key) | `lib/platform/notification-config.repository.ts` |
| Hooks | `hooks/haraka/useServiceVehicles.ts` (`useCustomerVehicles`, `useOcrPlate`, `useFindOrCreateVehicle`) |
| Camera capture UI | `components/haraka/PlateCaptureDialog.tsx` |
| Service-job intake UI (primary consumer) | `app/[locale]/[orgSlug]/[space]/haraka/service-jobs/new/page.tsx` |
| Customer custom-field UI (secondary consumer) | `components/banna/CustomFieldValuesSection.tsx` — `PlateReaderFieldInput`, field type `plate_reader` |
| Custom-field sync to vehicles table | `lib/modules/banna/services/banna-values.service.ts` |

No dedicated vehicles list/detail page exists — vehicles are only browsable indirectly, as "saved vehicles" chips on the New Service Job page (`useCustomerVehicles`, filtered by `customerId`).

---

## Permissions

Checked in `lib/modules/haraka/service-vehicles/service-vehicles.service.ts` against the `haraka` permission module:

| Key | Gates |
|---|---|
| `haraka.servicesView` | List/detail reads (`list`, `getById`) |
| `haraka.serviceJobsCreate` **or** `haraka.serviceJobsUpdate` | All writes — `create`, `update`, `findOrCreateByPlate` (either key is sufficient) |

API routes additionally gate on:
- `requireFeature(tenant, 'pos')` and `requireFeature(tenant, 'vehicleIntake')` — legacy feature flags
- `requireHarakaModule(tenant, 'services')` — subscription module gating (list/detail/create/update routes only, not the OCR route)
- `requireAddOn(tenant, 'vehicleIntake')` — add-on entitlement gating (all vehicle + OCR routes)

The OCR route (`/api/haraka/service-vehicles/ocr`) has no `hasPermission` check of its own beyond the feature/add-on gates above — any authenticated tenant member with the `vehicleIntake` add-on can call it, regardless of `servicesView`/`serviceJobsCreate`.

---

## Managed Lists

None — plate numbers, make/model/color are free-text fields, not managed-list-backed.
