# Bulk Actions

---

## Overview

The Bulk Actions system provides a floating action bar that appears at the bottom of the screen whenever the user selects one or more rows in a `DataTable`. It enables multi-record operations like delete, move to space, and duplicate to space — all gated by per-module bulk permission keys.

---

## Component

`components/shared/BulkActionsBar.tsx`

A fixed-position bar that slides up from the bottom of the viewport when `selectedCount > 0`.

**Layout**:
- Left: "X selected" count badge with a "Clear selection" × button.
- Right: action buttons (which buttons appear depends on which permissions are granted).

Animated with Framer Motion: slides in from bottom on mount, slides out on dismiss.

---

## Supported Actions (per module)

### Delete
- Button: "Delete X items" (red, destructive).
- Triggers a `ConfirmDialog`: "Are you sure you want to delete X items? This cannot be undone."
- On confirm: bulk deletes all selected records and refreshes the list.
- Permission keys: `assets.bulk_delete`, `inventory.bulk_delete`, `pos.customers_bulk_delete`.

### Move to Space
- Button: "Move to Space".
- Opens `components/spaces/MoveResourceDialog.tsx`.
- User picks a target space from a dropdown (lists all active spaces in the org except the current one).
- Shows: "X items will be moved to [target space]. They will no longer appear in [current space]."
- On confirm: updates `space_id` on all selected records and refreshes.
- Permission keys: `assets.bulk_move`, `inventory.bulk_move`, `requests.bulk_move`, `pos.customers_bulk_move`.

### Duplicate to Space
- Button: "Duplicate to Space".
- Opens `components/spaces/DuplicateResourceDialog.tsx`.
- User picks a target space.
- Shows: "X items will be duplicated to [target space]. Originals remain in [current space]."
- On confirm: creates copies of all selected records in the target space (new IDs, new `created_at`) and refreshes.
- Permission keys: `assets.bulk_duplicate`, `inventory.bulk_duplicate`, `requests.bulk_duplicate`, `pos.customers_bulk_duplicate`.

---

## Row Selection

Row selection is enabled in `DataTable` via a checkbox column that appears when at least one bulk permission is granted for the current user.

- Header checkbox: select/deselect all visible rows.
- Individual row checkboxes: toggle selection.
- Selection state is local to the page (cleared on navigation or filter change).

---

## Availability by Module

| Module | Delete | Move | Duplicate |
|--------|--------|------|-----------|
| Usool (Assets) | ✅ | ✅ | ✅ |
| Raseed (Inventory items) | ✅ | ✅ | ✅ |
| Haraka (Customers) | ✅ | ✅ | ✅ |
| Requests | ❌ | ✅ | ✅ |
| Warranties | ❌ | ❌ | ❌ |

---

## Dark Mode

The BulkActionsBar uses `bg-gray-900 dark:bg-gray-950` with white text in dark mode, ensuring it always stands out above the page content regardless of theme.
