# Usool — Asset Management (أصول)

**Brand color**: `#00695C` (deep teal)
**Arabic name**: أصول
**Feature key**: `assets`

---

## Overview

Usool is the fixed-asset register. It tracks every physical and non-physical asset owned by the organization — hardware, furniture, devices, software licenses, vehicles, etc. Every action on an asset is logged in the audit trail.

---

## Data Model

```
Asset
  id, organizationId, spaceId
  name (required), category, status (config-driven managed list)
  serialNumber?, purchaseDate?, purchaseCost?
  assignedTo?, location?, notes?
  createdAt/By/Email/Name/Role, updatedAt/By/Email/Name/Role
```

Asset statuses are **config-driven** via the `asset_status` managed list. Platform defaults: Active, Inactive, Maintenance, Retired. Orgs can add custom statuses. The retire flow and checkout logic specifically key off `'Active'` and `'Retired'` values.

---

## Pages & UI

### Overview Page
**Route**: `/{locale}/{orgSlug}/{space}/usool`

A summary page showing:
- Key metrics cards: total assets, active count, retired count, recently added.
- Quick-action buttons: "Add Asset", "Import Assets".
- Links to the Asset Register and Audits sub-pages.
- Dark mode: metric cards use `bg-surface-card dark:bg-gray-800`; value text uses primary color.

### Asset Register (List)
**Route**: `/{locale}/{orgSlug}/{space}/usool/list`

**Layout**:
- `PageHeader` with title "Asset Register" + "Add Asset" button (gated by `assets.create`) + "Import" button (gated by `assets.import`) + "Export CSV" button.
- `FilterBar` with search (by name/serial), status filter (dropdown from managed list), category filter, location filter.
- `DataTable` with columns:
  - Name (clickable → asset detail)
  - Category
  - Status (colored badge from managed list color)
  - Serial Number
  - Assigned To
  - Location
  - Purchase Date
  - Actions (Edit, Delete — gated by permissions)
- Row selection checkboxes appear when `assets.bulk_delete`, `assets.bulk_move`, or `assets.bulk_duplicate` permissions are present → activates the **BulkActionsBar** at the bottom.
- Pagination (if large set).

**Empty state**: Illustration + "No assets yet. Add your first asset." CTA.

### Add / Edit Asset
**Routes**: `/{locale}/{orgSlug}/{space}/usool/new` (add), `/{locale}/{orgSlug}/{space}/usool/[assetId]` (edit)

**Form layout** (single column on mobile, two-column grid on desktop):
- **Name** (required text input)
- **Category** (combobox from `asset_category` managed list)
- **Status** (combobox from `asset_status` managed list — defaults to first active status)
- **Serial Number** (optional text)
- **Purchase Date** (date picker)
- **Purchase Cost** (number input with currency symbol)
- **Assigned To** (text — name of person holding the asset)
- **Location** (combobox from `location` managed list)
- **Notes** (textarea)

Footer: Cancel + Save buttons. Validation errors appear inline below each field.

The asset detail page (edit route) also shows:
- **QR Code** section — generates and downloads a QR code with the asset ID.
- **Checkout History** tab — list of all checkout/check-in events.
- **Maintenance Records** tab — list of service/repair/inspection events.
- **Asset Notes** tab — free-form timestamped notes.
- **Audit Trail** — button linking to audit logs filtered to this asset.

### Asset Audits (Physical Count)
**Route**: `/{locale}/{orgSlug}/{space}/usool/audits`

Lists all physical asset audits for this space with columns: Title, Status (badge), Found, Missing, Pending, Started By, Date.

**Create Audit**:
- Route: `/{locale}/{orgSlug}/{space}/usool/audits/new`
- Form: Title + optional notes. On submit, all currently active assets in the space are pulled into the audit as `pending` items.

**Audit Detail**:
- Route: `/{locale}/{orgSlug}/{space}/usool/audits/[auditId]`
- Status lifecycle: `draft` → `in_progress` → `completed`.
- Table of audit items: asset name, category, serial, location, assigned-to, status (pending / found / missing).
- Each row has "Found" and "Missing" action buttons with optimistic UI update.
- A progress bar shows counted vs total.
- "Complete Audit" button finalizes the audit and writes results to the audit log.

### Import Assets
**Route**: `/{locale}/{orgSlug}/{space}/usool/import`

- Upload zone (drag-and-drop or file picker) accepting `.csv` files.
- Download sample CSV template link.
- Validation step: shows a preview table with valid rows highlighted green and invalid rows highlighted red with error reason.
- Confirm import button to create all valid assets in bulk.

---

## Checkout / Check-in

Accessible from the asset detail page (gated by `assets.checkout`):
- **Check Out** — records who the asset was loaned to and when.
- **Check In** — marks the asset as returned.
- History tab shows all checkout events with timestamps.
- An asset that is checked out shows a "Checked Out" badge.

---

## Maintenance Records

Accessible from the asset detail page (gated by `assets.maintenance`):
- Add maintenance record: type (Service / Repair / Inspection — from `maintenance_type` managed list), date, cost, notes.
- Records shown in reverse chronological order.

---

## Asset Notes

Accessible from the asset detail page (gated by `assets.notes`):
- Free-form notes with timestamp and author.
- Rendered as a chronological feed.

---

## QR Codes

From the asset detail page:
- "Download QR" generates a QR code image encoding the asset ID.
- QR code can be printed and attached to the physical asset.
- Scanning the QR code (with a QR reader) opens the asset detail page directly.

---

## Permissions

| Key | Admin default | Staff default | Description |
|-----|--------------|---------------|-------------|
| `assets.view` | ✅ | ✅ | See the asset register |
| `assets.create` | ✅ | ❌ | Add new assets |
| `assets.update` | ✅ | ❌ | Edit existing assets |
| `assets.delete` | ✅ | ❌ | Delete assets |
| `assets.import` | ✅ | ❌ | Bulk import via CSV |
| `assets.checkout` | ✅ | ❌ | Check out / check in assets |
| `assets.maintenance` | ✅ | ❌ | Add maintenance records |
| `assets.notes` | ✅ | ❌ | Add asset notes |
| `assets.bulk_delete` | ✅ | ❌ | Bulk delete selected assets |
| `assets.bulk_move` | ✅ | ❌ | Bulk move to another space |
| `assets.bulk_duplicate` | ✅ | ❌ | Bulk duplicate to another space |

---

## Export

"Export CSV" on the list page exports all assets (filtered or all) as a CSV file with all fields including audit metadata (created by, updated by, etc.).
