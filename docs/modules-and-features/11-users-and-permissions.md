# Users & Permissions

---

## Overview

Every organization has its own set of users. Each user has a role (`org_owner`, `admin`, `staff`) and optionally a custom permissions object that overrides the role defaults on a per-module, per-operation basis.

---

## Roles

| Role | Description |
|------|-------------|
| `org_owner` | Created on org setup; full access to everything; cannot be deactivated by others |
| `admin` | Full access to all features by default; can manage users and settings |
| `staff` | View-only on most modules by default; submits requests and support tickets |

**Default permissions** are defined in `types/user-permissions.types.ts`:
- `DEFAULT_ADMIN_PERMISSIONS` — all operations enabled.
- `DEFAULT_STAFF_PERMISSIONS` — only `view` and `create` on requests/support; no admin operations.

Custom permissions for a user **override** the role defaults operation by operation.

---

## Data Model

```
OrgUser
  id (Supabase Auth UID), organizationId
  email?, username?
  displayName, avatarUrl?
  role: 'org_owner' | 'admin' | 'staff'
  status: 'active' | 'deactivated'
  permissions?: UserPermissions | null  ← null = use role defaults
  createdAt/By, updatedAt/By
```

---

## Users Settings Page

**Route**: `/{locale}/{orgSlug}/users`
**Access**: Admin and org_owner only.

**Layout**:
- `PageHeader` with "Users" + "Invite User" button.
- `DataTable` with columns:
  - Avatar + Display Name
  - Email / Username
  - Role badge
  - Status badge (active = green, deactivated = gray)
  - Custom permissions indicator (badge if custom overrides are set)
  - Space count (how many spaces this user is in)
  - Actions: Edit Permissions, Deactivate/Reactivate, Remove

**Invite User**:
- "Invite User" button opens a modal.
- Fields: Email, Role (admin / staff), optionally assign to specific spaces.
- Sends an invite email via Resend with a one-time token link.
- Pending invite appears in a separate "Pending Invites" tab until accepted.

**Deactivate / Reactivate**:
- Toggle user status between `active` and `deactivated`.
- Deactivated users cannot log in; their data is retained.

---

## Permissions Editor

Accessible via "Edit Permissions" on a user row. Opens as a full-page modal or slide-over panel.

**Layout**:
- User header (name, role, avatar).
- "Reset to role defaults" button.
- Module groups (tabs or sections): **Core**, **Commerce**, **Workflow**, **Admin**.
- Each module section lists all operations as toggles:
  - Toggle label (e.g. "View Assets", "Delete Assets").
  - Some operations have `requiresView: true` — they auto-enable `view` if turned on, and auto-disable if `view` is turned off.

**Module groups**:
| Group | Modules |
|-------|---------|
| Core | Assets (Usool), Inventory (Raseed), Warranties |
| Commerce | Purchases, Point of Sale (Haraka) |
| Workflow | Requests, Reports, Support |
| Admin | Audit Logs, Settings, Leads |

**Saving**:
- "Save Changes" writes the `permissions` object to the user record.
- If all values match the role defaults, `permissions` is set to `null` (reverts to role defaults cleanly).

---

## Permission Enforcement

### Server-side
All API routes check permissions via `lib/permissions/require.ts`:
1. Load user from session.
2. Resolve effective permissions (custom override ?? role defaults).
3. Check the required operation key. Return 403 if not granted.

### Client-side
UI elements (buttons, table actions, nav items) are conditionally rendered based on the user's resolved permissions. This is UX-only — server checks are the authoritative gate.

---

## Space Membership & Permissions

Permissions apply across all spaces the user is a member of — there is no per-space permission customization. To restrict a user to a subset of spaces, manage their space memberships (see Spaces doc).

---

## Superadmin User View

Superadmin can view and manage users for any organization from the org management section:
**Route**: `/{locale}/superadmin/organizations/[orgId]` → Users tab.

Same capabilities as the org admin view.

---

## Permission Keys Reference (full list)

See `types/user-permissions.types.ts` — `MODULE_PERMISSIONS_CONFIG` for the canonical list of every module and operation key with labels.

Quick summary:

| Module | Operations |
|--------|-----------|
| `assets` | view, create, update, delete, import, checkout, maintenance, notes, bulk_delete, bulk_move, bulk_duplicate |
| `inventory` | view, create, update, delete, transactions, audits, bulk_delete, bulk_move, bulk_duplicate |
| `purchases` | view, create, update, delete, receive |
| `warranties` | view, create, update, delete |
| `requests` | view, create, approve, bulk_move, bulk_duplicate |
| `reports` | view |
| `support` | view, create |
| `auditLogs` | view |
| `leads` | view |
| `pos` | open_session, close_session, process_sale, apply_discount, issue_refund, void_transaction, view_reports, fawtara_submit, customers_bulk_delete, customers_bulk_move, customers_bulk_duplicate |
| `settings` | view, orgInfo, subscription, users, taxRates, fawtara |
