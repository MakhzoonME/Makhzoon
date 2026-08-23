# Spaces

**Brand identity**: Sub-tenant isolation within an organization. A Space is a fully isolated unit — a branch, warehouse, store, or department — that owns its own data.

---

## Overview

Every organization has one or more Spaces. All module data (assets, inventory, POS sessions, customers, requests, audit logs) is scoped to a `space_id`. Org-wide data (users, billing, settings, managed lists, tax rates) is not space-scoped.

### Key rules
- Every org gets a default Space auto-created on signup (`isDefault: true`). It cannot be deleted.
- Users gain access to spaces via **membership rows** in `space_members`. Exception: `org_owner` with `all_spaces = true` implicitly accesses every space without a membership row.
- A user can be a member of multiple spaces in the same org.
- Admins manage space membership from the **Spaces settings page** or the **Members drawer** per space.

---

## Data Model

```
spaces
  id, organization_id, name, slug, status ('active' | 'archived'), is_default
  created_at, created_by, updated_at, updated_by

space_members
  id, organization_id, space_id, user_id, created_at, created_by
```

---

## Space Switcher (Sidebar)

**Component**: `components/layout/SpaceSwitcher.tsx`

The SpaceSwitcher appears at the top of the org portal sidebar. It shows:
- The currently active space name.
- A dropdown (Radix `Popover`) listing all spaces the user is a member of.
- Clicking a different space navigates to the same module path under the new space slug.

Active space is tracked in `store/active-space.store.ts`.

---

## Spaces Settings Page

**Route**: `/{locale}/{orgSlug}/settings/spaces`

**Who can access**: gated by the `settingsSpaces.view` permission (`admin`/`org_owner` have it by default; staff don't unless granted), not a hardcoded role check (`hooks/ui/useAdminGuard`, checked in `app/[locale]/[orgSlug]/settings/spaces/page.tsx`).

**Page layout**:
- `PageHeader` with "Spaces" title and a "+ New Space" button.
- A `DataTable` listing all org spaces with columns: Name, Slug, Status, Member Count, Default badge, Actions.
- Each row has Edit and (if not default) Archive actions; archived, non-default spaces show a Restore action instead.

**Creating a space**:
- "+ New Space" opens a form dialog.
- Fields: Name (required), Slug (auto-generated from name, editable), Status (active/archived).
- On submit, the space is created and the user who created it is auto-added as a member.

**Editing a space**:
- Inline edit dialog with the same fields.
- Slug can be changed (affects URLs — use carefully).

**Archiving a space**:
- There is no delete capability for spaces — `app/api/spaces/[spaceId]/route.ts` only exposes `PATCH` (no `DELETE` handler). Spaces are archived (`status: 'archived'`), not removed.
- Confirmation dialog warns before archiving; archived spaces can be restored back to `active` from the same row.
- The default space cannot be archived — enforced server-side in `lib/modules/spaces/services/spaces.service.ts`, which throws 422 if `input.status === 'archived'` on the default space.
- Gated by the `settingsSpaces.archive` / `settingsSpaces.restore` permissions, same as edit/create — not restricted to `org_owner` specifically.

---

## Space Members Drawer

**Component**: `components/spaces/SpaceMembersDrawer.tsx`

Accessible from the Spaces settings table → "Members" action on a space row.

Renders as a side drawer:
- Lists all members of that space (name, role, email).
- "+ Add Member" button opens a user picker (shows org users not already in this space).
- Remove button (with confirmation) removes a user from that space.

---

## Duplicate to Space / Move to Space

**Components**: `components/spaces/DuplicateResourceDialog.tsx`, `components/spaces/MoveResourceDialog.tsx`

These dialogs appear in the **Bulk Actions bar** across modules (assets/`usool`, inventory/`raseed`, Haraka customers) — there is no "requests" module in the codebase.

- **Move to Space** — moves selected records from current space to a target space. The records disappear from the current space.
- **Duplicate to Space** — creates copies of selected records in a target space. Originals remain.

Both dialogs show:
- A space picker dropdown (lists all active spaces in the org).
- A summary of how many records will be affected.
- A confirm/cancel pair.

There are no separate `bulk_move`/`bulk_duplicate` permission keys — bulk Move/Duplicate/Delete reuse the equivalent single-item permission for that module (`app/[locale]/[orgSlug]/[space]/usool/list/page.tsx`, `.../raseed/list/page.tsx`, `.../haraka/customers/page.tsx`):
- Usool: bulk delete → `usool.delete`, bulk move → `usool.update`, bulk duplicate → `usool.create`
- Raseed: bulk delete → `raseed.delete`, bulk move → `raseed.update`, bulk duplicate → `raseed.create`
- Haraka customers: bulk delete → `haraka.customersDelete`, bulk move → `haraka.customersUpdate`, bulk duplicate → `haraka.customersCreate`

---

## Audit Log Scope Toggle

On the **Audit Logs** page, an admin can toggle between:
- **Space scope** — shows only events in the current space.
- **Org scope** — shows all events across all spaces in the org.

This toggle is implemented as a segmented control / tab switcher in the Audit Logs page header.
