# Dashboard

**Feature key**: `dashboard`

---

## Overview

The Dashboard is the landing page for each space. It gives a quick health snapshot of all active modules and recent activity, tailored to what the user has permission to see.

---

## Page & UI

**Route**: `/{locale}/{orgSlug}/{space}/dashboard`

**Layout**:
- `PageHeader` with org name + space name + current date.

### Metric Cards (top row)

Each card is shown only if the corresponding feature/permission is active:
- **Assets** — total count, active count, retired count.
- **Inventory** — total items, out-of-stock count, low-stock count.
- **Warranties** — expiring within 30 days, expired count.
- **Requests** — pending requests count.
- **POS** — today's revenue (if Haraka enabled).

Cards are responsive: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`.

Each card has:
- An icon in the module brand color.
- Primary metric (large number).
- Sub-metrics (smaller text below).
- "View all" link to the module.
- Hover lift animation (Framer Motion).

### Quick Actions

A row of shortcut buttons below the cards:
- "Add Asset" → `/usool/new`
- "Record Transaction" → inventory transaction modal
- "Submit Request" → requests new
- "Open Register" → Haraka register

Buttons are shown only if the user has the relevant `create` / `open_session` permission.

### Recent Activity Feed

A short list of the 10 most recent audit log entries for the current space:
- Timestamp (relative: "2 hours ago")
- Actor name + role badge
- Human-readable action ("Added asset 'MacBook Pro'")
- Module badge

Clicking an entry navigates to the full audit logs page with that record pre-filtered.

### Low Stock Alert Banner

If there are any `out` or `low` stock items:
- A dismissable amber/red banner at the top: "X items are low or out of stock."
- "View Items" link → Raseed list filtered to low/out.

### Expiring Warranties Banner

If there are warranties expiring within 14 days:
- A dismissable amber banner: "X warranties expiring within 14 days."
- "View Warranties" link.

---

## Responsiveness

- Full single-column stack on mobile.
- Two-column card grid on SM+.
- Four-column card grid on LG+.
- Banners stack vertically on mobile.

---

## Dark Mode

- Cards use `bg-surface-card dark:bg-gray-800` with `dark:border-gray-700` borders.
- Metric values use the primary color tone.
- Activity feed uses alternating row shading in dark mode.
