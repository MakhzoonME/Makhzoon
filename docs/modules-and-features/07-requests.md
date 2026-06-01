# Requests

**Feature key**: `requests`

---

## Overview

The Requests module provides a structured approval workflow. Staff members submit requests when they need something — a refill of inventory, retirement of an asset, purchase of a new asset, or extension of a warranty. Admins approve or reject. Every decision is recorded in the audit trail.

---

## Request Types

| Type | Description |
|------|-------------|
| `REFILL` | Request to restock an inventory item |
| `RETIRE` | Request to retire an asset |
| `BUY_NEW` | Request to purchase a new asset |
| `EXTEND_WARRANTY` | Request to extend an existing warranty |

---

## Status Lifecycle

```
PENDING → APPROVED
         ↘ REJECTED
```

Only users with `requests.approve` permission can approve or reject.

---

## Data Model

```
Request
  id, organizationId, spaceId
  type: 'REFILL' | 'RETIRE' | 'BUY_NEW' | 'EXTEND_WARRANTY'
  assetId?, assetName?
  warrantyId?
  inventoryItemId?, inventoryItemName?
  description (required — explains the need)
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  decisionBy?, decisionAt?
  createdAt/By/Name/Email, updatedAt/By
```

---

## Pages & UI

### Overview Page
**Route**: `/{locale}/{orgSlug}/{space}/requests`

- Metric cards: total requests, pending, approved, rejected.
- Quick-action: "Submit Request" button.
- Link to the full list.

### Requests List
**Route**: `/{locale}/{orgSlug}/{space}/requests/list`

**Layout**:
- `PageHeader` with "Requests" + "Submit Request" button (gated by `requests.create`).
- `FilterBar`: search by description, type filter, status filter.
- `DataTable` with columns:
  - Type (badge with icon)
  - Subject (asset name / item name / description excerpt)
  - Description
  - Status badge (PENDING = amber, APPROVED = green, REJECTED = red)
  - Submitted By
  - Submitted At
  - Decision By
  - Actions: Approve / Reject (gated by `requests.approve`), Delete

**Staff view**: Staff see only their own requests. Admins see all.

Bulk actions: move to space, duplicate to space (gated by `requests.bulk_move`, `requests.bulk_duplicate`).

**Empty state**: "No requests yet. Submit your first request."

### Submit Request (New)
**Route**: Via modal or inline form on the list/overview page.

**Form**:
- **Type** (segmented control or dropdown): REFILL / RETIRE / BUY_NEW / EXTEND_WARRANTY.
- **Linked Item** (conditional based on type):
  - REFILL → Inventory item picker (combobox).
  - RETIRE → Asset picker.
  - BUY_NEW → Free-text asset description.
  - EXTEND_WARRANTY → Warranty picker.
- **Description** (required textarea — explain the need/justification).

Footer: Cancel + Submit.

### Approve / Reject

Admin presses "Approve" or "Reject" on a request row:
- Approval: status → `APPROVED`, `decisionBy` and `decisionAt` are recorded.
- Rejection: status → `REJECTED` with same metadata.
- Audit log entry is written for each decision.

---

## Permissions

| Key | Admin | Staff | Description |
|-----|-------|-------|-------------|
| `requests.view` | ✅ | ✅ | View requests (staff: own only) |
| `requests.create` | ✅ | ✅ | Submit new requests |
| `requests.approve` | ✅ | ❌ | Approve or reject pending requests |
| `requests.bulk_move` | ✅ | ❌ | Bulk move to space |
| `requests.bulk_duplicate` | ✅ | ❌ | Bulk duplicate to space |
