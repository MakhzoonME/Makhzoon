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
id, organizationId, spaceId
name (required), category, sku?, barcode?
unit (each | box | pack | pair | roll | liter | kg | meter | sheet | set)
quantityOnHand, minimumThreshold, reorderQuantity?
location?, supplier?, unitCost?, notes?
stockStatus: 'ok' | 'low' | 'out'  ← computed: out=0, low≤threshold, ok>threshold
posEnabled?, posPrice?, taxRateId?
createdAt/By, updatedAt/By
```

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

---

## Pages & UI

### Overview Page
**Route**: `/{locale}/{orgSlug}/{space}/raseed`

- Metric cards: total items, items in-stock (ok), low-stock count, out-of-stock count.
- Quick actions: "Add Item", "Record Transaction", "New Purchase".
- Links to sub-sections: Stock Items, Purchases, Stock Audits.

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
  - Actions: Edit, Record Transaction, Delete
- Row checkboxes for bulk actions (delete, move, duplicate — gated by permissions).

Quantity shown is ledger-derived (sum of all transactions), not a stored field.

**Empty state**: "No inventory items yet. Add your first item."

### Add / Edit Inventory Item
**Routes**: `/{locale}/{orgSlug}/{space}/raseed/new` | `/{locale}/{orgSlug}/{space}/raseed/[itemId]`

**Form sections**:
1. **Basic Info**: Name (required), Category (managed list), SKU, Barcode.
2. **Stock Settings**: Unit (dropdown), Minimum Threshold (number), Reorder Quantity (number).
3. **Cost & Location**: Unit Cost, Location (managed list), Storage Location, Supplier (managed list).
4. **POS Settings** (shown if Haraka feature enabled): POS Enabled toggle, POS Price, Tax Rate.
5. **Notes**: textarea.

Item detail page also shows:
- **Transaction History** tab — all in/out/adjustment movements with timestamp, type, quantity delta, reason, performer.
- **Record Transaction** button — opens inline modal to record in/out/adjustment.
- **Stock Audits** tab — audits this item has appeared in.

### Record Transaction Modal

Available from the item detail page and the list row action. Fields:
- Type: In / Out / Adjustment (segmented control)
- Quantity (number, positive)
- Reason (text — required)
- Note (optional textarea)
- Date (defaults to now)

On submit, creates an `InventoryTransaction` record and updates `quantityOnHand` on the item.

### Purchases
**Route**: `/{locale}/{orgSlug}/{space}/raseed/purchases`

Lists all purchase orders with columns: Supplier, Invoice Number, Invoice Date, Total, Status badge, Actions.

Gated by `purchases.view` permission.

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
- **Delete** (if draft or cancelled, gated by `purchases.delete`).

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

| Condition | Status |
|-----------|--------|
| `quantityOnHand === 0` | `out` (red) |
| `quantityOnHand <= minimumThreshold` | `low` (amber) |
| `quantityOnHand > minimumThreshold` | `ok` (green) |

---

## Permissions

| Key | Admin | Staff | Description |
|-----|-------|-------|-------------|
| `inventory.view` | ✅ | ✅ | View stock items list |
| `inventory.create` | ✅ | ❌ | Add new items |
| `inventory.update` | ✅ | ❌ | Edit items |
| `inventory.delete` | ✅ | ❌ | Delete items |
| `inventory.transactions` | ✅ | ❌ | Record in/out/adjustment |
| `inventory.audits` | ✅ | ❌ | Create and manage stock audits |
| `inventory.bulk_delete` | ✅ | ❌ | Bulk delete |
| `inventory.bulk_move` | ✅ | ❌ | Bulk move to space |
| `inventory.bulk_duplicate` | ✅ | ❌ | Bulk duplicate to space |
| `purchases.view` | ✅ | ❌ | View purchases |
| `purchases.create` | ✅ | ❌ | Create purchase orders |
| `purchases.update` | ✅ | ❌ | Edit draft purchases |
| `purchases.delete` | ✅ | ❌ | Delete draft/cancelled purchases |
| `purchases.receive` | ✅ | ❌ | Mark purchase as received (triggers stock-in) |
