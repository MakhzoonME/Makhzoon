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

- **Feature flags** (`subscriptions.features` JSONB) — control whether a module is available to an org at all. Checked on the frontend via `useModuleGuard`, and enforced server-side too (`requireFeature`/`requireFeatureForOrg` in `lib/permissions/require-feature.ts`, called from `lib/services/base.service.ts` and individual API routes). If a feature is off, no user in the org can access that module, on either side.
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
- `DEFAULT_STAFF_PERMISSIONS` — dashboard/reports/loyalty off; `usool`/`raseed` limited to view-only operations (`view`, `warrantiesView`, `maintenanceView`, `checkoutView`, `notesView`, `auditTrailView`, `transactionsView`); `haraka` entirely off; `support` allows `view` and `submit` (own tickets); `banna`/`leads` view-only.

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
**Access**: Admin and org_owner only (`useAdminGuard('settingsUsers.view')`).

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
- Module groups (tabs or sections), ordered per `MODULE_GROUP_ORDER` in `types/user-permissions.types.ts`: **Usool**, **Raseed**, **Haraka**, **Platform**, **Settings**.
- Each module section lists all operations as checkboxes.
- Some operations have `requiresView: true` (or a specific `requiresKey`, e.g. Haraka's `applyDiscount` requires `chargeReceipt`) — they auto-enable their gate key if turned on, and auto-disable if the gate is turned off.
- Modules that are feature-disabled for the org are hidden from the editor (via each module's `featureKey`). `leads` is additionally always hidden from the editor (`hideFromEditor: true`) — it has no UI toggle.

**Module groups** (`ModuleGroup` in `types/user-permissions.types.ts`):
| Group | Modules |
|-------|---------|
| Usool | Usool (Assets, incl. warranties/maintenance/checkouts/notes/asset audits) |
| Raseed | Raseed (Inventory, incl. purchases/stock audits/adjustments) |
| Haraka | Haraka (sessions, register, orders, customers, delivery agents, transactions, service jobs, retainers, service catalog, appointments, staff) |
| Platform | Dashboard, Reports, Support, Audit Logs, Leads (hidden from editor), Customization (Banna), Loyalty |
| Settings | Organization Info, Spaces, Lists, Subscription, Users, Tax Rates, JoFotara, Receipt, Invoice, Warranty Certificate, Notifications, Cash Drawer, Card Terminal — each its own top-level module (`settingsOrgInfo`, `settingsSpaces`, …) rather than one nested `settings` object |

> Note: there is no "Requests" module. A requests/approval feature does not exist in the current codebase — no `requests` table, no `app/**/requests` routes, and no `requests` key in `UserPermissions`. Any lingering references to "Requests" elsewhere (e.g. the `request_status`/`request_type` managed lists) are vestigial.

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
// lib/permissions/index.ts — ADMIN_ROLES = admin, org_owner, super_admin,
// makhzoon_admin, makhzoon_support (the platform-team roles get full access
// to any org they enter via the transferOrgId cookie, same as org admins).
function hasPermission(user, module, operation): boolean {
  if (user.permissions) {
    const mod = user.permissions[module];
    if (!mod) return ADMIN_ROLES.has(user.role);       // module block absent → role default
    const val = mod[operation];
    if (val === undefined) return ADMIN_ROLES.has(user.role); // new op added after save → role default
    return val === true;
  }
  // no stored permissions → role defaults
  if (ADMIN_ROLES.has(user.role)) return true;      // admin/owner (+ platform team): full access
  return operation === 'view';                        // staff: view-only fallback
}
```

`requirePermission(user, module, operation)` in `lib/permissions/require.ts` throws a 403 `NextResponse` if denied. Called at the top of every API handler for both read (GET) and write (POST/PUT/PATCH/DELETE) operations.

### Client-side (UX layer)

**Page-level guards** via `useModuleGuard({ featureKey, moduleKey })`:
- Checks both the feature flag (`user.features[featureKey]`) AND module view permission (`hasModuleAccess(user, moduleKey)`)
- Applies to staff AND admins with stored custom restrictions
- Redirects to the first accessible path (`getFirstAccessiblePath()`) if blocked
- Applied to: dashboard, usool, raseed, warranties (uses the `usool` module with `permOp: 'warrantiesView'`), reports, banna, loyalty, audit-logs, and the whole Haraka tree (sessions, orders, customers, transactions, service jobs, retainers, services, staff, appointments, warranty-certs, reports). There is no "requests" module to guard — it doesn't exist in the app.

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

The permission modules are organized around the pricing pillars (Usool / Raseed / Haraka) rather than the old per-table split. Warranties, maintenance, checkouts, notes, and asset audits live *inside* `usool` (not separate modules); purchases and stock audits live inside `raseed`; there is no standalone `pos` permission module — POS is `haraka`. There is also no `requests` module (see note above) and no `bulk_*` operations anywhere — bulk delete/move/duplicate reuse the base `delete`/`update`/`create` permission for the module (see the [Bulk Actions doc](15-bulk-actions.md)).

| Module | Operations (abbreviated — see source for the full list) |
|--------|-----------|
| `dashboard` | view |
| `usool` | view, create, update, delete, export, viewActivity, qrLabel, retire, import, auditTrailView, assetAuditsView, assetAuditStart, warrantiesView/Create/Update/Delete, maintenanceView/Create/Update/Delete, checkoutView/Create/Update, notesView/Create |
| `raseed` | view, create, update, delete, export, requestRefill, transactionsView, adjustStockView, adjustStockUpdate, purchasesView/Create/Update/Delete/Receive, stockAuditView, stockAuditStart |
| `haraka` | view, sessions\*, registerOpen, applyDiscount, approveDiscount, chargeReceipt, orders\*, customers\*, customerFields\*, deliveryAgents\*, warrantyCertsView, transactions\*, posReport\*, services\*/serviceJobs\*, retainers\*, serviceCatalog\*, appointments\*, staffManage, staffAvailabilityManage (~70 keys total — see `HarakaPermissions`) |
| `reports` | view |
| `support` | view, viewOthers, submit, replyOwn, replyOthers |
| `auditLogs` | view, viewSpace, viewAllSpaces |
| `leads` | view (hidden from the org-user editor) |
| `banna` | view, create, update, delete |
| `loyalty` | view |
| `settingsOrgInfo` | view, editName, editBranding |
| `settingsSpaces` | view, create, update, grantAccess, archive, restore |
| `settingsLists` | view, create, update, delete |
| `settingsSubscription` | view |
| `settingsUsers` | view, invite, update, revoke, resetPassword, delete |
| `settingsTaxRates` | view, create, update, delete |
| `settingsFawtara` | view, update |
| `settingsReceipt` | view, update |
| `settingsInvoice` | view, update |
| `settingsWarrantyCert` | view, update |
| `settingsNotifications` | view, update |
| `settingsCashDrawer` | view, update |
| `settingsCardTerminal` | view, update |

See `types/user-permissions.types.ts` → `MODULE_PERMISSIONS_CONFIG` for full operation lists, labels, and dependency (`requiresView`/`requiresKey`) rules.

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
| `database` | view, edit, delete (DB introspection/admin tool — `supabase/migrations/0048_admin_db_introspection.sql`) |

**Defaults by role:**
- `super_admin` — all operations enabled
- `makhzoon_admin` — all except `organizations.delete`, `configuration.edit`, `team.manage`
- `makhzoon_support` — `organizations.view`, `support.view/respond`, `auditLogs.view`, `backendLogs.view` only

**Frontend**: `SuperAdminPermissionGate` component wraps UI elements. Superadmin layout nav items carry `permModule`/`permOp` and are filtered per the user's resolved `saPermissions`.

See `types/superadmin-permissions.types.ts` → `SUPERADMIN_MODULE_CONFIG`.
