# Warranties

**Feature key**: `warranties`

---

## Overview

The Warranties module tracks vendor warranties for assets and inventory items. It sends automated email reminders at 30, 14, and 7 days before expiration via a Cloudflare Workers cron job.

---

## Data Model

```
Warranty
  id, organizationId, spaceId
  assetId?, assetName?          ← linked to an asset (Usool)
  inventoryItemId?, inventoryItemName?  ← OR linked to an inventory item (Raseed)
  vendor (required)
  startDate (required), endDate (required)
  reminder (bool — if true, sends expiry alerts)
  notes?
  documents? (DocumentRef[] — warranty paper attachments, private `warranty-documents` bucket)
  createdAt/By, updatedAt/By
```

Note: `spaceId` and `documents` are not in the committed migration for `public.warranties` (`supabase/migrations/0004_modules.sql`) but are present in production (per `db-backups/*/warranties_rows.csv`) and are read/written by `lib/db/warranties.ts` — schema drift between the migrations directory and the live DB, not a doc error.

A warranty can be attached to either an asset or an inventory item, not both.

---

## Expiry Status (computed)

| Condition | Status |
|-----------|--------|
| `endDate < today` | Expired (red) |
| `endDate <= today + 30 days` | Expiring Soon (amber) |
| `endDate > today + 30 days` | Active (green) |

---

## Pages & UI

### Warranties List
**Route**: `/{locale}/{orgSlug}/{space}/warranties`

**Layout**:
- `PageHeader` with "Warranties" title + "Add Warranty" button (gated by `usool.warrantiesCreate`).
- `FilterBar`: search by vendor name or asset name, status filter (active / expiring soon / expired).
- `DataTable` with columns:
  - Asset / Item Name (clickable link to asset or inventory item)
  - Vendor
  - Start Date
  - End Date
  - Status badge (Active / Expiring Soon / Expired with color)
  - Reminder toggle (on/off)
  - Actions: Edit, Delete

**Empty state**: "No warranties tracked yet. Add your first warranty."

### Add Warranty
**Route**: `/{locale}/{orgSlug}/{space}/warranties/new`

**Form**:
- **Type selector**: Asset warranty or Inventory Item warranty (segmented control).
- **Asset / Item picker**: combobox searching assets or inventory items in the space.
- **Vendor** (required text input).
- **Start Date** (date picker, required).
- **End Date** (date picker, required — must be after start date).
- **Enable Reminder** (toggle — if on, triggers the cron alert emails).
- **Notes** (textarea).

Footer: Cancel + Save.

### Edit Warranty
**Route**: `/{locale}/{orgSlug}/{space}/warranties/[warrantyId]`

Same form as Add, pre-filled with existing values.

---

## Cron Alerts

**Endpoint**: `GET /api/cron/warranty-alerts`
**Auth**: `Authorization: Bearer {CRON_SECRET}`
**Trigger**: Cloudflare Workers cron in `workers/cron/`

Logic:
1. Queries all warranties where `reminder = true` and `endDate` is within 30 days from now.
2. Groups warranties by organization.
3. For each org, sends one email to all org admins listing the expiring warranties and their days remaining.
4. Logs a `WARRANTY_ALERT_SENT` audit event.
5. Sends alerts at 30, 14, and 7 days (the cron runs daily; each run only emails for the exact thresholds to avoid duplicate alerts).

---

## Permissions

Warranties are not a standalone permission module — they are operations nested inside the **Usool (Assets)** module in `types/user-permissions.types.ts`, and are enforced with those keys (e.g. `requirePermission(tenant.user, 'usool', 'warrantiesView')` in `app/api/warranties/route.ts`):

| Key | Admin | Staff | Description |
|-----|-------|-------|-------------|
| `usool.warrantiesView` | ✅ | ✅ | View warranties list |
| `usool.warrantiesCreate` | ✅ | ❌ | Add a new warranty |
| `usool.warrantiesUpdate` | ✅ | ❌ | Edit an existing warranty |
| `usool.warrantiesDelete` | ✅ | ❌ | Delete a warranty |

Each also carries `featureKey: 'warranties'` for the module toggle, so gating still reads as "warranties" in the org's feature list even though the permission keys live under `usool`.
