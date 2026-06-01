# Org Portal — Layout & Navigation

---

## Overview

The org portal is the main workspace for org admins and staff. It lives under `/{locale}/{orgSlug}/{spaceSlug}/` and consists of a collapsible sidebar, a top header bar, and a bottom nav on mobile.

---

## URL Structure

```
/{locale}/{orgSlug}/{spaceSlug}/{module}/[sub-path]

Examples:
/en/acme-corp/main/dashboard
/en/acme-corp/main/usool/list
/en/acme-corp/branch-2/raseed/purchases/new
/ar/acme-corp/main/haraka/register
```

- `{locale}` — `en` or `ar`
- `{orgSlug}` — organization's unique URL slug
- `{spaceSlug}` — active space's URL slug
- `{module}` — one of: `dashboard`, `usool`, `raseed`, `haraka`, `warranties`, `requests`, `reports`, `audit-logs`
- Org-level pages (no space): `settings`, `users`, `subscription`, `support`, `profile`

---

## Sidebar

**Component**: `components/layout/AppSidebar.tsx`

**Desktop** (`hidden md:flex`): Visible on md+ screens.

**Widths**:
- Expanded: 240px
- Collapsed: 68px (icon-only)

**Animation**: `motion.aside` with `width` spring animation. Labels animate in/out with `motion.span` (opacity + width). Easing: `[0.4, 0, 0.2, 1]`.

**Collapse state**: Stored in `store/ui.store.ts` → `sidebarCollapsed`. Persisted to `localStorage`.

**Collapse toggle**: ChevronLeft / ChevronRight button at the bottom of the sidebar.

**Sections**:
1. **Space Switcher** (top) — shows active space; dropdown to switch spaces.
2. **Main Navigation** — module links with icons. Active state uses module brand color for:
   - Left border accent
   - Icon fill/stroke
   - Pill background (semi-transparent)
3. **Bottom links**: Settings, Profile, Logout.
4. **User info** (bottom) — avatar, display name, role badge. Collapses to avatar only when collapsed.

**Module subtitles**: In English locale, each module item shows the Arabic name as a small subtitle beneath the English label when the sidebar is expanded.

**Feature gating**: Nav items are hidden if the corresponding feature is not enabled in the org's subscription.

**Permission gating**: Some nav items (e.g. Reports, Audit Logs) are hidden if the user lacks the required permission.

---

## Top Header

**Component**: `components/layout/AppHeader.tsx`

**Layout** (left to right):
- Hamburger / menu button (mobile only) → opens `MobileDrawer`.
- Breadcrumb navigation showing current org → space → module.
- Right actions:
  - `NetworkStatusIndicator` (wifi icon — online/slow/offline)
  - `ThemeToggle` (sun/moon icon)
  - `LanguageToggle` (EN/AR)
  - User menu (avatar button → dropdown with Profile, Settings, Logout)

**Dark mode**: Header uses `bg-surface-card dark:bg-gray-900` with a bottom border.

---

## Mobile Navigation

**Component**: `components/layout/BottomNav.tsx`

On mobile (`flex md:hidden`): A fixed bottom navigation bar with icon+label tabs for the main modules.

- Shows 4-5 key modules as icon tabs.
- Active tab highlighted with the module color.
- Tapping a tab navigates to that module's root page.
- Module-aware: tabs show only enabled modules.

**Mobile Drawer**: `components/layout/MobileDrawer.tsx`

Opens from the hamburger in the header. Slides in from left (RTL: from right). Contains the full sidebar navigation including settings/profile links.

---

## Transfer Mode Banner

**Component**: `components/layout/TransferModeBanner.tsx`

Shown when a superadmin is acting in transfer mode (viewing/editing an org on the org's behalf).

- Fixed banner at the top of the screen (above the header).
- Shows: "Transfer Mode — viewing [Org Name]" + "Exit Transfer Mode" button.
- Styled in a distinct warning color (amber/orange) so it's always visible.
- On "Exit": clears `transferOrgId` cookie and redirects back to superadmin.

---

## Page Transitions

**Component**: `components/layout/PageTransition.tsx`

Wraps page content in a `motion.div` that animates:
- Fade in (opacity 0 → 1)
- Slight upward translate (y: 8px → 0)

Duration: 180ms. Disabled when `prefers-reduced-motion` is set.

---

## Shared UI Components (used across all modules)

| Component | Description |
|-----------|-------------|
| `PageHeader` | Title + subtitle + action buttons row at top of each page |
| `DataTable` | Sortable/filterable table with pagination and row selection |
| `FilterBar` | Search + filter dropdowns row above tables |
| `StatusBadge` | Colored pill badge for statuses |
| `ConfirmDialog` | Accessible destructive action confirmation modal |
| `BulkActionsBar` | Floating bottom bar for multi-row operations |
| `NetworkStatusIndicator` | Wifi icon showing online/slow/offline state |
| `ThemeToggle` | Sun/moon dark/light toggle |
| `LanguageToggle` | EN/AR locale switcher |
