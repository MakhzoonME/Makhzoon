# Users & Permissions

---

## Overview

Two separate permission systems exist in Makhzoon:

1. **Org-scoped `UserPermissions`** — applied to org members (`org_owner`, `admin`, `staff`). Stored in `users.permissions` (JSONB, nullable).
2. **Platform-scoped `SuperAdminPermissions`** — applied to platform team (`super_admin`, `makhzoon_admin`, `makhzoon_support`). Stored in `superadmin_users.permissions` (JSONB, nullable).

`null` on either means **use role defaults**. Stored custom permissions always override role defaults.

---

## Feature Flags vs. Permissions

These are two separate concepts layered on top of each other:

- **Feature flags** (`subscriptions.features` JSONB) — control whether a module is available to an org at all. Checked frontend-only via `useModuleGuard`. If a feature is off, no user in the org can access that module.
- **Permissions** — control what a specific user can do within an enabled module. Checked on both frontend and backend.

**Rule:** Feature OFF → module blocked for everyone. Feature ON + permission OFF → that user blocked, others can still access.

---

## Org Roles

| Role | Description |
|------|-------------|
| `org_owner` | Created on org setup; full access to everything; cannot be deactivated by others |
| `admin` | Full access by default; can have custom restrictions stored via `users.permissions` |
| `staff` | View-only on most modules by default; submits requests and support tickets |

**Default permissions** are defined in `types/user-permissions.types.ts`:
- `DEFAULT_ADMIN_PERMISSIONS` — all operations enabled.
- `DEFAULT_STAFF_PERMISSIONS` — only `view` on basic modules; `create` on requests/support.

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
**Access**: Admin and org_owner only (`useAdminGuard('settings.users')`).

**Layout**:
- `PageHeader` with "Users" + "Invite User" button.
- `DataTable` with columns: Avatar + Display Name, Email / Username, Role badge, Status badge, Actions.

**Invite User**:
- "Invite User" button opens a modal.
- Fields: Email or Username, Role (admin / staff), optional space assignments, optional permissions.
- `PermissionsEditor` shown at invite time, filtered to only show modules the org has enabled via features.
- Sends invite email via Resend with a one-time token link.
- Pending invite in "Pending Invites" tab until accepted.

**Deactivate / Reactivate**:
- Toggle user status between `active` and `deactivated`.
- Deactivated users cannot log in; their data is retained.

---

## Permissions Editor

Accessible via "Edit Permissions" on a user row.

**Layout**:
- Module groups (tabs or sections): **Core**, **Commerce**, **Workflow**, **Admin**.
- Each module section lists all operations as checkboxes.
- Some operations have `requiresView: true` — they auto-enable `view` if turned on, and auto-disable if `view` is turned off.
- Modules that are feature-disabled for the org are hidden from the editor.

**Module groups**:
| Group | Modules |
|-------|---------|
| Core | Dashboard, Assets (Usool), Inventory (Raseed), Warranties |
| Commerce | Purchases, Point of Sale (Haraka) |
| Workflow | Requests, Reports, Support |
| Admin | Audit Logs, Leads, Banna, Settings |

**Saving**:
- "Save Changes" writes the `permissions` object to the user record via `PATCH /api/users/[userId]`.
- Permissions are only persisted when: the user is `staff`, the user already had stored permissions, OR the admin explicitly modified permissions in this session (`permissionsModified` flag). This prevents role-default snapshots from polluting the DB unnecessarily.
- Role change resets the `permissionsModified` flag — changing role without touching permissions does not write custom permissions.

---

## Permission Enforcement

### Server-side (authoritative)

`verifySessionCookie()` in `lib/supabase/auth-helpers.ts` loads `permissions` from the `users` table for **all org roles** (`org_owner`, `admin`, `staff`) on every request. The 10s permission cache prevents N+1 DB queries.

After loading, `lib/permissions/index.ts`:

```typescript
function hasPermission(user, module, operation): boolean {
  if (user.permissions) {
    // stored custom permissions take precedence — enables admin restriction
    return user.permissions[module]?.[operation] === true;
  }
  // no stored permissions → role defaults
  if (ADMIN_ROLES.has(user.role)) return true;      // admin/owner: full access
  return operation === 'view';                        // staff: view-only fallback
}
```

`requirePermission(user, module, operation)` in `lib/permissions/require.ts` throws a 403 `NextResponse` if denied. Called at the top of every API handler for both read (GET) and write (POST/PUT/PATCH/DELETE) operations.

### Client-side (UX layer)

**Page-level guards** via `useModuleGuard({ featureKey, moduleKey })`:
- Checks both the feature flag (`user.features[featureKey]`) AND module view permission (`hasModuleAccess(user, moduleKey)`)
- Applies to staff AND admins with stored custom restrictions
- Redirects to the first accessible path (`getFirstAccessiblePath()`) if blocked
- Applied to: dashboard, usool, raseed, warranties, reports, requests, banna, haraka (main), haraka/sessions, haraka/customers, haraka/delivery-agents

**Operation-level guards** via `useAdminGuard(permissionKey)`:
- Checks if user is admin OR has the specific dotted permission key
- Used on admin-only pages and POS sub-pages (orders, reports, transactions, warranty-certs)
- POS sub-pages also check the `pos` feature via `useModuleGuard` before the operation check

**Conditional rendering** via `<PermissionGate module operation>`:
- Renders children only if `hasPermission(user, module, operation)` returns true
- Used for individual buttons, form sections, table actions

**Sidebar filtering** in `AppSidebar`:
- Feature-disabled modules are hidden for all users
- Module-permission-blocked modules are hidden for staff AND for admins with stored custom restrictions

---

## Space Membership & Permissions

Permissions apply across all spaces the user is a member of — there is no per-space permission customization. To restrict a user to a subset of spaces, manage their space memberships (see Spaces doc).

---

## Permission Keys Reference

| Module | Operations |
|--------|-----------|
| `dashboard` | view |
| `assets` | view, create, update, delete, import, checkout, maintenance, notes, bulk_delete, bulk_move, bulk_duplicate |
| `inventory` | view, create, update, delete, transactions, audits, bulk_delete, bulk_move, bulk_duplicate |
| `purchases` | view, create, update, delete, receive |
| `warranties` | view, create, update, delete |
| `requests` | view, create, approve, bulk_move, bulk_duplicate |
| `reports` | view |
| `support` | view, create |
| `auditLogs` | view |
| `leads` | view |
| `banna` | view, create, update, delete |
| `pos` | open_session, close_session, process_sale, apply_discount, issue_refund, void_transaction, view_reports, fawtara_submit, customers_bulk_delete, customers_bulk_move, customers_bulk_duplicate, view_orders, manage_orders, assign_delivery, manage_delivery_agents, view_warranty_certs, manage_warranty_certs |
| `settings` | view, orgInfo, subscription, users, taxRates, fawtara |

See `types/user-permissions.types.ts` → `MODULE_PERMISSIONS_CONFIG` for labels and dependency (`requiresView`) rules.

---

## Platform Permissions (SuperAdmin)

Stored in `superadmin_users.permissions`. Loaded by `verifySessionCookie()` for all platform-role users. Checked via `hasSuperAdminPermission(user, module, operation)` in `lib/permissions/superadmin.ts`.

| Module | Operations |
|--------|-----------|
| `organizations` | view, create, update, delete |
| `support` | view, respond, close |
| `configuration` | view, edit |
| `auditLogs` | view |
| `team` | view, manage |
| `backendLogs` | view |

**Defaults by role:**
- `super_admin` — all operations enabled
- `makhzoon_admin` — all except `organizations.delete`, `configuration.edit`, `team.manage`
- `makhzoon_support` — `organizations.view`, `support.view/respond`, `auditLogs.view`, `backendLogs.view` only

**Frontend**: `SuperAdminPermissionGate` component wraps UI elements. Superadmin layout nav items carry `permModule`/`permOp` and are filtered per the user's resolved `saPermissions`.

See `types/superadmin-permissions.types.ts` → `SUPERADMIN_MODULE_CONFIG`.
