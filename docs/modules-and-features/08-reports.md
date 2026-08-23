# Reports

**Feature key**: `reports`
**Admin only**: Yes (also requires `reports.view` permission)

---

## Overview

The Reports module shows asset and warranty analytics for the active space. It does **not** cover inventory (Raseed), POS/Haraka sales, or Requests (the Requests module was removed — see `07-requests.md`) — those live in their own reporting surfaces (e.g. Haraka has its own `/haraka/reports` page, documented in `05-haraka-pos.md`).

> Doc drift: earlier versions of this doc described a much larger page (date range picker, Inventory/POS/Warranty/Requests sections, per-section CSV export). None of that exists in the current `app/[locale]/[orgSlug]/[space]/reports/page.tsx` — it was simplified at some point. The description below reflects the page as it actually renders today.

---

## Page & UI

**Route**: `/{locale}/{orgSlug}/{space}/reports`

Data comes from `GET /api/reports` (`lib/modules/reports/services/reports.service.ts`), fetched via `hooks/org/useReports.ts`. No date range picker and no export button — the page always shows current totals for the space.

**Layout** (sections render conditionally based on feature/permission access):

### Inventory section (Assets)
Shown if the user has `usool` module access and the `assets` feature is enabled.
- Stat cards: Total Assets, Active, Retired, Total Value (sum of purchase costs).

### Activity section
Shown if the user can view assets and/or warranties.
- Checked Out count, Overdue Checkouts count (if assets access).
- Expiring Warranties count (if `usool.warrantiesView` permission and `warranties` feature enabled).

### Maintenance section
Shown if the user has assets access.
- Total maintenance Cost, maintenance Records count.

### By Category / By Location
Two side-by-side cards (assets access required): bar-style breakdown of asset count/value by category, and asset count by location.

### Maintenance Cost by month
A horizontal bar chart of maintenance cost per month.

---

## Permissions

| Key | Admin | Staff | Description |
|-----|-------|-------|-------------|
| `reports.view` | ✅ | ❌ | Access the reports page |

The page also reads `usool` view access and `usool.warrantiesView` to decide which sections to show — those aren't reports-specific permissions, they gate individual sections.
