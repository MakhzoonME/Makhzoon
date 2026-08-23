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
| Lists | `/superadmin/lists` | `configuration.view` (`super_admin`/`makhzoon_admin` only) |
| Packages | `/superadmin/packages` | `configuration.view` (`super_admin`/`makhzoon_admin` only) |
| Billing | `/superadmin/billing` | `organizations.view` (`super_admin`/`makhzoon_admin` only) |
| Notifications | `/superadmin/notifications` | `configuration.view` (`super_admin`/`makhzoon_admin` only) |
| Configuration | `/superadmin/configuration` | `configuration.view` (`super_admin`/`makhzoon_admin` only) |
| Support | `/superadmin/support` | `support.view` |
| Team | `/superadmin/team` | `team.view` |
| Backend Logs | `/superadmin/backend-logs` | `backendLogs.view` |
| Database | `/superadmin/database` | `database.view` |
| Sync | `/superadmin/sync` | `super_admin` or `makhzoon_admin` role |
| Audit Logs | `/superadmin/audit-logs` | `auditLogs.view` |

> `billing` and `notifications` are not their own `SuperAdminPermissions` modules — they piggyback on `organizations.view` and `configuration.view` respectively. `database` is its own module (`view`/`edit`/`delete`), off by default for everyone except `super_admin` (`types/superadmin-permissions.types.ts`). See the [Billing](#billing), [Notifications](#notifications), and [Database](#database) sections below for what each of these pages actually does.

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

## Messages

**Route**: `/{locale}/superadmin/messages`

Contact-sales submissions from the marketing website's "Contact Sales" form — same source data as the **Contact Sales** tab on the Leads page, but presented here as a dedicated inbox. Backed by `lib/db/contact-sales.ts` (`ContactSalesEntry`); API is `GET/DELETE /api/superadmin/messages`, gated to any platform role (no `SuperAdminPermissions` module — plain role check).

**Layout**:
- `PageHeader` "Messages".
- `DataTable` with columns: Name + Email, Organization, Asset Count, Message (click to expand/collapse the full note), Submitted At, IP Address, Delete action.
- Delete removes the entry after a confirm dialog.

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

## Billing

**Route**: `/{locale}/superadmin/billing`
**Access**: `organizations.view` (piggybacks on the Organizations module — see nav table note above).

Platform-wide billing overview across all organizations, backed by `GET /api/superadmin/billing`.

**Layout**:
- `PageHeader` "Billing".
- Four stat cards: **MRR** (sum of monthly totals for orgs with an `ACTIVE` or `GRACE` subscription), **Active**, **In grace**, **Read-only / expired** (counts by subscription status).
- **Open invoices** table: Organization, Total, Status, Grace ends (red if past grace deadline). Row click opens that org's subscription page.
- **Organizations by renewal** table: Organization, Package, Status, MRR, End date (red if expired, amber if renewing within 30 days). Sorted soonest-to-renew first. Row click opens that org's subscription page.

No actions are taken from this page directly — it's a read-only dashboard that links out to `/superadmin/organizations/[orgId]/subscription` for actual subscription management (see [Subscription doc](12-subscription.md)).

---

## Notifications

**Route**: `/{locale}/superadmin/notifications`
**Access**: `configuration.view` (piggybacks on the Configuration module — see nav table note above); backend additionally hard-restricts to `super_admin`/`makhzoon_admin` roles.

This page is **not** the org-facing notifications feature described in [Notifications doc](21-notifications.md) (in-app/email delivery, event catalog, per-user preferences). It configures two **platform-wide, shared-across-all-orgs integrations**, backed by `PlatformNotificationConfigRepository` via `GET/PATCH /api/superadmin/notification-config`:

- **WhatsApp updates**: Makhzoon's own WhatsApp Business account (phone number ID, permanent access token, webhook verify token) used to send status updates and rating requests to customers for every org with the vehicle-intake add-on active. Not configured per-org. Webhook target is this app's own `/api/whatsapp/webhook` route; a "Copy" button surfaces the exact URL to paste into Meta's App → Webhooks setup. Secrets are write-only in the UI (masked, "currently set" hint shown instead of the value).
- **Plate recognition (Plate Recognizer)**: shared API token for the Plate Recognizer plate-OCR service used by license-plate scanning (replaces an earlier client-side Tesseract.js approach). Once a key is set, a "Check usage" button (`useCheckOcrUsage`) fetches account-wide calls-this-month (plus limit and reset date) and a per-organization breakdown table.

"Save settings" persists both sections in one `PATCH` call.

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

**Add Member**: The admin can optionally set an initial/temporary password in the form (shared with the new member for first sign-in); if left blank, a random password is generated. Either way, a password-reset-link email is also sent (`POST /api/superadmin/team`). Sets custom `SuperAdminPermissions` for any role (previously only stored for `makhzoon_support` — now stored for all roles).

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

## Database

**Route**: `/{locale}/superadmin/database` (index) and `/{locale}/superadmin/database/[table]` (table view)
**Access**: `database` module — its own `view`/`edit`/`delete` operations, off by default for everyone except `super_admin` (see nav table note above).

A generic Postgres table browser/editor for direct database inspection and emergency fixes, backed by `lib/db/admin-database.ts` and `GET/PATCH/DELETE /api/superadmin/database/[table]` (+ `GET /api/superadmin/database/tables` for the table list).

**Layout**:
- `DatabaseSidebar` (left, `components/super-admin/DatabaseSidebar.tsx`): searchable list of all tables with estimated row counts, fetched from `/api/superadmin/database/tables`.
- `DatabaseTableView` (right, `components/super-admin/DatabaseTableView.tsx`): index route (`/database`) shows an empty-state prompt to select a table; `/database/[table]` shows the grid.
- Grid: paginated (25/50/100/200 per page), sortable columns (click header), text search across searchable columns, one row per record with per-row **View**/**Edit**/**Delete** icon actions.
- Tables with no primary key show a warning banner and can only be viewed (Edit/Delete are hidden — no way to target a single row).

**Row actions** (each gated by the `database` module's own operation, `super_admin` always has all three):
- **View** (`database.view`) — read-only dialog listing every column/value for the row.
- **Edit** (`database.edit`) — dialog with one input per non-PK, non-generated column (booleans render as a switch, JSON/array columns as a textarea, numeric columns as a number input); PK columns are shown locked. Saves via `PATCH`.
- **Delete** (`database.delete`) — confirmation dialog showing the row's primary key, then `DELETE`. Permanent, cannot be undone.

Every `PATCH`/`DELETE` is written to the backend log (`writeBackendLog`) with the table name, primary key, and outcome — same audit path as [Backend Logs](#backend-logs), so DB admin writes show up there as `warning`-level entries even on success.

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
