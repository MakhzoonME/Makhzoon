# Network Status & UI Components

---

## Network Status Indicator

**Component**: `components/shared/NetworkStatusIndicator.tsx`

A wifi icon that reflects real-time connectivity state. Appears in:
- **Org portal** — `AppHeader.tsx` (right actions row), `variant="ghost-light"`
- **Superadmin portal** — `SuperAdminBanner.tsx` (top banner right side), `variant="ghost-dark"`

### States

| State | Icon | Color | Trigger |
|-------|------|-------|---------|
| `online` | Full wifi bars | Green | `/api/ping` succeeds + connection not slow |
| `slow` | Partial bars faded | Amber | Ping succeeds but `effectiveType` is `'2g'` or `'slow-2g'` |
| `offline` | Bars with X | Red | 3 consecutive ping failures |

### Detection logic
1. Polls `GET /api/ping` every 15 seconds.
2. Listens to `window` `online` / `offline` browser events.
3. Listens to `navigator.connection.change` (Network Information API) events.
4. `_isSlowConnection()` is called on each successful ping — checks `navigator.connection.effectiveType`.
5. Requires **3 consecutive failures** before transitioning to `offline` (debounces flaky connections).

### Toast notifications
- State change to `offline` → error toast: "You're offline."
- State change to `slow` → info toast: "Connection is slow."
- Recovery to `online` → success toast: "Back online."

---

## Animations & Motion

**Library**: Framer Motion

### Tokens (CSS custom properties)

**Easing**:
- `--ease-out-expo`
- `--ease-spring`
- `--ease-in-sharp`
- `--ease-in-out-smooth`

**Duration**:
- `--duration-fast`: 120ms
- `--duration-normal`: 180ms
- `--duration-moderate`: 250ms
- `--duration-slow`: 350ms
- `--duration-slower`: 450ms

### Applied animations

| Animation | Component | Details |
|-----------|-----------|---------|
| Sidebar collapse | `AppSidebar`, superadmin layout | `motion.aside` width spring (240px ↔ 68px) |
| Sidebar label fade | Sidebar nav items | `motion.span` opacity + width |
| Page transition | `PageTransition` | Fade + y-translate (8px → 0) on route change |
| BulkActionsBar entrance | `BulkActionsBar` | Slide up from bottom |
| Button hover | All buttons | `whileHover: { y: -1 }` lift |
| Button press | All buttons | `whileTap: { scale: 0.97 }` |
| Card hover | Dashboard metric cards | `whileHover: { y: -2 }` |
| Skeleton loading | Skeleton components | Gradient shimmer via CSS animation |
| Dialog open/close | All Radix dialogs | Scale + fade via Radix `AnimatePresence` |

### Accessibility
All Framer Motion animations check `prefers-reduced-motion`. When set, durations drop to near-zero (1-2ms) so motion does not trigger vestibular discomfort.

---

## Shared DataTable

**Component**: `components/shared/DataTable.tsx`

Used on every list page across all modules.

**Features**:
- Column definitions via `ColumnDef<T>[]` interface (similar to TanStack Table).
- Sortable columns (click header to toggle asc/desc).
- Pagination (configurable page size).
- Row selection (checkbox column — appears when `selectable` prop + permissions allow).
- Empty state slot (custom empty illustration + message).
- Loading skeleton (animated rows while data loads).
- Responsive: horizontal scroll on mobile for wide tables.

**Dark mode**: Table uses `dark:bg-gray-900` background, `dark:border-gray-700` dividers, `dark:hover:bg-gray-800` row hover.

---

## Shared FilterBar

**Component**: `components/shared/FilterBar.tsx`

Appears above every DataTable. Consists of:
- Search input (text) with debounce.
- Dropdown filters (each powered by a `Select` from shadcn/ui).
- "Clear filters" button (appears when any filter is active).

Filters are passed as URL search params so they survive page refresh and can be linked to directly.

---

## Toast Notifications

Toast notifications (`hooks/ui/useToast.ts`, wrapping a library like `sonner` or `react-hot-toast`) are used for:
- Success confirmations (asset saved, transaction recorded, etc.)
- Error messages (API errors, validation failures)
- Informational updates (network status changes)
- Blocking delete errors (e.g. "Cannot delete item — it is referenced by active records")

Toasts appear in the top-right corner (bottom-right on mobile). Dark mode: toast adapts to `dark:bg-gray-800` background.
