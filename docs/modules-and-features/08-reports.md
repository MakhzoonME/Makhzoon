# Reports

**Feature key**: `reports`
**Admin only**: Yes (also requires `reports.view` permission)

---

## Overview

The Reports module provides cross-module analytics for the active space — asset utilization, inventory health, cost summaries, and usage trends.

---

## Page & UI

**Route**: `/{locale}/{orgSlug}/{space}/reports`

**Layout**:
- `PageHeader` with "Reports" title.
- Date range picker at the top (presets: last 7 days, 30 days, 90 days, custom range).
- Report sections rendered as cards/charts below.

### Asset Section
- Total assets by status (donut chart — segments colored by managed-list status color).
- Asset count by category (bar chart).
- Recently added assets (table: name, category, date, cost).
- Total asset value (sum of purchase costs).
- Depreciation summary (if purchase cost + date provided).

### Inventory Section
- Stock health breakdown: ok / low / out counts (donut or bar chart).
- Top consumed items (by out-transaction volume in date range).
- Low-stock items list (items at or below minimum threshold).
- Inventory value (sum of quantityOnHand × unitCost).

### POS / Sales Section (if Haraka enabled)
- Revenue over time (line chart: daily totals in range).
- Total transactions count.
- Average basket value.
- Revenue by payment method (pie chart).
- Top-selling products (table: name, qty sold, revenue).

### Warranty Section
- Expiring within 30 days count.
- Expiring within 7 days count.
- Expired count.
- List of expiring warranties (table: asset, vendor, end date, days remaining).

### Requests Section
- Pending count, approved count, rejected count.
- Breakdown by type (donut chart).

---

## Export

Each section has an "Export CSV" button that downloads data for the selected date range.

---

## Permissions

| Key | Admin | Staff | Description |
|-----|-------|-------|-------------|
| `reports.view` | ✅ | ❌ | Access the reports page |
