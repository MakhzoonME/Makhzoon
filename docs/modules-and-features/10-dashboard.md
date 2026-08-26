# Dashboard

**Feature key**: `dashboard`

---

## Overview

The Dashboard is the landing page for each space. It gives a quick health snapshot of all active modules and recent activity, tailored to what the user has permission to see.

---

## Page & UI

**Route**: `/{locale}/{orgSlug}/{space}/dashboard`
**Implementation**: `app/[locale]/[orgSlug]/[space]/dashboard/page.tsx`. Gated by `useModuleGuard({ featureKey: 'dashboard', moduleKey: 'dashboard' })`.

**Layout**:
- A greeting header ("Good morning/afternoon/evening, {firstName}") plus a subtitle and a relative "synced Xm ago" badge — there is no `PageHeader` with org name/space name/date on this page.

### Alert Banners (top)

Non-dismissable banners (no × button), shown above the greeting when applicable:
- **Low stock**: shown when `lowStockCount > 0` (only if the user can view inventory). Text: "X item(s) are low or out of stock." → links to `raseed/list`.
- **Expiring warranties**: shown when there are warranties expiring within **30 days** (not 14) — fetched via `/api/warranties?expiringSoon=true`. Text includes a "(N critical)" suffix when any expire within 7 days. → links to `warranties?expiring=30`.

> Known issue: the "low stock" count is not actually computed from inventory stock levels — `lowStockCount` is derived from the **assets** array (`totalAssets.filter(a => a.status === 'Pending').length`), a leftover proxy. It has nothing to do with Raseed stock quantities.

### Metric Cards (top row)

Up to three cards, each shown only if the user can view that module — there is **no POS/revenue card** on the dashboard:
- **Total Assets** — total count + "N active" delta. Click → `usool/list`.
- **Inventory** (label says "Inventory Items", value is actually the low-stock count described above) — click → `raseed/list`.
- **Warranties Expiring** — count of warranties expiring within 30 days, "N critical" delta for ≤7 days. Click → `warranties?expiring=30`.

Grid is `grid-cols-2 lg:grid-cols-4` (not `grid-cols-1 sm:grid-cols-2`). Each card has an icon, a primary number, an optional delta pill, and is clickable (no explicit "View all" link text). No Framer Motion — hover uses a plain CSS `hover:shadow-md` transition.

### Quick Actions

A row of shortcut buttons below the cards (shown only if the user can view assets/inventory or has the `pos` feature):
- "Add Asset" → `usool/list?new=true` (not `/usool/new` — opens the create form via a query param on the list page)
- "Record Transaction" → `raseed/purchases/new` (not a modal)
- "Open Register" → `haraka/register`, pushed to the end of the row (`ms-auto`)

There is **no "Submit Request" button** — the Requests module does not exist in this codebase.

### Recent Assets Table / Asset Breakdown / Activity Feed

Two more rows exist below Quick Actions, not documented before:
- **Recent Assets** table (up to 5 most recently created assets) next to an **Expiring Warranties** list (up to 5).
- **Asset Breakdown** (bar chart of the top 4 non-retired asset categories) next to the **Activity Feed**.

The Activity Feed shows the **4** most recent audit log entries (`/api/audit-logs?limit=4`, not 10): relative timestamp, actor initials, raw `log.action` text (not a composed human-readable sentence like "Added asset 'MacBook Pro'"), and module name. There are no role badges. Clicking "View all" on the section header navigates to `audit-logs`.

---

## Responsiveness

- Metric cards: 2 columns by default, 4 columns at `lg:`.
- Recent Assets / Warranties and Asset Breakdown / Activity rows: single column, becoming a 5-column grid (3/2 split) at `lg:`.
- Quick action buttons wrap on narrow viewports.

---

## Dark Mode

Uses CSS custom properties (`--yellow-50`, `--blue-700`, `--mod-usool`, etc.) rather than hardcoded Tailwind `dark:` classes for most of the page — colors are theme-aware via the token system, not via a documented `bg-surface-card dark:bg-gray-800` pattern.
