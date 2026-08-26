# Bulk Actions

---

## Overview

The Bulk Actions system provides a floating action bar that appears at the bottom of the screen whenever the user selects one or more rows in a `DataTable`. It enables multi-record operations like delete, move to space, and duplicate to space — all gated by per-module bulk permission keys.

---

## Component

`components/shared/BulkActionsBar.tsx`

A fixed, centered pill (`fixed bottom-6 left-1/2 -translate-x-1/2`) rendered when `count > 0`; renders `null` otherwise.

**Layout** (single row, not a left/right split):
- A "Clear selection" × button.
- The "X selected" count text.
- A vertical divider.
- Action buttons (`children`) — which ones appear depends on which permissions are granted by the calling page.

There is no enter/exit animation — the component is a plain conditional render (no Framer Motion, no transition classes). It appears and disappears immediately as `count` crosses 0.

---

## Supported Actions (per module)

> There are no dedicated `bulk_*` permission keys. Each page reuses the module's base `delete`/`update`/`create` permission for the corresponding bulk action — see the comment `// action — no separate bulk permission.` repeated at each call site (e.g. `app/[locale]/[orgSlug]/[space]/usool/list/page.tsx`).

### Delete
- Button: "Delete X items" (red, destructive).
- Triggers a `ConfirmDialog`.
- On confirm: bulk deletes all selected records and refreshes the list.
- Permission keys: `usool.delete` (Usool/Assets), `raseed.delete` (Raseed/Inventory), `haraka.customersDelete` (Haraka Customers).

### Move to Space
- Button: "Move to Space".
- Opens `components/spaces/MoveResourceDialog.tsx`.
- User picks a target space from a dropdown (lists all active spaces in the org except the current one).
- For a single inventory item, the dialog also offers a "Transfer quantity" mode (split stock between source and target via paired ledger rows) alongside the default whole-record move.
- On confirm: updates `space_id` on all selected records (or transfers a partial quantity, for inventory) and refreshes.
- Permission keys: `usool.update`, `raseed.update`, `haraka.customersUpdate`.

### Duplicate to Space
- Button: "Duplicate to Space".
- Opens `components/spaces/DuplicateResourceDialog.tsx`.
- User picks a target space.
- On confirm: creates copies of all selected records in the target space (new IDs, new `created_at`) and refreshes. Cascade rules differ per type (e.g. assets: notes/maintenance/warranties are not copied; inventory: new item created with qty 0).
- Permission keys: `usool.create`, `raseed.create`, `haraka.customersCreate`.

> Note: `MoveResourceDialog`/`DuplicateResourceDialog` still accept `type: 'request'` in their prop union and have request-specific copy/cascade strings, but there is no Requests module or route left in the app (no `requests` DB table, no `app/**/requests` pages, no `requests` permission key) — this is dead code from a removed feature, not something currently reachable from the UI.

---

## Row Selection

Row selection is enabled via a checkbox column that appears when at least one of the relevant base permissions (`delete`/`update`/`create`, per the module) is granted for the current user.

- Header checkbox: select/deselect all visible rows.
- Individual row checkboxes: toggle selection.
- Selection state is local to the page (cleared on navigation or filter change).

---

## Availability by Module

| Module | Delete | Move | Duplicate |
|--------|--------|------|-----------|
| Usool (Assets) — `usool/list` | ✅ | ✅ | ✅ |
| Raseed (Inventory items) — `raseed/list` | ✅ | ✅ | ✅ |
| Haraka (Customers) — `haraka/customers` | ✅ | ✅ | ✅ |
| Warranties | ❌ | ❌ | ❌ |

`BulkActionsBar` is used on exactly these three list pages (`usool/list`, `raseed/list`, `haraka/customers`). There is no Requests row — that module doesn't exist (see note above).

---

## Dark Mode

The BulkActionsBar always renders `bg-[#111827]` (a fixed dark slate) with white text — there is no separate `dark:` variant because the bar is unconditionally dark, so it stands out above the page content regardless of the active theme.
