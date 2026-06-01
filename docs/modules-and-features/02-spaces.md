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

**Who can access**: `admin` and `org_owner` only.

**Page layout**:
- `PageHeader` with "Spaces" title and a "+ New Space" button.
- A `DataTable` listing all org spaces with columns: Name, Slug, Status, Member Count, Default badge, Actions.
- Each row has Edit and (if not default) Delete actions.

**Creating a space**:
- "+ New Space" opens a form dialog.
- Fields: Name (required), Slug (auto-generated from name, editable), Status (active/archived).
- On submit, the space is created and the user who created it is auto-added as a member.

**Editing a space**:
- Inline edit dialog with the same fields.
- Slug can be changed (affects URLs — use carefully).

**Deleting a space**:
- Confirmation dialog warns that all data in the space will be permanently deleted.
- Default space cannot be deleted.
- Only available to `org_owner`.

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

These dialogs appear in the **Bulk Actions bar** across modules (assets, inventory, requests, POS customers):

- **Move to Space** — moves selected records from current space to a target space. The records disappear from the current space.
- **Duplicate to Space** — creates copies of selected records in a target space. Originals remain.

Both dialogs show:
- A space picker dropdown (lists all active spaces in the org).
- A summary of how many records will be affected.
- A confirm/cancel pair.

Permission keys that gate these actions per module:
- `assets.bulk_move`, `assets.bulk_duplicate`
- `inventory.bulk_move`, `inventory.bulk_duplicate`
- `requests.bulk_move`, `requests.bulk_duplicate`
- `pos.customers_bulk_move`, `pos.customers_bulk_duplicate`

---

## Audit Log Scope Toggle

On the **Audit Logs** page, an admin can toggle between:
- **Space scope** — shows only events in the current space.
- **Org scope** — shows all events across all spaces in the org.

This toggle is implemented as a segmented control / tab switcher in the Audit Logs page header.
