# Audit Logs

**Feature key**: `auditLogs`
**Permission**: `auditLogs.view`

---

## Overview

Every mutating action in the app writes an immutable audit log entry. Audit logs are the source of truth for who did what, when, and what the data looked like before and after.

---

## Data Model

```
AuditLog
  id, organizationId, spaceId (nullable — org-level actions have no spaceId)
  userId, role
  action (string — e.g. ASSET_CREATED, WARRANTY_UPDATED, REQUEST_APPROVED)
  module (string — e.g. 'assets', 'inventory', 'pos')
  recordId, recordName? (the affected record's ID and display name)
  oldValue? (JSON — state before the mutation)
  newValue? (JSON — state after the mutation)
  timestamp
  transferMode? (bool — true if action was taken by a superadmin in transfer mode)
  userDisplayName? (enriched)
  recordName? (enriched)
  orgName? (enriched — for superadmin global view)
  spaceName? (enriched)
```

`spaceId` is typed optional (`types/audit-log.types.ts`), but `lib/audit/logger.ts` documents it as required in practice ("Required after Script 3 (audit_logs.space_id NOT NULL)") — org-level actions without a space are effectively no longer expected.

---

## Pages & UI

### Org Audit Logs
**Route**: `/{locale}/{orgSlug}/{space}/audit-logs`

**Layout**:
- `PageHeader` with "Audit Logs" title + "Export CSV" button.
- **Scope toggle** (segmented control): "This Space" | "This Organization". Space scope shows events in the active space only; Org scope shows all events across all spaces in the org.
- `FilterBar`:
  - Search (by record name or user name)
  - Module filter (assets, inventory, pos, warranties, requests, etc.)
  - Action filter (created, updated, deleted, etc.)
  - Date range filter
- `DataTable` with columns:
  - Timestamp
  - User (display name + role badge)
  - Action (human-readable badge — ASSET_CREATED = "Created Asset")
  - Module badge
  - Record (name of the affected record, clickable link where applicable)
  - Transfer Mode badge (if applicable)
  - "View Details" expand → shows `oldValue` / `newValue` diff in a JSON diff viewer
- Pagination.

**Empty state**: "No activity logged yet."

### Superadmin Global Audit Logs
**Route**: `/{locale}/superadmin/audit-logs`

Same layout as org audit logs but:
- Scope shows all organizations.
- Extra column: Organization Name.
- Extra filter: Organization picker.
- Accessible only to superadmin roles.

---

## Actions logged

Every API route that mutates data calls `lib/audit/logger.ts → writeAuditLog()`. Examples:

| Action | Description |
|--------|-------------|
| `ORGANIZATION_CREATED` | New org created by superadmin |
| `ASSET_CREATED` | Asset added |
| `ASSET_UPDATED` | Asset fields changed (old/new values stored) |
| `ASSET_DELETED` | Asset removed |
| `ASSET_CHECKED_OUT` | Asset checked out to someone |
| `INVENTORY_TRANSACTION_CREATED` | Stock in/out/adjustment |
| `PURCHASE_RECEIVED` | Purchase order marked received |
| `STOCK_AUDIT_COMPLETED` | Stock audit finalized |
| `WARRANTY_CREATED` | New warranty added |
| `WARRANTY_UPDATED` | Warranty edited |
| `POS_SESSION_OPENED` | Cashier started a session |
| `POS_SESSION_CLOSED` | Cashier closed a session |
| `POS_SALE_COMPLETED` | Sale completed |
| `POS_SALE_REFUNDED` | Refund issued |
| `USER_INVITED` | New user invite sent |
| `USER_DEACTIVATED` | User account deactivated |
| `WARRANTY_ALERT_SENT` | Cron sent expiry alert emails |

> Full enum: `lib/audit/logger.ts` (`AuditAction`). It has grown well beyond this sample list — e.g. `ORDER_*`, `SERVICE_JOB_*`, `RETAINER_*`, `APPOINTMENT_*`, `LOYALTY_*` actions for the expanded Haraka module (see `05-haraka-pos.md`). `REQUEST_SUBMITTED`/`REQUEST_APPROVED`/`REQUEST_REJECTED` still exist in the enum but the Requests module itself was removed (see `07-requests.md`), so they are effectively dead and no longer fire.

---

## Export

"Export CSV" on the audit logs page exports all visible (filtered) records as a CSV file with all columns including old/new value JSON.

---

## Permissions

| Key | Admin | Staff | Description |
|-----|-------|-------|-------------|
| `auditLogs.view` | ✅ | ❌ | View audit logs (org portal) |

The permission catalog (`types/user-permissions.types.ts`) also defines `auditLogs.viewSpace` and `auditLogs.viewAllSpaces` (both `requiresView`), presumably for the scope toggle. In practice `app/api/audit-logs/route.ts` only checks `auditLogs.view` — the two sub-keys aren't separately enforced there.
