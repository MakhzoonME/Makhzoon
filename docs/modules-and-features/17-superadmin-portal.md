# Superadmin Portal

**Route base**: `/{locale}/superadmin/`
**Access**: Platform roles only — `super_admin`, `makhzoon_admin`, `makhzoon_support`
**Permission model**: Each nav item and UI action is gated by `SuperAdminPermissions` (stored in `superadmin_users.permissions`). Stored permissions override role defaults. Enforced on both backend routes and frontend via `SuperAdminPermissionGate` and nav filtering.

---

## Overview

The superadmin portal is the Makhzoon platform management interface. It is completely separate from the org portal — different layout, different navigation, different permissions. Superadmins manage organizations, subscriptions, team members, backend logs, configuration, leads, and environment sync.

---

## Layout

### Sidebar

**Component**: Rendered inline in `app/[locale]/superadmin/layout.tsx`.

**Desktop** (`hidden md:flex`):
- Animated collapsible sidebar (same Framer Motion pattern as org portal).
- Widths: 240px expanded / 68px collapsed.
- State: `store/ui.store.ts → superAdminSidebarCollapsed`. Persisted to `localStorage`.
- Collapse toggle: ChevronLeft/Right button.

**Mobile**:
- Sidebar is hidden by default on mobile (`hidden md:flex`).
- A mobile header bar appears at the top with the Makhzoon logo and a hamburger button.
- Hamburger opens a full-width overlay drawer with the sidebar nav.
- Backdrop (semi-transparent overlay) closes the drawer on click.
- `isMobile` state detected via `window.innerWidth < 768` with a resize listener — prevents `marginLeft` from being applied on mobile (which would push content off-screen).

**Navigation items** (filtered by `saPermissions` at runtime):
| Label | Route | Permission Required |
|-------|-------|---------------------|
| Dashboard | `/superadmin/dashboard` | any platform role |
| Organizations | `/superadmin` | `organizations.view` |
| Leads | `/superadmin/leads` | any platform role |
| Messages | `/superadmin/messages` | any platform role |
| Lists | `/superadmin/lists` | `configuration.view` |
| Packages | `/superadmin/packages` | `configuration.view` |
| Configuration | `/superadmin/configuration` | `configuration.view` |
| Support | `/superadmin/support` | `support.view` |
| Team | `/superadmin/team` | `team.view` |
| Backend Logs | `/superadmin/backend-logs` | `backendLogs.view` |
| Sync | `/superadmin/sync` | `super_admin` or `makhzoon_admin` role |
| Audit Logs | `/superadmin/audit-logs` | `auditLogs.view` |

### Banner (top)

`components/layout/SuperAdminBanner.tsx` — a dark branded banner at the very top:
- "Makhzoon Admin" label.
- `NetworkStatusIndicator` on the right.
- `ThemeToggle` on the right.
- Logout button.

---

## Dashboard

**Route**: `/{locale}/superadmin/dashboard`

- Summary metrics: total organizations, active orgs, suspended/expired orgs, total users, open support tickets.
- Recent organizations table (last 5 created).
- Recent audit log entries (platform-wide last 10).
- Quick links to organizations, support, team.

---

## Organizations

**Route**: `/{locale}/superadmin/organizations`

**List layout**:
- `PageHeader` "Organizations" + "+ New Organization" button.
- `FilterBar`: search by name/slug, status filter, category filter, assigned member filter.
- `DataTable` with columns:
  - Org Name + slug
  - Category
  - Contact Email
  - Subscription status badge
  - Subscription end date (red if expired/expiring)
  - Assigned Member
  - Created At
  - Actions: Edit, Manage Subscription, View Audit Logs, Transfer Mode, Delete

**Create Organization**:
**Route**: `/{locale}/superadmin/organizations/new`

- Organization Name (required)
- Slug (URL slug — auto-generated, editable)
- Contact Email
- Industry/Category
- Assigned Member (optional — assign a Makhzoon team member to manage this org)
- Description

**Edit Organization**:
**Route**: `/{locale}/superadmin/organizations/[orgId]/edit`

Three sections with granular permission gating via `SuperAdminPermissionGate`:

- **Info** — always visible (requires `organizations.view`); Edit button and edit form shown only with `organizations.update`
- **Subscription** — always visible; shows plan status, expiry, and list of enabled features (read-only)
- **Danger Zone** — entire section hidden unless user has `organizations.delete`; requires org name confirmation before deleting

**Manage Subscription**:
**Route**: `/{locale}/superadmin/organizations/[orgId]/subscription`

See [Subscription doc](12-subscription.md) — superadmin section.

**Org Audit Logs**:
**Route**: `/{locale}/superadmin/organizations/[orgId]/audit-logs`

Audit logs filtered to one organization. Same layout as the org audit logs page.

**Transfer Mode**:
- Clicking "Transfer Mode" on an org sets the `transferOrgId` cookie.
- Superadmin is redirected to the org's portal as if they were an org admin.
- The `TransferModeBanner` is shown at the top.
- All actions taken in transfer mode are logged with `transferMode: true` in the audit trail.
- "Exit Transfer Mode" → clears cookie → returns to superadmin portal.

---

## Leads

**Route**: `/{locale}/superadmin/leads`

Two tabs: **Early Access** and **Contact Sales**.

Both show submissions from the marketing website's early-access signup form and contact-sales form.

**Early Access tab**:
- Columns: Name, Email, Submitted At, Action.
- "Invite" action: opens `InviteLeadModal` with the lead's email pre-filled → sends an invite link.

**Contact Sales tab**:
- Columns: Name, Email, Company, Message, Submitted At.

---

## Lists (Platform Managed Lists)

**Route**: `/{locale}/superadmin/lists`

Superadmin manages the **platform-level** catalog of managed list items — the defaults that all orgs inherit.

**Layout**:
- Left sidebar: list of all list keys.
- Right panel: items for the selected list.

For **free lists** (`scope: 'org'`): superadmin sets the platform defaults (label, color, sort order, enabled). Orgs can add their own items on top.

For **system lists** (`isSystem: true`): superadmin can edit label, color, sort order of each fixed value, but cannot add/delete values (they are code-owned).

For **platform-only lists** (`scope: 'platform'`, e.g. `org_industry`): superadmin fully manages the list; orgs cannot override.

---

## Configuration

**Route**: `/{locale}/superadmin/configuration`

Platform-level settings:
- Feature defaults for new organizations.
- Global subscription package definitions.
- Platform branding config (if applicable).
- Other platform-wide toggles.

---

## Support

**Route**: `/{locale}/superadmin/support`

See [Support doc](14-support.md) — Superadmin section.

The full support queue across all organizations. Makhzoon team members reply, change status, change priority, and assign tickets.

---

## Team

**Route**: `/{locale}/superadmin/team`
**Access**: Requires `team.view` permission.

Manage Makhzoon platform staff accounts.

**Layout**:
- `PageHeader` "Team" + "+ Add Member" button (visible only with `team.manage`).
- Role summary cards (super_admin / makhzoon_admin / makhzoon_support).
- `DataTable` with columns: Name, Email, Role, Status, Created At, Actions.

**Roles**:
| Role | Default Access |
|------|----------------|
| `super_admin` | Full platform access; can create any role |
| `makhzoon_admin` | Most superadmin features; can only create `makhzoon_support` accounts |
| `makhzoon_support` | Configurable via `SuperAdminPermissions`; default: view orgs/auditLogs/backendLogs, respond to support |

**Add Member**: Creates account with a random password and sends a reset-link email. Sets custom `SuperAdminPermissions` for any role (previously only stored for `makhzoon_support` — now stored for all roles).

**Edit**: Change display name, role, or custom `SuperAdminPermissions`. Requires `team.manage`. `makhzoon_admin` cannot edit `super_admin` accounts or promote to `makhzoon_admin`.

**Permission editor**: `SuperAdminPermissionsEditor` component — same toggle pattern as org `PermissionsEditor`. Shown in add and edit dialogs.

**Escalation rules** (enforced server-side):
- Only `super_admin` can create/promote to `super_admin`
- Only `super_admin` can permanently delete team members
- `makhzoon_admin` cannot modify `super_admin` accounts

---

## Backend Logs

**Route**: `/{locale}/superadmin/backend-logs`

System-level logs for debugging infrastructure, API errors, sync jobs, and platform events.

**Layout**:
- `PageHeader` "Backend Logs".
- Filter: level (info/warn/error), date range, search.
- `DataTable` with columns: Level badge, Message, Source, Timestamp.
- Expandable rows showing full log details (stack trace, context JSON).

---

## Sync

**Route**: `/{locale}/superadmin/sync`

Triggers Supabase database sync operations between environments (production → staging, production → dev, etc.).

**Layout**:
- `PageHeader` "Database Sync".
- Four sync pair cards:
  | Pair | Description |
  |------|-------------|
  | prod → dev | Mirror live data into dev for debugging |
  | prod → staging | Refresh staging from prod before a release |
  | prod → legacy | Push to legacy `office-asset-system` project |
  | staging → dev | Pull staging data into dev |
- Each card shows: source label, target label, description.
- "Trigger Sync" button — opens confirmation dialog warning that the target will be **overwritten**.
- After trigger: shows the GitHub Actions run status (status badge, progress, link to run).
- "Refresh" button to check current run status.

---

## Profile

**Route**: `/{locale}/superadmin/profile`

- Edit display name, avatar.
- Change password.
- Current session info.

---

## Superadmin User Model

```
SuperAdminUser
  id (Supabase Auth UID), email, displayName, avatarUrl?
  role: 'super_admin' | 'makhzoon_admin' | 'makhzoon_support'
  status: 'active' | 'deactivated'
  permissions?: SuperAdminPermissions | null  ← null = use role defaults
  createdAt/By, updatedAt/By
```

Superadmin users are stored in `superadmin_users`, separately from org users (`users` table). `verifySessionCookie()` loads `saPermissions` from this table for all platform-role users on every request and attaches it to `AuthUser.saPermissions`.

## Permission Infrastructure

**Backend**: `lib/permissions/superadmin.ts`
```typescript
hasSuperAdminPermission(user: AuthUser, module: keyof SuperAdminPermissions, operation: string): boolean
// Uses user.saPermissions if set; falls back to role defaults via DEFAULT_*_PERMISSIONS
```

Called on every superadmin API route:
- `GET/PUT/DELETE /api/organizations/[orgId]` — `organizations.view/update/delete`
- `GET /api/superadmin/backend-logs` — `backendLogs.view`
- `GET /api/superadmin/team` — `team.view`
- `POST /api/superadmin/team` — `team.manage`
- `PATCH /api/superadmin/team/[id]` — `team.manage`
- `GET /api/audit-logs` (platform users) — `auditLogs.view`

**Frontend**: `components/shared/SuperAdminPermissionGate.tsx`
```tsx
<SuperAdminPermissionGate module="organizations" operation="delete">
  <DeleteButton />
</SuperAdminPermissionGate>
```

Reads `user.saPermissions` from auth store; falls back to role defaults if null.
