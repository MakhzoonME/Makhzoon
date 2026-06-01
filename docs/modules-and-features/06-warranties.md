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
  createdAt/By, updatedAt/By
```

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
- `PageHeader` with "Warranties" title + "Add Warranty" button (gated by `warranties.create`).
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

| Key | Admin | Staff | Description |
|-----|-------|-------|-------------|
| `warranties.view` | ✅ | ✅ | View warranties list |
| `warranties.create` | ✅ | ❌ | Add a new warranty |
| `warranties.update` | ✅ | ❌ | Edit an existing warranty |
| `warranties.delete` | ✅ | ❌ | Delete a warranty |
