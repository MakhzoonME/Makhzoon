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
- `{module}` — one of: `dashboard`, `usool`, `raseed`, `haraka`, `banna`, `loyalty`, `warranties`, `reports`, `support`, `audit-logs` (per `lib/nav/index.ts` → `ORG_NAV_ENTRIES`). There is no `requests` module.
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
- Page context (desktop only) — current module name (bold) + sub-page name (small), derived from `PageHeader`'s `breadcrumb` prop via `store/ui.store.ts` (`headerBreadcrumb`); the first two breadcrumb entries (org, space) are stripped, not shown as a trail.
- Search button opening `CommandPalette` (⌘K / Ctrl+K).
- Right actions:
  - `NotificationBell` (`components/notifications/NotificationBell.tsx`)
  - `NetworkStatusIndicator` (wifi icon — online/slow/offline)
  - `ThemeToggle` (sun/moon icon)
  - `LanguageToggle` (EN/AR)

> Note: there is no user-menu/avatar dropdown in the header. Profile/Settings/Logout live in the sidebar's bottom "User info" section (and in `MobileDrawer` on mobile), not `AppHeader`.

**Dark mode**: Header uses `bg-surface-card` with a bottom border — theme-aware via CSS custom properties, not a hardcoded `dark:` class.

---

## Mobile Navigation

**Component**: `components/layout/BottomNav.tsx`

On mobile (`flex md:hidden`): A fixed bottom navigation bar with icon+label tabs for the main modules.

- Shows a hardcoded set of 4 modules (`PRIMARY_NAV` in `BottomNav.tsx`): Dashboard, Usool (Assets), Banna, Warranties — plus a 5th "More" tab that opens `MobileDrawer` (full nav). This is not the same list as the sidebar's full module set.
- Active tab highlighted with the primary brand color (`text-primary-600`), not per-module brand colors.
- Tapping a tab navigates to that module's root page.
- Feature/permission-aware: each of the 4 tabs is filtered by its subscription feature flag and, for staff, by permission (`hasPermission`).

**Mobile Drawer**: `components/layout/MobileDrawer.tsx`

Opens from the hamburger in the header. Slides in from left (RTL: from right). Contains the full sidebar navigation including settings/profile links.

---

## Transfer Mode Banner

**Component**: `components/layout/TransferModeBanner.tsx`

Shown when a superadmin is acting in transfer mode (viewing/editing an org on the org's behalf).

- Fixed banner positioned just below the header (`top-14`), not above it — the header itself stays on top.
- Shows: "Transfer Mode — viewing [Org Name]" + "Exit Transfer Mode" button.
- Styled in a yellow/amber warning color so it's always visible.
- On "Exit": clears `transferOrgId` cookie and redirects back to superadmin.

---

## Page Transitions

**Component**: `components/layout/PageTransition.tsx`

Wraps page content in a `motion.div` (keyed by pathname) that animates:
- Enter: fade in (opacity 0 → 1) + upward translate (y: 12px → 0), 300ms.
- Exit: fade out (opacity 1 → 0) + slight upward translate (y: 0 → -8px), 180ms.

Uses `AnimatePresence mode="wait"`. Disabled when `prefers-reduced-motion` is set.

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
