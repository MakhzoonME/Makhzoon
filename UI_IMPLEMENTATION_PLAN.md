# UI Implementation Plan — Design Handoff Alignment

Source design: `Makhzoon App Screens.html` (extracted from Claude Design bundle, 2026-05-31).
Compared against: current production codebase on `DevBranch`.

> **Rules for this plan**
> - Sidebar active-item color stays as-is (indigo `primary-600` for all modules — user preference)
> - Arabic subtitles under nav items: skip
> - Login page: skip (already aligned)
> - Everything else follows the design exactly
> - Implementation is **page-by-page**: when asked "next", one page is planned + implemented, with tweaks collected before proceeding to the next

---

## HOW TO USE THIS PLAN

When the user says "next":
1. Present the full breakdown for the **next single page** from the queue below
2. List every specific UI delta (what to change, exact component, exact file)
3. Wait for the user to confirm or tweak before implementing
4. After implement, mark the page `✅ Done` in the queue and move to the next

### Page-by-page queue (in priority order)

| # | Page | Status |
|---|---|---|
| 0a | `globals.css` — CSS tokens + fonts | ✅ Done |
| 0b | `AppHeader` — bell + remove role badge | ✅ Done |
| 0c | `AppSidebar` — sign-out icon, user section, SA nav order | ✅ Done (sign-out + lang toggle; SA nav order pending) |
| 0d | Settings layout — add shared left-nav shell | ✅ Done |
| 1 | Dashboard (`/[space]/dashboard`) | ⬜ |
| 2 | Assets list (`/usool/list`) | ⬜ |
| 3 | Asset detail (`/usool/[assetId]`) | ⬜ |
| 4 | Asset new (`/usool/new`) | ⬜ |
| 5 | Asset import (`/usool/import`) | ⬜ |
| 6 | Inventory list (`/raseed/list`) | ⬜ |
| 7 | Inventory item detail (`/raseed/[itemId]`) | ⬜ |
| 8 | Inventory audits list (`/raseed/audits`) | ⬜ |
| 9 | Inventory audit detail (`/raseed/audits/[auditId]`) | ⬜ |
| 10 | Purchases list (`/raseed/purchases`) | ⬜ |
| 11 | Purchase new (`/raseed/purchases/new`) | ⬜ |
| 12 | Purchase detail (`/raseed/purchases/[id]`) | ⬜ |
| 13 | Haraka register (`/haraka/register`) | ⬜ |
| 14 | Haraka sessions list (`/haraka/sessions`) | ⬜ |
| 15 | Haraka customers list (`/haraka/customers`) | ⬜ |
| 16 | Haraka transactions list (`/haraka/transactions`) | ⬜ |
| 17 | Haraka reports (`/haraka/reports`) | ⬜ |
| 18 | Warranties list (`/warranties`) | ⬜ |
| 19 | Warranty new (`/warranties/new`) | ⬜ |
| 20 | Requests list (`/requests/list`) | ⬜ |
| 21 | Request new (modal) | ⬜ |
| 22 | Reports hub (`/reports`) | ⬜ |
| 23 | Users & permissions (`/users`) | ⬜ |
| 24 | Permissions editor (full-page) | ⬜ |
| 25 | Audit logs (`/audit-logs`) | ⬜ |
| 26 | Support list + ticket detail (`/support`) | ⬜ |
| 27 | Settings — Organization | ⬜ |
| 28 | Settings — Spaces | ⬜ |
| 29 | Settings — Managed Lists | ⬜ |
| 30 | Settings — Tax Rates | ⬜ |
| 31 | Settings — Jo-Fotara | ⬜ |
| 32 | Settings — Receipt (**new page, does not exist**) | ⬜ |
| 33 | Subscription (`/subscription`) | ⬜ |
| 34 | SA Dashboard | ⬜ |
| 35 | SA Organizations list | ⬜ |
| 36 | SA Organization detail + tabs | ⬜ |
| 37 | SA Organization config | ⬜ |
| 38 | SA Organization subscription | ⬜ |
| 39 | SA Packages | ⬜ |
| 40 | SA Team | ⬜ |
| 41 | SA Backend logs | ⬜ |
| 42 | SA Global audit logs | ⬜ |
| 43 | SA Support queue + ticket detail | ⬜ |
| 44 | SA Leads | ⬜ |
| 45 | SA Platform lists | ⬜ |
| 46 | SA Configuration | ⬜ |
| 47 | SA Sync | ⬜ |
| 48 | Mobile — bottom nav + top bar | ⬜ |
| 49 | Mobile — space switcher bottom sheet | ⬜ |
| 50 | Mobile — dashboard | ⬜ |
| 51 | Mobile — assets list | ⬜ |
| 52 | Mobile — POS | ⬜ |
| 53 | Mobile — More menu | ⬜ |

---

## 0. Foundation — CSS Tokens & Fonts
*Do this first; everything else depends on it.*

### 0.1 Add missing CSS tokens to `app/globals.css`

```css
/* Module identity colors */
--mod-usool:  #00695C;   /* teal  — fixed assets */
--mod-raseed: #E65100;   /* orange — inventory */
--mod-haraka: #C2185B;   /* crimson — POS */

/* Surface helpers missing from current tokens */
--surface-inset: #F1F4F9;
--surface-hover: #F3F4F6;
```

Dark-mode overrides to add inside the existing `.dark` / `[data-theme="dark"]` block:
```css
--surface-inset: #14171F;
--surface-hover: #232734;
```

### 0.2 Wire Thmanyah font for Arabic

Font files already exist at `public/fonts/` (or need copying from `uploads/`):
- `ThmanyahSans-Regular.woff2`
- `ThmanyahSans-Medium.woff2`
- `ThmanyahSans-Bold.woff2`

Add to `app/globals.css` (before the Tailwind directives):
```css
@font-face {
  font-family: "Thmanyah";
  src: url("/fonts/ThmanyahSans-Regular.woff2") format("woff2");
  font-weight: 400; font-display: swap;
}
@font-face {
  font-family: "Thmanyah";
  src: url("/fonts/ThmanyahSans-Medium.woff2") format("woff2");
  font-weight: 500; font-display: swap;
}
@font-face {
  font-family: "Thmanyah";
  src: url("/fonts/ThmanyahSans-Bold.woff2") format("woff2");
  font-weight: 600 700; font-display: swap;
}
```

Update `tailwind.config.ts` `fontFamily.arabic` to `["Thmanyah", "Noto Sans Arabic", "sans-serif"]`.

### 0.3 Remove navy superadmin shell tokens

The design explicitly dropped the navy shell for superadmin — both portals use the same light/dark surface tokens.

In `app/globals.css` remove or deprecate:
- `--sa-bg: #1E3A5F`
- `--sa-text: #BFDBFE`
- `--super-admin-bg: #1E3A5F`
- `--super-admin-text: #BFDBFE`

Find all usages in superadmin layout/components and replace with standard surface tokens.

---

## 1. App Header — Org Portal
*File: `components/layout/AppHeader.tsx`*

### Current vs Design

| Element | Design | Current | Action |
|---|---|---|---|
| Left content | Page title + breadcrumb | Brand mark + org name + SpaceSwitcher | See note |
| Center | Search bar with `⌘K` | Search bar with `⌘K` | ✅ match |
| Notification bell | Bell icon with red dot badge | **Missing** | Add |
| Role badge | Not in header | Shown in header (right side) | Remove from header |
| Net status | Wifi/activity icon only | `NetworkStatusIndicator` present | ✅ match |
| Theme / lang toggles | Icon-only (moon/sun, globe) | Present | ✅ match |

> **Note on left content**: The design puts page title + breadcrumb in the header (logo stays in sidebar). The current app shows brand + org + space switcher in the header with the sidebar not showing a logo. Aligning this requires a decision: the current layout has a fixed top header spanning full width (logo included) with the sidebar below it — the design has the logo *inside* the sidebar with a separate header showing page context. These are two valid patterns. **Recommended approach**: keep the current shell layout but add the missing elements rather than restructuring the entire header/sidebar relationship. Specific changes:

**Changes to make:**
1. Add a notification bell icon button (with red dot) to the right actions area, between NetworkStatusIndicator and ThemeToggle.
2. Remove the role badge from the header right section — role is available in the user dropdown menu which is sufficient.
3. Ensure the page title / breadcrumb is shown on individual page layouts (via `PageHeader` component), not duplicated in the top bar.

---

## 2. App Header — Superadmin Portal
*File: `components/layout/SuperAdminHeader.tsx` (or wherever the SA header lives)*

Same changes as §1. Additionally:
- The SA header should show "Platform Console" context (already implied by the nav, but confirm the header title updates per page).
- No navy color anywhere.

---

## 3. Sidebar — Superadmin Nav Entries
*File: `components/layout/AppSidebar.tsx` or equivalent SA sidebar*

Design SA nav order (no navy, standard surfaces):
```
Dashboard
Organizations
Leads          ← currently missing or out of order
Lists          ← currently missing or out of order
Configuration  ← currently missing or out of order
─── separator ───
Support
Team
Backend logs
Sync           ← currently missing or out of order
```

**Changes:**
- Verify and reorder SA nav entries to match the design order above.
- Add any missing SA nav entries: Leads, Lists, Configuration, Sync.
- Remove any navy background from the SA sidebar — use `var(--surface-sidebar)`.

---

## 4. Dashboard — Org Portal
*File: `app/[locale]/[orgSlug]/[space]/dashboard/page.tsx`*

### 4.1 Alert banners (top of page, above greeting)

Add two dismissible/contextual banners that show when data conditions are met:
- **Warning banner**: "N items are low or out of stock." + "View items" link → Raseed list filtered by low stock
- **Info banner**: "N warranties expiring within 14 days." + "View warranties" link → Warranties list

Use the existing `Banner` / alert component pattern. Only show when counts > 0.

### 4.2 Greeting + subtitle

Replace or add above the KPI grid:
- `Good [morning/afternoon/evening], [first name]` — use the user's display name, time-of-day based
- Subtitle: "Here's what needs your attention today."
- Right side: "Synced N min ago" info badge (use last-updated timestamp from data)

### 4.3 KPI cards — 4-up grid

Design specifies four KPI cards in a `repeat(4, 1fr)` grid:

| Card | Icon | Value | Delta |
|---|---|---|---|
| Active assets | Package | count | +N this week |
| Inventory items | Archive | count | "N low" (red if >0) |
| Expiring ≤30d | Shield | count | "N critical" (red) |
| Open requests | Inbox | count | "N for you" (red) |

Each card has a mini sparkline (10-point area chart). If implementing sparklines is deferred, use a simple colored bottom-border accent instead.

Accent colors (per design, NOT the module colors since sidebar is keeping indigo):
- Assets: `var(--mod-usool)` teal
- Inventory: `var(--mod-raseed)` orange
- Expiring: `var(--amber-500)`
- Requests: `var(--violet-600)`

### 4.4 Quick actions row

Below KPIs, a row of small secondary buttons:
- "Add asset" → `/usool/new`
- "Record transaction" → Haraka register
- "Submit request" → Requests new
- Pushed to end: "Open register · JOD [today's total]" — crimson `var(--mod-haraka)` border/text, links to Haraka register. Only show if POS feature is enabled.

### 4.5 Two-column content area

Left column (wider): "Recent assets" table-card
- Columns: Name (link), Category, Status (badge+dot), Added by (avatar), Date
- 5 rows + "View all" link

Right column: "Expiring warranties" card
- List of up to 5, each with colored left bar (red/amber/yellow based on days remaining), asset name, vendor, days remaining
- Top: title + expiry count badge

---

## 5. Assets — Usool

### 5.1 Assets List
*File: `app/[locale]/[orgSlug]/[space]/usool/list/page.tsx`*

**Quick-filter chips** — horizontal chip row above the table:
- "All" (count), "Needs attention" (count), "My assignments" (count), "Recently added"
- Active chip: `primary-50` background + `primary-700` text

**Bulk-actions bar** — floating bar at page bottom when rows are selected:
- Shows "N selected" count
- Action buttons: "Move to space", "Duplicate", "Delete N" (destructive)
- Confirm before destructive actions
- `BulkActionsBar` component exists in `components/shared/` — wire it up if not already done

**Table columns** (match design order):
Checkbox | Name | Category | Status | Serial | Assigned to | Location | Purchased | Cost

### 5.2 Asset Detail
*File: `app/[locale]/[orgSlug]/[space]/usool/[assetId]/page.tsx`*

**Tabbed layout** — four tabs below the asset header card:
1. **Info** — current field grid layout (keep as-is)
2. **Maintenance** — maintenance records list + "Add record" button
3. **Notes** — notes list + add note form
4. **Audit** — audit trail for this specific asset (filtered from audit-logs)

**Right column** — keep the existing QR card. Below it add:
- **Checkout section**: shows current assignee + "Check out / Check in" button
- If currently assigned: show assignee avatar + name + date since + "Check in" button
- If not assigned: "Check out" button → opens assignee picker modal

---

## 6. Inventory — Raseed

### 6.1 Inventory List
*File: `app/[locale]/[orgSlug]/[space]/raseed/list/page.tsx`*

**Status filter chips** (same pattern as assets):
- "All", "In stock", "Low stock", "Out of stock"

**Table** — add an "On hand" column with stock level indicator (number + color bar if low/out).

### 6.2 Inventory Item Detail
*File: `app/[locale]/[orgSlug]/[space]/raseed/[itemId]/page.tsx`*

**Stock level card** — prominent card at top showing:
- Current stock count, min threshold, unit
- Visual progress bar (green/amber/red based on threshold)
- "Adjust stock" button

### 6.3 Purchases List
*File: `app/[locale]/[orgSlug]/[space]/raseed/purchases/page.tsx`*

**Purchases** already exist. Verify the page shows:
- Status badge on each row (Draft / Pending / Received / Cancelled)
- Total amount column
- Supplier column

---

## 7. Haraka — POS

**Module accent color: `var(--mod-haraka)` = `#C2185B` (crimson).** This must be applied consistently throughout all Haraka screens.

### 7.1 Register
*File: `app/[locale]/[orgSlug]/[space]/haraka/register/page.tsx`*

**Full-bleed two-pane layout** (no standard header search):
- Left pane: product catalog
  - Search bar + "Scan" button
  - Horizontal category pills — active pill uses `var(--mod-haraka)` background
  - Product grid: `auto-fill, minmax(132px, 1fr)` cards — name, price (crimson)
- Right pane (fixed 360px, `surface-card`, left border):
  - "Current sale" header + customer picker (walk-in default)
  - Cart items: name, unit price, qty stepper (−/+), line total
  - Footer: subtotal, tax rows, total (large, crimson), Cash + Card buttons (grid), large crimson "Charge JOD X.XX" button

The header for the register page should **not** have the standard search — just title, breadcrumb, session badge, and "Close till" button.

### 7.2 Sessions
*File: `app/[locale]/[orgSlug]/[space]/haraka/sessions/page.tsx`*

Active session summary card at top:
- Till name + "Open" badge (crimson dot)
- Opened by + time + float amount
- Today's sales total (crimson)
- "Close & count" button

Table below showing historical sessions.

### 7.3 Customers
*File: `app/[locale]/[orgSlug]/[space]/haraka/customers/page.tsx`*

Table columns: Name | Email | Tax number (for Fawtara B2B) | Phone | Total spent | Last purchase

### 7.4 Transactions
*File: `app/[locale]/[orgSlug]/[space]/haraka/transactions/page.tsx`*

Table with filter tabs: All | Cash | Card | Voided

Columns: #Ref | Customer | Items | Total | Tax | Payment method | Cashier | Time

### 7.5 Haraka Reports
*File: `app/[locale]/[orgSlug]/[space]/haraka/reports/page.tsx`*

KPI cards (crimson accent):
- Total revenue (period), Transaction count, Avg ticket size, Top product

Chart: daily revenue bar chart for selected period.

Table: top products by quantity + revenue.

---

## 8. Operations

### 8.1 Warranties List
*File: `app/[locale]/[orgSlug]/[space]/warranties/page.tsx`*

**Filter tabs**: All | Expiring ≤30d | Expiring ≤90d | Expired | Active

Table columns: Asset | Vendor | Coverage | Start | Expiry | Days remaining (colored badge)

### 8.2 Requests List
*File: `app/[locale]/[orgSlug]/[space]/requests/list/page.tsx`*

**Filter tabs**: All | Pending | Approved | Rejected | Delivered

Table columns: # | Item | Type (asset/inventory) | Requested by | Approver | Status | Created

### 8.3 Reports Hub
*File: `app/[locale]/[orgSlug]/[space]/reports/page.tsx`*

Design shows a reports hub with:
- Asset value donut chart (by category)
- Inventory turnover chart
- KPI strip: total asset value, avg age, total inventory value, request fulfillment rate
- "Export PDF" / "Export CSV" buttons

---

## 9. Admin — Users & Permissions
*File: `app/[locale]/[orgSlug]/users/page.tsx`*

### 9.1 Users Table

**Segment tabs**: Members (count) | Pending invites (count)

Table columns: User (avatar+name) | Email | Role (badge) | Permissions (custom badge or "Role default") | Spaces count | Status | Actions

Actions column: "Permissions" button → opens `PermissionsEditor` drawer/modal

### 9.2 Permissions Editor
*Component: `components/users/PermissionsEditor.tsx`*

Verify the permissions editor drawer exists and shows:
- Per-module permission overrides (view / edit / all / none)
- Space access toggles
- Save / Cancel

---

## 10. Audit Logs
*File: `app/[locale]/[orgSlug]/[space]/audit-logs/page.tsx`*

**Scope toggle** — top of page: "This space" | "This organization" (SegmentedControl)

Table columns: Action (mono badge) | Module | Actor | Record | Change (before→after summary) | Time

**Expandable row** — clicking a row expands inline diff panel:
- Left card: BEFORE (red tint) with JSON-like field display
- Right card: AFTER (green tint) with field display

Export CSV button in header actions.

---

## 11. Support Tickets (Org)
*File: `app/[locale]/[orgSlug]/[space]/support/page.tsx`*

**Two-pane layout**:
- Left (320px): ticket list — each item shows #ID, subject, priority badge, status badge, age. Active item has primary left border + `primary-50` background.
- Right: active ticket conversation
  - Header: #ID · subject, opened by + time, priority + status badges
  - Message thread: avatar + role badge + timestamp + message bubble (support replies get `primary-50` tinted bg)
  - Reply input + Send button at bottom

---

## 12. Settings Hub
*File: `app/[locale]/[orgSlug]/settings/page.tsx` and sub-pages*

Design uses a left-nav + right-content settings shell with these sections:

| Key | Label | Sub-page |
|---|---|---|
| `org` | Organization | `/settings/organization` |
| `spaces` | Spaces | `/settings/spaces` |
| `lists` | Managed Lists | `/settings/lists` |
| `tax` | Tax Rates | `/settings/tax-rates` |
| `fawtara` | Jo-Fotara | `/settings/jo-fotara` |
| `receipt` | Receipt | `/settings/receipt` (add if missing) |

Left nav items have: icon + label + active left border (`2px solid primary-600`) + `surface-inset` background.

### 12.1 Managed Lists sub-page

Two-column layout:
- Left: list category selector (Asset Statuses, Asset Categories, Locations, Inventory Units, Inventory Categories, Vendors)
- Right: items for active category — each row: drag handle icon, color swatch, EN label, AR label, toggle switch, edit pencil
- Footer note: platform defaults can be renamed/recolored but not deleted

### 12.2 Tax Rates sub-page

Simple table: Name | Rate | Default badge | Created by | Edit action

"Add tax rate" button in toolbar.

### 12.3 Jo-Fotara sub-page

Integration settings form — TIN, secret key, environment toggle (sandbox/live), connection test button, status badge.

---

## 13. Subscription — Org Portal
*File: `app/[locale]/[orgSlug]/subscription/page.tsx`*

Two-column layout:
- Left (wider): current plan card — plan name, price/period, start date, status badge, payment method banner (Visa ··4242, auto-renew on)
- Right: payment log table — date, amount, status (paid/failed badge)

Feature list below: included features (checkmarks) vs excluded (grayed).

---

## 14. Mobile — Responsive Screens

Design defines a complete mobile breakpoint treatment. Key rules:

### 14.1 Layout changes on mobile (< md breakpoint)

- Sidebar → hidden; replaced by bottom tab bar + slide-in "More" drawer
- Bottom tab bar (5 items): Dashboard | Assets | POS | Requests | More (settings icon)
- Top bar: hamburger | center space-switcher (org letter + space name + chevron) | bell icon
- Tables → stacked card list (no horizontal scroll)
- FAB (floating action button): indigo circle + Plus icon, positioned `bottom: 80px end: 18px` (above bottom nav)

### 14.2 Space switcher — bottom sheet (mobile)

Tap the space name in the top bar → bottom sheet slides up:
- Handle bar at top
- Title "Switch space" + X close
- List of spaces: letter avatar (module-color bg) + name + sub + asset count + checkmark if active
- "Create new space" secondary button at bottom

### 14.3 Mobile-specific screens to verify/implement

| Screen | Key mobile behaviors |
|---|---|
| Dashboard | 2×2 KPI grid, "Recent assets" as stacked cards, greeting |
| Assets list | Search + filter chips + stacked card list + FAB |
| POS register | Crimson top bar, cart list, total + Charge button pinned to bottom |
| More menu | Avatar + name/role at top, list of secondary nav items, Sign out (red) |

### 14.4 Bottom navigation component

*File: `components/layout/BottomNav.tsx`* (create if missing)

Props: `active` key. Active tab gets a top indicator bar + primary-600 color. Tabs:
1. Home / Dashboard
2. Assets (Package icon)
3. POS / Haraka (Cart icon)
4. Requests (Inbox icon)
5. More (Menu icon → opens MobileDrawer)

---

## 15. Superadmin Portal — All Screens

All SA screens use **standard light/dark surfaces** — no navy. The `AppShell` in SA mode should render with the same `surface-sidebar`, `surface-card`, `surface-page` tokens as the org portal.

### 15.1 SA Dashboard
*File: `app/[locale]/superadmin/dashboard/page.tsx`*

- Headline: "N organizations · 99.99% uptime" + "Everything healthy" subtitle
- 4-up KPI: Total orgs, MRR, Active subscriptions, Open support tickets
- Two-column: org growth bar chart (12 months) + alerts queue card (danger/warning/info badges)

### 15.2 Organizations List
*File: `app/[locale]/superadmin/organizations/page.tsx`*

Table columns: Organization (name + subdomain) | Plan (badge) | Assets | Users | MRR | Status | Transfer button

Filter buttons: Plan | Status | Industry

### 15.3 Organization Detail
*File: `app/[locale]/superadmin/organizations/[orgId]/page.tsx` (or edit page)*

Top card: org avatar + name + subdomain + industry + since date + status badge

**Tabs**: Overview | Subscription | Configuration | Audit log | Users

Overview tab: 4 KPIs (assets, users, MRR, open tickets) + recent activity table

### 15.4 Organization Config (Feature flags + Usage limits)

Two-column:
- Feature flags card: list of features with toggle switches
- Usage limits card: limit label + current value + progress bar where applicable

### 15.5 Organization Subscription

Two-column:
- Subscription card: plan badge, plan name, price/period, LTV, payment method banner
- Payment log table: date | amount | paid/failed badge

### 15.6 Packages
*File: `app/[locale]/superadmin/organizations/[orgId]/subscription` or dedicated packages page*

Three-column card grid — Starter | Business | Enterprise:
- Plan name + org count + price
- Limits table (assets, users, warranties)
- Feature list with checkmarks
- "Edit package" secondary button
- Middle card (Business) gets primary accent border

### 15.7 Team
*File: `app/[locale]/superadmin/team/page.tsx`*

Table: Member (avatar+name) | Email (mono) | Role (badge) | Last active | Status

"Invite teammate" button in header.

### 15.8 Backend Logs
*File: `app/[locale]/superadmin/backend-logs/page.tsx`*

Monospace table: Level (ERROR/WARN/INFO/DEBUG colored) | Service | Message | Time

Filter buttons: Level | Service. Search by trace/route/message.

"Live tail" + "Export" in header.

### 15.9 Global Audit Logs
*File: `app/[locale]/superadmin/audit-logs/page.tsx`*

Table: Action (mono badge with primary-50 bg) | Organization | Actor | Record | Time

Filter: Organization | Action. Search across all tenants.

### 15.10 Support Queue (SA)
*File: `app/[locale]/superadmin/support/page.tsx`*

Segment tabs: Open · N | Urgent · N | In progress · N | Resolved

Table: # | Subject | Organization | Priority | Status | Assignee | Age

### 15.11 Support Ticket Detail (SA)
*File: `app/[locale]/superadmin/support/[ticketId]/page.tsx`*

Two-pane:
- Left: conversation thread (same as org support but with org context)
- Right sidebar (280px): Manage card (Status/Priority/Assignee selects) + Organization info card (Plan/MRR/open tickets + "Open org" button)

### 15.12 Leads
*File: `app/[locale]/superadmin/leads/page.tsx`*

Segment tabs: Early access · N | Contact sales · N

Table: Name | Email | Submitted | Invite action button

### 15.13 Platform Lists
*File: `app/[locale]/superadmin/lists/page.tsx`*

Same two-column layout as org Managed Lists (§12.1) but with platform-level lists (Org Industries, Asset Statuses system defaults, etc.)

### 15.14 Platform Configuration
*File: `app/[locale]/superadmin/configuration/page.tsx`*

Two-column:
- Default feature flags for new orgs (toggle list)
- Subscription packages quick-view (name + orgs + price + edit pencil)

### 15.15 Database Sync
*File: `app/[locale]/superadmin/sync/page.tsx`*

Warning banner at top: destructive operation notice.

2×2 card grid — each sync pair (source → target):
- Source + Target env labels (mono badges)
- Description
- "Trigger sync" button or progress bar if running + Running badge

### 15.16 Transfer Mode Banner
*Component: `components/layout/TransferModeBanner.tsx`*

Amber banner shown when a superadmin has entered an org via "Transfer in":
- Alert icon + "Transfer Mode — you are viewing [Org Name] on its behalf. Every action is logged with your super-admin id."
- "Exit Transfer Mode" button pushed to end (right/left based on dir)

Verify the `TransferModeBanner` and `TransferModeBanner.tsx` are wired into the org layout when transfer mode is active.

---

## 16. Empty / Loading / Error States

For each major list surface, ensure all three states are designed:

| State | Implementation |
|---|---|
| **Loading** | Skeleton rows — same structure as real rows, `animate-pulse` gray bars |
| **Empty** | Centered icon + title + subtitle + primary action button |
| **Error** | Centered warning icon + "Something went wrong" + retry button |
| **Offline** | Network banner at top (yellow) + page content grayed |

Affected surfaces: Assets list, Inventory list, Purchases, Requests, Warranties, Audit logs, Support, Haraka sessions, Haraka transactions, SA Organizations, SA Leads.

The `EmptyState` and `LoadingSkeleton` components exist — verify they are actually rendered (not just available) on all the above routes.

---

## Implementation Order (recommended)

| Phase | Items | Rationale |
|---|---|---|
| **1 — Foundation** | §0 (tokens, fonts, remove navy) | Unblocks everything else |
| **2 — Shell** | §1 (header bell + remove role badge), §3 (SA nav order) | High visibility, quick wins |
| **3 — Dashboard** | §4 (banners, greeting, KPIs, quick actions, content cards) | Most-visited screen |
| **4 — Haraka** | §7 (all POS screens with crimson) | Largest visual delta |
| **5 — Assets** | §5 (chips, bulk actions, detail tabs, checkout) | Core module |
| **6 — Admin screens** | §9 (users), §10 (audit diff), §11 (support two-pane) | Completeness |
| **7 — Settings** | §12 (managed lists, tax rates, Jo-Fotara, receipt) | Settings hub layout |
| **8 — SA portal** | §15 all screens + §15.16 transfer banner | Complete SA |
| **9 — Mobile** | §14 (bottom nav, top bar, space sheet, stacked cards) | Responsive |
| **10 — States** | §16 (empty/loading/error) | Polish |

---

## Files Touched (summary)

```
app/globals.css                                          § 0.1, 0.2, 0.3
tailwind.config.ts                                       § 0.2
components/layout/AppHeader.tsx                          § 1
components/layout/AppSidebar.tsx  (SA nav order)         § 3
components/layout/BottomNav.tsx   (create)               § 14.4
components/layout/TransferModeBanner.tsx                 § 15.16
app/[locale]/[orgSlug]/[space]/dashboard/page.tsx        § 4
app/[locale]/[orgSlug]/[space]/usool/list/page.tsx       § 5.1
app/[locale]/[orgSlug]/[space]/usool/[assetId]/page.tsx  § 5.2
app/[locale]/[orgSlug]/[space]/raseed/list/page.tsx      § 6.1
app/[locale]/[orgSlug]/[space]/raseed/[itemId]/page.tsx  § 6.2
app/[locale]/[orgSlug]/[space]/raseed/purchases/page.tsx § 6.3
app/[locale]/[orgSlug]/[space]/haraka/register/page.tsx  § 7.1
app/[locale]/[orgSlug]/[space]/haraka/sessions/page.tsx  § 7.2
app/[locale]/[orgSlug]/[space]/haraka/customers/page.tsx § 7.3
app/[locale]/[orgSlug]/[space]/haraka/transactions/page  § 7.4
app/[locale]/[orgSlug]/[space]/haraka/reports/page.tsx   § 7.5
app/[locale]/[orgSlug]/[space]/warranties/page.tsx       § 8.1
app/[locale]/[orgSlug]/[space]/requests/list/page.tsx    § 8.2
app/[locale]/[orgSlug]/[space]/reports/page.tsx          § 8.3
app/[locale]/[orgSlug]/users/page.tsx                    § 9.1
components/users/PermissionsEditor.tsx                   § 9.2
app/[locale]/[orgSlug]/[space]/audit-logs/page.tsx       § 10
app/[locale]/[orgSlug]/[space]/support/page.tsx          § 11
app/[locale]/[orgSlug]/settings/* (all sub-pages)        § 12
app/[locale]/[orgSlug]/subscription/page.tsx             § 13
app/[locale]/superadmin/dashboard/page.tsx               § 15.1
app/[locale]/superadmin/organizations/* (all)            § 15.2–15.5
app/[locale]/superadmin/team/page.tsx                    § 15.7
app/[locale]/superadmin/backend-logs/page.tsx            § 15.8
app/[locale]/superadmin/audit-logs/page.tsx              § 15.9
app/[locale]/superadmin/support/* (list + detail)        § 15.10–15.11
app/[locale]/superadmin/leads/page.tsx                   § 15.12
app/[locale]/superadmin/lists/page.tsx                   § 15.13
app/[locale]/superadmin/configuration/page.tsx           § 15.14
app/[locale]/superadmin/sync/page.tsx                    § 15.15
app/[locale]/[orgSlug]/settings/receipt/page.tsx (NEW)   § 17
All major list routes (empty/loading/error states)       § 16
```

---

## 17. App Header — Detailed Breakdown (All Pages)

### Current header structure
```
[burger mobile] [Brand mark + "Makhzoon" text] [/ orgName] [/ SpaceSwitcher]   [Search bar ⌘K flex-1]   [mobile search] [NetworkStatus] [ThemeToggle] [LanguageToggle] [Role Badge] [Avatar dropdown ▾]
```

### Design header structure (per `shell.jsx`)
```
[Page title + breadcrumb above it]   [Search bar ⌘K flex-1]   [NetStatus icon] [Theme icon] [Bell 🔔 with red dot] [action buttons injected per page]
```

### Delta table — header

| Element | Design | Current | Gap | Fix |
|---|---|---|---|---|
| Left section content | Page title + breadcrumb above (inside the header bar) | Brand mark + org name + SpaceSwitcher | Structural difference — keeping current layout, just aligning missing elements | No structural change |
| **Notification bell** | Bell icon with red dot, between net status and theme toggle | **Missing entirely** | **Add bell button with badge** |
| **Role badge** | Not in header | Shown right of LanguageToggle | **Remove from header** — role visible in sidebar user section and user dropdown |
| Theme toggle | Icon-only (moon/sun) | ✅ present | — |
| Language toggle | Globe icon only | ✅ present | — |
| Net status | Activity/Wifi icon | ✅ present | — |
| User avatar dropdown | Avatar + name + chevron | ✅ present | — |
| User dropdown items | Profile + Sign out | ✅ present | — |

### Per-page header action buttons (design spec)

Each page injects action buttons into the header right section:

| Page | Header Actions |
|---|---|
| Dashboard | Export (secondary) · Add asset (primary) |
| Assets list | Import (secondary) · Export CSV (secondary) · Add asset (primary) |
| Asset detail | Edit (secondary) · Retire / Delete |
| Asset new | Cancel (secondary) · Save asset (primary) |
| Asset import | Cancel (secondary) · Import (primary) |
| Inventory list | Import (secondary) · Add item (primary) |
| Inventory item | Stock out (secondary) · Stock in (primary) |
| Audit detail | Save progress (secondary) · Complete audit (primary, raseed) |
| Purchase list | New purchase (primary, raseed) |
| Purchase new | Save draft (secondary) · Save & receive (primary, raseed) |
| Purchase detail | Edit (secondary) · Cancel PO (secondary) · Receive stock (primary, raseed) |
| Haraka register | Session badge · Close till (secondary) |
| Haraka sessions | Open session (primary, haraka) |
| Haraka customers | New customer (primary) |
| Haraka transactions | — (filters only) |
| Haraka reports | Period picker (secondary) · Export (secondary) |
| Warranties | Add warranty (primary) |
| Warranty new | Cancel (secondary) · Save warranty (primary) |
| Requests | New request (primary) |
| Reports | Period picker (secondary) · Export (secondary) |
| Users | Invite user (primary) |
| Permissions editor | Reset to role defaults (secondary) · Save changes (primary) |
| Audit logs | Export CSV (secondary) |
| Support | New ticket (primary) |
| Settings — Organization | (none — Save is inside the card) |
| Settings — Spaces | (none — New space is inside the table card) |
| Settings — Lists | (none — actions inside the card) |
| Settings — Tax Rates | (none) |
| Settings — Jo-Fotara | (none) |
| Settings — Receipt | Reset to default (secondary) · Save receipt (primary, haraka crimson) |
| Subscription | Manage plan (secondary) |
| SA Dashboard | — |
| SA Orgs | New organization (primary) |
| SA Org detail | Transfer in (secondary) · Suspend (secondary) |
| SA Org config | Save changes (primary) |
| SA Org sub | Change plan (secondary) · Add credit (secondary) |
| SA Packages | New package (primary) |
| SA Team | Invite teammate (primary) |
| SA Backend logs | Live tail (secondary) · Export (secondary) |
| SA Audit logs | Export CSV (secondary) |
| SA Support | — |
| SA Support ticket | — |
| SA Leads | — |
| SA Config | Save (primary) |
| SA Sync | — |

**Current state**: Most pages use `PageHeader` with an `actions` prop. Need to audit each page to verify the actions match the design spec above, adding or removing buttons as needed.

---

## 17b. Sub-header (PageHead) — Design vs Current

### Design `PageHead` component
- Font: `font-display` (Baloo 2 or Geist), 23px, weight 700, `letter-spacing: -0.005em`
- Subtitle: 13.5px, `text-secondary`
- Used **inside** the scrollable content area, below the header bar
- Appears on: Assets list, Inventory list, Audit list, Reports, Users

### Current `PageHeader` component (`components/shared/PageHeader.tsx`)
- `h1` with class `t-h1 text-gray-900`
- `p` with class `t-body muted`
- Also renders breadcrumb (clickable links)
- Actions in flex row end

**Gaps:**
- Design's `PageHead` has no breadcrumb (breadcrumb is in the header bar); current `PageHeader` has a breadcrumb nav inside it — this causes duplicate breadcrumbs on some pages
- Font size/weight treatment differs slightly — verify `t-h1` maps to the right size
- Not all pages that need `PageHead` use it — Dashboard is the most visible gap (it uses a greeting instead)

---

## 18. Sidebar — Sign Out & User Section

### Design sidebar user section (bottom of sidebar)
```
[Avatar 32px] [Name · Role]  [LogOut icon]
```
- `LogOut` icon is directly visible at the end (not inside a dropdown)
- Clicking it signs the user out immediately (or opens a confirm)
- In collapsed mode: only the avatar shown, no logout icon

### Current sidebar user section
```
[Avatar 28px] [Name · role text]
```
- **No sign-out button in the sidebar** — sign out is only accessible via the header user dropdown
- No logout icon visible
- Role text: `user.role === 'org_owner' ? 'Owner' : user.role?.replace('_', ' ')` — matches design intent

**Gap:** Add a visible `LogOut` icon button at the end of the sidebar user section. In collapsed mode hide it (tooltip "Sign out" on hover). Tapping it signs out directly (same logic as the header dropdown sign-out).

---

## 19. Settings — Layout Gap (MAJOR)

### Design settings layout
All settings sub-pages share a **persistent left-navigation panel** (220px wide) rendered as part of the page content area (not the sidebar):

```
[Left nav 220px] | [Right content area — fills remaining space]
```

Left nav items:
| Icon | Label | Route |
|---|---|---|
| Building | Organization | `/settings/organization` |
| Layers | Spaces | `/settings/spaces` |
| Sliders | Managed Lists | `/settings/lists` |
| Percent | Tax Rates | `/settings/tax-rates` |
| Receipt | Jo-Fotara | `/settings/jo-fotara` |
| Printer | Receipt | `/settings/receipt` ← **new** |

Active item: `2px solid primary-600` left border + `surface-inset` background + `primary-600` icon + bold label.

### Current settings layout
- `SettingsLayout` (`app/[locale]/[orgSlug]/settings/layout.tsx`) only has a permission guard — **no left-nav rendered**
- Each sub-page renders its own `PageHeader` independently
- Navigation between settings sub-pages happens via the main sidebar's Settings group (which collapses/expands)

**Gap:** Add a shared settings left-nav to `settings/layout.tsx`. This is a medium-effort layout change that affects all settings sub-pages at once.

---

## 20. Receipt Settings Page — New Page (Does Not Exist)

*Target file: `app/[locale]/[orgSlug]/settings/receipt/page.tsx`*

**This page does not exist in the codebase.** It must be created from scratch.

### Layout: two-column (controls left, live preview right)

**Left column — 4 cards stacked:**

**Card 1 — Branding**
- Logo upload zone (dashed border, 88×88px, "Logo" label)
- Business name input (default: org name)
- Tagline input (optional)

**Card 2 — Business details**
- Grid: Phone + Tax number
- Address (full width)

**Card 3 — Content toggles** (Switch rows with `surface-inset` background separating each)
- Show logo
- Show tax number
- Show cashier name
- Show Fawtara QR code
- Show itemized tax
- Show customer loyalty points (off by default)
- Footer message (textarea, 2 rows)

**Card 4 — Appearance**
- Accent color: 5 swatches (`#C2185B`, `#4F46E5`, `#00695C`, `#E65100`, `#111827`) — selected has outer ring
- Paper width: SegTabs `80mm` | `58mm`
- Density: Select `Comfortable | Compact`

**Bottom button row:** "Reset to default" (secondary) + "Save receipt" (primary, `var(--mod-haraka)` crimson background)

**Right column — sticky, two cards:**

**Card 1 — Live preview**
- Header: "Live preview" label + "After sale" active badge
- Background: repeating diagonal stripe pattern (`surface-inset` / `surface-page`)
- Thermal receipt mockup (white paper, mono font, 268px wide, rounded, drop shadow):
  - Logo box (crimson square with M mark)
  - Business name (sans, bold) + address + tax no (gray, small)
  - Dashed separator
  - Receipt #, date, cashier
  - Line items: qty × name, total
  - Dashed separator
  - Subtotal + Tax rows (gray, small)
  - **TOTAL** (large, bold, crimson)
  - Dashed separator
  - Fawtara QR code (92px) + UUID label
  - Footer message (centered, bold)

**Card 2 — Deliver this receipt**
- 2×2 grid of share buttons: Copy link (indigo) · WhatsApp (green) · Email (blue) · Download PDF (gray)
- URL bar: `rcpt.makhzoon.me/r/[id]` + copy icon
- "Print receipt" button (full width, crimson background)

---

## 21. Inventory Screens — Additional Details

### Inventory list — row highlight
Rows where `stock === 'out'` get `background: var(--red-50)` (red tinted row).

### Inventory list — KPI row
3 KPIs above the table (not 4):
- Total SKUs (raseed accent)
- Below threshold (amber accent, red delta)
- Stock value in JOD (maal accent)

Plus two inline stock-alert badges in the toolbar end: `8 low` (warning) + `3 out` (danger).

### Inventory item detail — layout
Left column (narrower, 1fr): stock card
- Inventory icon in raseed-tinted square (48px)
- Large stock count (40px, amber if low, red if out)
- "units on hand · threshold N" subtitle
- Low stock badge
- Key-value rows: Unit cost, Category, Location, Supplier

Right column (wider, 2fr): stock movements table card
- Header: "Stock movements" + SegTabs (All / In / Out / Adjust)
- Table: Type badge | ±Qty (green/red) | Reason | By | Date

### Audits (stock) — in-progress banner
Active audit gets a prominent summary banner above the table:
- Raseed-tinted icon (Scan icon)
- Audit name + "In progress" warning badge
- "Started by X · N/M items counted" subtitle
- Progress bar (raseed color)
- "Continue" button

### Audit detail — counted input
Each row has an inline `<Input>` in the "Counted" column for entering the physical count. Variance column auto-calculates and colors green (=0) or red (negative).

---

## 22. Operations Screens — Additional Details

### Warranties list
Warning banner at top: "N warranties expire in the next 30 days. Email alerts sent automatically at 30, 14 and 7 days."

Reminder column: "On" (active badge) or "Off" (retired badge).

### Requests list — action column
Pending requests show inline "Reject" + "Approve" buttons.
Already-decided rows show status badge only.

### Reports — 3-donut row
Below the bar chart + category breakdown, a third row of 3 donut charts:
- Assets by status (Active vs Retired)
- Stock health (OK / Low / Out)
- Requests by type (BUY_NEW / REFILL / EXTEND / RETIRE)

Each donut has a center label (total count) + center subtitle.

### Warranty new — full page form
Not a modal — a full page with `AppShell`, centered card (maxWidth 620px):
- "Warranty covers" SegTabs: An asset | An inventory item
- Asset picker (Select)
- Vendor input
- Start/End date grid
- Reminder toggle (with description in `surface-inset` row)
- Notes textarea

### Request new — modal overlay
Dialog overlaid on the requests list (list dimmed behind it at 50% opacity):
- Request type: 2×2 grid of selectable type cards (REFILL / RETIRE / BUY_NEW / EXTEND_WARRANTY)
- Item/asset picker (changes based on type)
- Description textarea (required)
- Cancel + Submit buttons in footer

---

## 23. Haraka — Additional Details

### Register — header
`search={false}` — the register header does NOT have the global search bar.
Actions: Session open badge (green dot) · "Close till" secondary button.

### Sessions — active session card
Before the history table, a card showing the currently-open session:
- Raseed-style icon square but with haraka (crimson) color
- Till name + "Open" badge (crimson dot)
- "Opened by [name] · [time] · Float JOD [amount]"
- Today's sales total (crimson, large)
- "Close & count" button

### Customers — table columns
Name | Email | Tax number (for Fawtara B2B) | Phone | Total spent | Last purchase

### Transactions — segment tabs
All | Cash | Card | Voided

### POS mobile top bar (register)
Full crimson (`var(--mod-haraka)`) background header on mobile:
- Back arrow (white)
- "Current sale" title (white)
- Session badge (green dot + "Open")

---

## 24. Superadmin — Additional Details

### SA Org detail — tabs (underline style)
Overview · Subscription · Configuration · Audit log · Users

### SA Packages — card accent
Middle card (Business) gets a top accent border or highlighted ring using `primary-600`.

### SA Support ticket detail — right sidebar (280px)
Manage card:
- Status select
- Priority select
- Assign to select

Organization card:
- Plan / MRR / Open tickets (key-value)
- "Open org" secondary button (full width)

### SA Lists — two-column
Left (220px): list category selector (clickable items, active = primary-50 bg)
Right: active list items with drag handle + color swatch + EN label + switch + pencil

### SA Sync — warning banner
"Sync overwrites the entire target database. Use with care." — warning tone banner at top.

2×2 grid of sync pair cards. Running pair shows progress bar instead of Trigger button, plus "Running" warning badge.

### Transfer mode banner
Amber banner (`var(--amber-500)` background, `#231400` text) shown when superadmin is inside an org:
- Alert icon
- "Transfer Mode — you are viewing [Org Name] on its behalf. Every action is logged with your super-admin id."
- "Exit Transfer Mode" button (secondary, pushed to inline-end)

---

## 25. Permissions Editor Page — Full-page (not drawer)

Design shows the permissions editor as a **full AppShell page** (not a side drawer):
- Route: `/[locale]/[orgSlug]/users/[userId]/permissions` (or similar)
- Breadcrumb: Users → [User name] → Permissions
- Header actions: "Reset to role defaults" (secondary) + "Save changes" (primary)
- User info card at top: avatar (44px) + name + email + role badge + "Custom overrides" info badge
- Permission groups (cards with uppercase group label in primary-700):
  - **Core**: Assets (view/create/update/delete/import/checkout/maintenance/notes), Inventory (view/create/update/delete/transactions/audits), Warranties (view/create/update/delete)
  - **Commerce**: Purchases (view/create/receive), Point of Sale (process_sale/apply_discount/issue_refund/view_reports)
- Each permission is a pill-shaped toggle: granted = `primary-50` bg + `primary-700` text + check icon; denied = `surface-card` + `text-tertiary` + X icon
- `maxWidth: 860px, margin: 0 auto`

**Current**: `PermissionsEditor` exists as a drawer/modal. The design makes it a full page — decide whether to keep it as a drawer or match the design's full-page approach.
