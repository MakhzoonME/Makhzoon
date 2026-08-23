# Raseed — Inventory Management (رصيد)

**Brand color**: `#E65100` (deep orange)
**Arabic name**: رصيد
**Feature key**: `inventory`

---

## Overview

Raseed tracks stocked items — consumables, supplies, spare parts, products. It manages current stock quantities via ledger-based transactions (in / out / adjustment), tracks stock health (ok / low / out), supports barcode scanning, purchase orders, and physical stock audits.

---

## Data Models

### InventoryItem
```
id, organizationId
name (required), category, sku?, barcode?
unit (each | box | pack | pair | roll | liter | kg | meter | sheet | set — config-driven `inventory_unit` managed list, org-extensible)
quantityOnHand, minimumThreshold
location? (single "Storage Location" field, config-driven `inventory_storage_location` managed list)
supplier?, unitCost?, notes?, expiryDate?
stockStatus: 'ok' | 'low' | 'out'  ← computed: out=0, low<threshold, ok≥threshold (see Stock Status Logic below)
posEnabled?, posPrice?, taxRateId?
documents? (DocumentRef[] — receipts, private inventory-receipts bucket)
createdAt/By, updatedAt/By
```
`types/inventory.types.ts` has no `spaceId` field on the base `InventoryItem` type — it's threaded through ad-hoc as `& { spaceId?: string }` at the `lib/db/inventory.ts` layer, even though the DB column exists and is used for scoping.

> Note: the DB has a `reorder_quantity` column and a `inventory.reorderQty` translation string exists, but no form, type, or API field reads/writes it — there is no Reorder Quantity feature in the UI.

### InventoryTransaction
```
id, organizationId, spaceId, itemId, itemName
type: 'in' | 'out' | 'adjustment'
quantity, quantityBefore, quantityAfter
reason, note?
performedAt, performedBy/Email/Name/Role
```

### Purchase
```
id, organizationId, spaceId
supplierName, supplierContact?, invoiceNumber?, invoiceDate, receivedDate?
status: 'draft' | 'received' | 'cancelled'
lines: PurchaseLine[]  ← itemId?, itemName, sku, barcode, quantity, unitCost, taxRateId, taxAmount, lineTotal
subtotal, taxTotal, total
notes?, updateItemUnitCost (bool — updates last-cost on receive)
createdBy/Name/Email, updatedBy, receivedBy/Name
```

### StockAudit
```
id, organizationId, spaceId
title, notes?, status: 'draft' | 'in_progress' | 'completed'
totalItems, countedCount, pendingCount, varianceTotal
startedBy/Name, completedAt?
```

> As with `InventoryItem` above, `spaceId` is not actually declared on the base `InventoryTransaction`/`Purchase`/`StockAudit` TypeScript interfaces (`types/purchase.types.ts`, `types/stock-audit.types.ts`, `types/inventory.types.ts`) even though the DB columns exist and are used for space scoping at the query layer.

---

## Pages & UI

### Overview Page
**Route**: `/{locale}/{orgSlug}/{space}/raseed`

- Metric cards: total items, items in-stock (ok), low-stock count, out-of-stock count, expiring-soon count (within 30 days) — each links to a filtered Stock Items list.
- Quick action: "Add Item" only (`app/[locale]/[orgSlug]/[space]/raseed/page.tsx`) — there is no "Record Transaction" or "New Purchase" quick action on the overview page.
- A stock-items preview table.

### Stock Items (List)
**Route**: `/{locale}/{orgSlug}/{space}/raseed/list`

**Layout**:
- `PageHeader` with "Stock Items" title + "Add Item" button + "Export CSV" button.
- `FilterBar`: search by name/SKU/barcode, stock status filter (ok / low / out), category filter, location filter.
- `DataTable` with columns:
  - Name (+ SKU/barcode if present)
  - Category
  - Unit
  - Quantity on Hand (shown in bold; red if out, amber if low)
  - Stock Status badge (green/amber/red)
  - Min Threshold
  - Location
  - Actions: Delete (row click navigates to the item detail page; there is no separate "Record Transaction" row action)
- Row checkboxes for bulk actions (delete, move, duplicate — gated by permissions, see Permissions section).

`quantityOnHand` is a **stored column** on `inventory_items`, not ledger-derived — each transaction does a read-modify-write that updates it directly (`applyInventoryTransaction()` in `lib/db/inventory.ts`), rather than the UI summing transactions at query time.

**Empty state**: "No inventory items yet. Add your first item."

### Add / Edit Inventory Item
**Routes**: `/{locale}/{orgSlug}/{space}/raseed/new` (add), `/{locale}/{orgSlug}/{space}/raseed/[itemId]/edit` (edit) — `/{locale}/{orgSlug}/{space}/raseed/[itemId]` is the read/detail view, not the edit form.

**Form fields** (`components/inventory/InventoryItemForm.tsx`, not split into named sections in code): Item Name (required), Category (managed list `inventory_category`), SKU/Code, Unit (managed list `inventory_unit`), Quantity on Hand, Minimum Threshold, Unit Cost, Storage Location (managed list `inventory_storage_location` — a single field, not two), Supplier (free text, not a managed list), Expiry Date, Barcode (manual entry or HID scanner, Enter key suppressed so a scan doesn't submit the form), Tax Rate, POS Enabled toggle + POS Price (shown when Haraka is enabled), Notes, and a document upload for receipts. There is no "Reorder Quantity" field.

Item detail page also shows:
- **Transaction History** — all in/out/adjustment movements with timestamp, type, quantity, reason, performer.
- An inline **"Adjust Stock"** form in the sidebar (not a modal, and not reachable from the list) — see below.
- **Stock Audits** tab — audits this item has appeared in.

### Adjust Stock (inline form)

Lives in the sidebar of the item detail page (`app/[locale]/[orgSlug]/[space]/raseed/[itemId]/page.tsx`), not a separate route or modal, and there is no equivalent action from the list page. Fields:
- Type: In / Out / Set Absolute (labeled "adjustment" internally; segmented dropdown)
- Quantity — for In/Out this is a delta; for **Adjustment it is the new absolute quantity**, not a delta (`applyInventoryTransaction()` sets `newQty = quantity` directly for type `'adjustment'`).
- Reason (text — required)
- Note (optional)
- No date field — `performedAt` is always "now"; there is no backdating option.

On submit, creates an `InventoryTransaction` record and updates `quantityOnHand` on the item.

### Purchases
**Route**: `/{locale}/{orgSlug}/{space}/raseed/purchases`

Lists all purchase orders with columns: Supplier, Invoice Number, Invoice Date, Total, Status badge, Actions.

Gated by `raseed.purchasesView` permission.

**Create Purchase**:
**Route**: `/{locale}/{orgSlug}/{space}/raseed/purchases/new`

Multi-line form:
- **Header**: Supplier Name, Supplier Contact, Invoice Number, Invoice Date.
- **Line Items table**: Add rows with Item picker (searches existing inventory items by name/SKU/barcode), quantity, unit cost, tax rate. Each row shows line total. Running subtotal / tax / total shown at bottom.
- **Options**: "Update item unit cost on receive" toggle — if on, receiving this PO updates each item's `unitCost` field.
- **Notes**: optional.
- Save as Draft or Save & Receive buttons.

**Purchase Detail**:
**Route**: `/{locale}/{orgSlug}/{space}/raseed/purchases/[purchaseId]`

Shows the full PO with line items, totals, and status. Actions:
- **Receive** (if draft) — marks as received and triggers stock-in transactions for each line.
- **Cancel** — marks as cancelled (no stock changes).
- **Edit** (if draft only).
- **Delete** (if draft or cancelled, gated by `raseed.purchasesDelete`).

### Stock Audits
**Route**: `/{locale}/{orgSlug}/{space}/raseed/audits`

Lists all stock audits with columns: Title, Status, Items, Counted, Pending, Variance, Date.

**Create Stock Audit**:
**Route**: `/{locale}/{orgSlug}/{space}/raseed/audits/new`

- Title (required), Notes (optional).
- On submit, all items currently in the space are pulled into the audit as `pending` audit items with their expected quantities.

**Stock Audit Detail**:
**Route**: `/{locale}/{orgSlug}/{space}/raseed/audits/[auditId]`

- Progress bar: counted / total.
- Filter: pending only toggle.
- Table of audit items: Item Name, SKU, Category, Unit, Expected Qty, Counted Qty (editable inline number input), Note, Status.
- Each row: user types the counted quantity → status changes to `counted`.
- **Complete Audit** button:
  - Shows a summary of variances (expected vs counted).
  - For each item: Apply variance (create adjustment transaction), Skip, or enter a manual override quantity.
  - On confirm: creates adjustment transactions for all applied items; marks audit as `completed`.

---

## Stock Status Logic

Computed server-side in `stockStatus()` (`lib/db/inventory.ts`):

| Condition | Status |
|-----------|--------|
| `quantityOnHand === 0` | `out` (red) |
| `quantityOnHand < minimumThreshold` | `low` (amber) |
| `quantityOnHand >= minimumThreshold` (and > 0) | `ok` (green) |

Note: a quantity exactly equal to the threshold is `ok`, not `low` — the comparison is strict `<`, not `<=`.

---

## Permissions

Permission module key is `raseed` (feature key `inventory`), defined in `types/user-permissions.types.ts` — there is no `inventory.*` or `purchases.*` permission module; purchases operations live under `raseed.purchases*`. There are no dedicated bulk permission keys — bulk delete/move/duplicate on the Stock Items list reuse `delete`/`update`/`create` respectively (`app/[locale]/[orgSlug]/[space]/raseed/list/page.tsx`).

| Key | Admin | Staff | Description |
|-----|-------|-------|-------------|
| `raseed.view` | ✅ | ✅ | View stock items list |
| `raseed.create` | ✅ | ❌ | Add new items |
| `raseed.update` | ✅ | ❌ | Edit items |
| `raseed.delete` | ✅ | ❌ | Delete items |
| `raseed.export` | ✅ | ❌ | Export CSV |
| `raseed.requestRefill` | ✅ | ❌ | Request refill |
| `raseed.transactionsView` | ✅ | ❌ | View stock movements |
| `raseed.adjustStockView` | ✅ | ❌ | View stock adjustments |
| `raseed.adjustStockUpdate` | ✅ | ❌ | Record in/out/adjustment |
| `raseed.purchasesView` | ✅ | ❌ | View purchases |
| `raseed.purchasesCreate` | ✅ | ❌ | Create purchase orders |
| `raseed.purchasesUpdate` | ✅ | ❌ | Edit draft purchases |
| `raseed.purchasesDelete` | ✅ | ❌ | Delete draft/cancelled purchases |
| `raseed.purchasesReceive` | ✅ | ❌ | Mark purchase as received (triggers stock-in) |
| `raseed.stockAuditView` | ✅ | ❌ | View stock audits |
| `raseed.stockAuditStart` | ✅ | ❌ | Start a stock audit |
