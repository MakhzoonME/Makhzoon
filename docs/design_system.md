# Makhzoon Design System

This is the canonical reference for building Makhzoon UI. All values here are authoritative — if your code diverges from a token, update the code, not the token.

---

## 1. Brand

**Makhzoon** (مخزون) is a multi-tenant SaaS asset and inventory management platform. The brand is modern, precise, and trustworthy — comparable to Linear, Notion, or Vercel in visual register.

### Identity pillars
- **Precise** — clean layouts, sharp tokens, nothing decorative that isn't functional
- **Trustworthy** — consistent use of indigo brand color, structured hierarchy
- **Bilingual** — full Arabic/RTL support is first-class, not an afterthought

### Name usage
- Use **Makhzoon** or **مخزون** only
- Never use "Stored", "Inventoried", or any translation as a brand name

---

## 2. Logo

### Mark
- **Canonical mark:** Stacked Bars M (Option A) — geometric M inside a squircle
- Use the horizontal lockup (icon + wordmark) as the default
- Minimum size: 24×24px for the icon mark; use text-only wordmark below that
- Clear space: half the icon height on all sides — never crowd the mark

### Rules
- ✅ Use indigo fill on light backgrounds
- ✅ Keep the wordmark at font-weight 600
- ❌ Never stretch, rotate, or skew the mark
- ❌ Never add drop shadows or gradients to the icon
- ❌ Never place the wordmark in all-caps

---

## 3. Color Tokens

All colors are CSS custom properties defined in `app/globals.css`.

### Primary (Indigo — brand color)
| Token | Value |
|---|---|
| `--primary-700` | `#4338CA` |
| `--primary-600` | `#4F46E5` |
| `--primary-500` | `#6366F1` |
| `--primary-400` | `#818CF8` |
| `--primary-100` | `#E0E7FF` |
| `--primary-50`  | `#EEF2FF` |

### Neutrals (Gray scale)
| Token | Value |
|---|---|
| `--gray-950` | `#0A0A0F` |
| `--gray-900` | `#111827` |
| `--gray-800` | `#1F2937` |
| `--gray-700` | `#374151` |
| `--gray-600` | `#4B5563` |
| `--gray-500` | `#6B7280` |
| `--gray-400` | `#9CA3AF` |
| `--gray-300` | `#D1D5DB` |
| `--gray-200` | `#E5E7EB` |
| `--gray-100` | `#F3F4F6` |
| `--gray-50`  | `#F9FAFB` |
| `--white`    | `#FFFFFF` |

### Semantic colors
| Token | Value | Use |
|---|---|---|
| `--green-700` | `#15803D` | Success text |
| `--green-600` | `#16A34A` | Success action |
| `--green-100` | `#DCFCE7` | Success background |
| `--yellow-700` | `#A16207` | Warning text |
| `--yellow-600` | `#CA8A04` | Warning action |
| `--yellow-100` | `#FEF9C3` | Warning background |
| `--red-700` | `#B91C1C` | Danger text |
| `--red-600` | `#DC2626` | Danger action |
| `--red-100` | `#FEE2E2` | Danger background |
| `--blue-700` | `#1D4ED8` | Info text |
| `--blue-600` | `#2563EB` | Info action |
| `--blue-100` | `#DBEAFE` | Info background |
| `--amber-500` | `#F59E0B` | Warranty/expiry accent |
| `--violet-600` | `#7C3AED` | Alternative accent |

### Surface tokens — Light mode
| Token | Value |
|---|---|
| `--surface-page` | `#F8FAFC` |
| `--surface-card` | `#FFFFFF` |
| `--surface-sidebar` | `#FFFFFF` |
| `--border-default` | `#E5E7EB` |
| `--border-strong` | `#D1D5DB` |
| `--text-primary` | `#111827` |
| `--text-secondary` | `#6B7280` |
| `--text-tertiary` | `#9CA3AF` |

### Surface tokens — Dark mode (`[data-theme="dark"]`)
| Token | Value |
|---|---|
| `--surface-page` | `#0F1117` |
| `--surface-card` | `#1A1D27` |
| `--surface-sidebar` | `#13151E` |
| `--border-default` | `#252836` |
| `--border-strong` | `#333647` |
| `--text-primary` | `#F1F2F6` |
| `--text-secondary` | `#8B91A8` |
| `--text-tertiary` | `#5C6275` |

Dark mode semantic tints use `rgba()` to overlay the dark backgrounds correctly:
- `--primary-100`: `rgba(99,102,241,0.15)` · `--primary-50`: `rgba(99,102,241,0.08)`
- `--green-100`: `rgba(22,163,74,0.15)` · `--red-100`: `rgba(220,38,38,0.15)`
- `--yellow-100`: `rgba(202,138,4,0.15)` · `--blue-100`: `rgba(37,99,235,0.15)`

### Special
- Superadmin sidebar background: `--sa-bg: #1E3A5F`
- Superadmin sidebar text: `--sa-text: #BFDBFE`

---

## 4. Typography

### Font families
| Role | Font | Fallbacks |
|---|---|---|
| Display headings (H1–H2) | **Thamanyah** | Geist, system-ui |
| UI body (H3–caption, all UI text) | **Capriola** | Geist, system-ui |
| Arabic text (any level) | **Thamanyah** | Noto Sans Arabic, system-ui |
| IDs, serials, code, data | **Geist Mono** | JetBrains Mono, ui-monospace |

### Type scale
| Class | Size | Weight | Line height | Notes |
|---|---|---|---|---|
| `.t-display` | 2.25rem (36px) | 700 | 1.1 | letter-spacing: -0.02em · Thamanyah |
| `.t-h1` | 1.875rem (30px) | 700 | 1.2 | letter-spacing: -0.01em · Thamanyah |
| `.t-h2` | 1.5rem (24px) | 600 | 1.3 | letter-spacing: -0.005em · Thamanyah |
| `.t-h3` | 1.25rem (20px) | 600 | 1.4 | Thamanyah |
| `.t-h4` | 1.125rem (18px) | 600 | 1.4 | Capriola |
| `.t-body-lg` | 1rem (16px) | 400 | 1.6 | Capriola |
| `.t-body` | 0.875rem (14px) | 400 | 1.6 | Capriola · most UI text |
| `.t-body-sm` | 0.8125rem (13px) | 400 | 1.5 | Capriola |
| `.t-caption` | 0.75rem (12px) | 500 | 1.4 | letter-spacing: 0.01em |
| `.t-mono` | 0.8125rem (13px) | 400 | 1.5 | Geist Mono · `color: gray-500` |
| `.t-arabic` | (any) | — | — | Thamanyah · `direction: rtl` |

### Typography rules
- `.muted` adds `color: var(--text-secondary)` — use for secondary/helper text
- ✅ Use semantic classes (`.t-h1`, `.t-body`, etc.), never raw `font-size` inline styles
- ✅ Arabic text: always use `font-arabic` class + `dir="auto"` attribute
- ✅ IDs, serial numbers, timestamps: always `font-mono`
- ❌ No raw black `#000` or white `#fff` for text — use token classes
- ❌ No inline `color` styles — use Tailwind utilities
- ❌ No `font-weight < 400` for body text
- ❌ No `font-size` below 12px anywhere in the UI

### Tailwind font config
```ts
fontFamily: {
  sans:    ['Capriola', 'Geist', 'system-ui', 'sans-serif'],
  display: ['Thamanyah', 'Geist', 'system-ui', 'sans-serif'],
  arabic:  ['Thamanyah', 'Noto Sans Arabic', 'sans-serif'],
  mono:    ['Geist Mono', 'JetBrains Mono', 'ui-monospace'],
}
```

---

## 5. Spacing & Layout

All spacing is on a **4px grid**. Use Tailwind spacing utilities; never hardcode arbitrary pixel values.

### Common spacing values
| Use case | Value | Tailwind |
|---|---|---|
| Gap between page sections | 24px | `gap-6` |
| Card inner padding | 24px | `p-6` |
| Table cell padding | 12px 16px | `py-3 px-4` |
| Form row gap | 16px | `gap-4` |
| Inline button gap (icon + label) | 8px | `gap-2` |
| Sidebar item padding | 8px 10px | `py-2 px-2.5` |

### Layout dimensions
| Element | Value | Tailwind |
|---|---|---|
| Header height | 56px | `h-14` (fixed, never taller) |
| Sidebar expanded | 240px | `w-60` |
| Sidebar collapsed | 68px | `w-17` |
| Dialog max-width | 520px (640px complex) | — |
| Page max-width | 1280px | `max-w-screen-xl mx-auto` |
| Page horizontal padding | 24px mobile / 32px ≥lg | `px-6 md:px-8` |

### Border radius
| Token | Value | Usage |
|---|---|---|
| `--r-sm` | 6px | Badges, chips |
| `--r-md` | 8px | Buttons, inputs |
| `--r-lg` | 10px | Cards, dialogs |
| `--r-xl` | 14px | Modals, sheets |

### Shadows
| Token | Value (light) |
|---|---|
| `--shadow-xs` | `0 1px 2px 0 rgb(0 0 0 / 0.05)` |
| `--shadow-sm` | `0 1px 3px 0 rgb(0 0 0 / 0.07), ...` |
| `--shadow-md` | `0 4px 6px -1px rgb(0 0 0 / 0.08), ...` |
| `--shadow-lg` | `0 10px 15px -3px rgb(0 0 0 / 0.10), ...` |

Dark mode shadows are stronger (0.30–0.50 opacity) to compensate for low contrast.

---

## 6. Motion

### Easing curves
| Token | Value | Use |
|---|---|---|
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Enter transitions, page loads |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Playful pops, bouncy elements |
| `--ease-in` | `cubic-bezier(0.7, 0, 1, 0.6)` | Exit transitions |
| `--ease-smooth` | `cubic-bezier(0.65, 0, 0.35, 1)` | Sidebar collapse, smooth slides |

### Duration scale
| Token | Value | Use |
|---|---|---|
| `--dur-micro` | 120ms | Button press feedback |
| `--dur-fast` | 200ms | Hover states, icon swaps |
| `--dur-base` | 300ms | Standard transitions (modals, drawers) |
| `--dur-slow` | 450ms | Sidebar collapse, page transitions |

### Framer Motion presets

```ts
// Page transition
const pageVariants = {
  initial:  { opacity: 0, y: 8 },
  animate:  { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }},
  exit:     { opacity: 0, y: -4, transition: { duration: 0.18, ease: [0.7, 0, 1, 0.6] }},
};

// Modal enter
const modalVariants = {
  initial:  { opacity: 0, scale: 0.96, y: 8 },
  animate:  { opacity: 1, scale: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }},
  exit:     { opacity: 0, scale: 0.96, y: 4, transition: { duration: 0.18, ease: [0.7, 0, 1, 0.6] }},
};

// Sidebar collapse
<motion.aside animate={{ width: collapsed ? 68 : 240 }}
  transition={{ duration: 0.45, ease: [0.65, 0, 0.35, 1] }} />

// Button press — apply to all interactive buttons
whileTap={{ scale: 0.97 }}
transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
```

Always respect reduced motion:
```ts
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
```

---

## 7. Icons

### Library
**Lucide React** exclusively. Never substitute other icon sets — mixing stroke weights breaks visual rhythm.

```ts
// ✅ Named imports only (tree-shaking)
import { Package, Shield, Bell, ChevronRight, Search, Plus } from 'lucide-react';

// Usage
<Package size={20} strokeWidth={1.75} />
<Shield size={16} className="text-primary-600" />

// ❌ Never
import * as Icons from 'lucide-react';
```

### Canonical spec
| Property | Value |
|---|---|
| Stroke width | **1.75** (never override in data-dense UI) |
| Stroke linecap | round |
| Stroke linejoin | round |
| viewBox | 0 0 24 24 |
| fill | none (outline only) |
| color | CSS variable token always |

### Size system
| Size | Name | Usage |
|---|---|---|
| 12px | Micro | Inline within Badge or Caption only |
| 14px | XS | Button sm (28px height), breadcrumb separators |
| 16px | SM | Button md (36px height), input prefix/suffix, table row actions |
| **18px** | **MD (default)** | Sidebar nav, header actions, card titles, most UI |
| 20px | LG | Button lg (44px height), KPI card icons, empty state |
| 24px | XL | Section headings, feature highlights, notifications |
| 32px | 2XL | Empty state primary icon, modal header illustration |
| 48px | 3XL | Hero illustration placeholders, large empty states only |

### Icon color rules
| State | Color token | Usage |
|---|---|---|
| Default / muted | `gray-400` | Non-active nav, decorative, secondary actions |
| Body / medium | `gray-600` | Default interactive icons, table row actions |
| Active / brand | `primary-600` | Active nav, primary action buttons, links |
| On dark surface | `white` | Icons inside primary buttons or dark sidebar |

Semantic tones:
- Success: `green-600` · Warning: `yellow-600` · Danger: `red-600` · Info: `blue-600`

### Icon groups by module
| Group | Key icons |
|---|---|
| Navigation | Home, ChevronRight, ChevronDown, ChevronLeft, Command, Settings, LogOut, MoreHorizontal |
| Assets & inventory | Package, Archive, Layers, Tag, QrCode, MapPin, Wrench, Activity |
| Warranties & requests | Shield, AlertTriangle, Clock, Bell, Inbox, Check, X, RefreshCcw |
| Users & auth | User, Users, Eye, Pencil, Trash, Plus, Search, Filter |
| Data & reports | BarChart, FileText, Download, Upload |

---

## 8. Components

### Buttons
```tsx
<Button
  variant="primary"       // 'primary' | 'secondary' | 'destructive' | 'ghost' | 'link'
  size="md"               // 'sm' (28px) | 'md' (36px) | 'lg' (44px)
  icon={PlusIcon}         // lucide-react icon, optional
  disabled={isLoading}
>
  Add asset
</Button>
```
- Apply `whileTap={{ scale: 0.97 }}` on all interactive buttons
- Minimum touch target: 36×36px (md), 44×44px for mobile (lg)

### Badges
```tsx
<Badge tone="active" dot>Active</Badge>
```
Tones: `active` · `retired` · `pending` · `approved` · `rejected` · `expired` · `expiring` · `valid` · `admin` · `staff` · `superadmin` · `info`

- Always use `Badge` for status in table cells — never raw colored text

### Inputs
```tsx
<div className="flex flex-col gap-1.5">
  <label className="text-sm font-medium text-gray-700">{label}</label>
  <Input placeholder="..." error={!!errors.field} {...register('field')} />
  {errors.field && <p className="text-xs text-red-600">{errors.field.message}</p>}
</div>
```

### Cards
```tsx
<Card>                    // white bg, border, shadow-xs, 24px padding
<Card padded={false}>     // edge-to-edge content (tables)
<Card accent="var(--primary-600)">  // left border accent (3px)
```

### Status badge data states
| Entity | Status | Badge tone |
|---|---|---|
| Asset | Active | `active` (green) |
| Asset | Retired | `retired` (gray) |
| Warranty | Valid | `valid` (green) |
| Warranty | Expiring (≤30d) | `expiring` (yellow) |
| Warranty | Expired | `expired` (red) |
| Stock | OK | green |
| Stock | Low | yellow |
| Stock | Out | red + row tint |
| Request | Pending | `pending` (yellow) |
| Request | Approved | `approved` (green) |
| Request | Rejected | `rejected` (red) |

### Modals
- Max-width: 520px (640px for complex forms)
- Use `modalVariants` Framer Motion preset
- Backdrop: `rgba(0,0,0,0.4)`
- Destructive confirms: require explicit type-to-confirm for irreversible actions

### Side drawers
- Slides in from the right (LTR) / left (RTL)
- Use for detail panels, history, contextual forms
- Width: 400px default, 520px for complex content
- Animate with `--ease-smooth` 300ms

### Dropdowns
- Context action menus for table row actions
- Searchable select for long option lists
- Use Radix UI primitives

### Date picker
- Full calendar with today indicator, range selection, disabled dates
- Include RTL layout note — calendar flips in Arabic mode

### Toasts
- 4 tones: success, error, warning, info
- Auto-dismiss: **4000ms**, then fade out
- Position: bottom-right (LTR), bottom-left (RTL)

### Avatars
- Size scale: 16 / 24 / 32 / 40 / 48 / 64 / 72px
- Deterministic color palette from name hash
- Avatar groups: overlap stack with `−8px` margin

### User profile card
- Header band, avatar, role badge, metadata rows, action footer

### Empty states
- 48px icon (`gray-300`) + title + description + CTA
- Skeleton width: 60–90% of content width

### Skeleton loaders
- Use `animate-pulse bg-gray-200 dark:bg-gray-700` (Tailwind)
- Or custom shimmer: `background-size: 200%` keyframe sweep

---

## 9. Navigation

### Responsive breakpoints
| Breakpoint | Navigation |
|---|---|
| Mobile (< 768px) | Top bar + **bottom tab bar** (5 tabs) |
| Tablet (768px–1024px) | Sidebar collapsed (68px icon-only) |
| Desktop (≥ 1024px) | Sidebar expanded (240px) |
| Wide (≥ 1280px) | Sidebar expanded + full page content |

### Desktop sidebar
- Expanded: **240px** · Collapsed: **68px** (icons + tooltips)
- Collapse animation: `cubic-bezier(0.65, 0, 0.35, 1)` 450ms
- Active item: `bg-primary-50`, `text-primary-700`, `font-semibold`, left border 2px `primary-600`
- Inactive item: `text-gray-600`, hover `bg-gray-100 text-gray-900`

```tsx
const SidebarItem = ({ active, label, icon: Icon, badge }) => (
  <Link className={cn(
    'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-all relative cursor-pointer select-none',
    active
      ? 'bg-primary-50 text-primary-700 font-semibold'
      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
  )}>
    {active && (
      <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-primary-600 rounded-r" />
    )}
    <Icon size={18} className={active ? 'text-primary-600' : 'text-gray-400'} />
    <span className="flex-1 truncate">{label}</span>
    {badge != null && (
      <span className={cn(
        'text-xs font-semibold px-1.5 rounded-full',
        active ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600',
      )}>{badge}</span>
    )}
  </Link>
);
```

### Desktop topbar
- Height: 56px (`h-14`), fixed
- Zones: breadcrumb (left) · search (center) · notifications + avatar (right)

### Mobile bottom tab bar
- Height: 64px, 5 tabs: Home, Assets, Requests, Warranties, More
- Active: `primary-600` fill + top indicator bar (2px, `primary-600`)
- Badge: red dot, 9px font, white border
- Icon size: 22px, `strokeWidth={2}` when active, 1.75 inactive

### Mobile top bar
- Height: 52px
- Logo mark (28px) + page title + bell icon + avatar

### Mobile side panel (left drawer)
- Width: 280px
- Opens from left on "More" tap or hamburger
- User header at top (avatar + name + role badge)
- Full nav list + sign out at bottom

### Sidebar nav items order
1. Dashboard (Home icon)
2. Assets (Package icon)
3. Inventory (Layers icon)
4. Warranties (Shield icon)
5. Requests (Inbox icon) — badge with count
6. Reports (BarChart icon)
7. Users (Users icon)
8. Audit Logs (FileText icon)
9. Support (Wrench icon)
10. Subscription (Tag icon) — settings group
11. Settings (Settings icon) — settings group

---

## 10. Dark Mode

### Implementation
Theme is set via `data-theme="light|dark"` on `<html>`. Managed by Zustand store.

```ts
// store/theme.store.ts
import { create } from 'zustand';
type Theme = 'light' | 'dark';

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: (() => {
    if (typeof window === 'undefined') return 'light';
    const saved = localStorage.getItem('makhzoon-theme') as Theme | null;
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  })(),
  setTheme: (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('makhzoon-theme', theme);
    set({ theme });
  },
  toggle: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
}));
```

### Rules
- All surface, border, and text colors must use CSS variable tokens — never hardcode
- Primary indigo stays the same in dark mode
- Semantic tints use `rgba()` overlays in dark mode (see Color Tokens section)
- Shadows are stronger in dark mode (glow-based, 0.30–0.50 opacity)
- Body background transitions: `transition: background 300ms var(--ease-smooth), color 300ms var(--ease-smooth)`

---

## 11. Arabic / RTL

### Setup
Set `dir` and `lang` on `<html>` from locale store.

```tsx
// app/layout.tsx
const { lang, dir } = useLocaleStore();
return <html lang={lang} dir={dir} data-theme="light">
```

### CSS logical properties — mandatory
```css
/* ✅ Use logical properties */
margin-inline-start: 16px;    /* replaces margin-left in LTR */
padding-inline-end: 12px;     /* replaces padding-right in LTR */
border-inline-start: ...;     /* replaces border-left in LTR */
inset-inline-start: 0;        /* replaces left: 0 in LTR */

/* ❌ Never use physical properties */
margin-left: 16px;
left: 0;
```

### Typography in Arabic
- Always use `font-arabic` (Thamanyah) for Arabic text
- `dir="auto"` on text containers that may be mixed language
- Arabic type scale mirrors English scale but uses Thamanyah at all levels
- Sidebar, modals, drawers, and navigation all flip in RTL

---

## 12. Accessibility

| Rule | Value |
|---|---|
| Min click target | 36×36px (md button) |
| Mobile min target | 44×44px (lg button) |
| Focus ring | 3px, `rgba(79,70,229,0.20)` |
| Focus offset | 2px from element edge |
| Table row hover | `bg-gray-50`, 150ms |
| Active row | `bg-primary-50` |
| Tooltip delay | 600ms show, 0ms hide |
| Reduced motion | `@media (prefers-reduced-motion: reduce)` — set all durations to 0.01ms |

---

## 13. Route Structure

| Route | Page |
|---|---|
| `/login` | Login (centered card, dot grid, Variant A) |
| `/signup` | Signup |
| `/[orgSlug]/dashboard` | Org home / KPIs |
| `/[orgSlug]/assets` | Asset list |
| `/[orgSlug]/assets/[id]` | Asset detail |
| `/[orgSlug]/assets/new` | Create asset |
| `/[orgSlug]/assets/import` | CSV import |
| `/[orgSlug]/inventory` | Inventory list |
| `/[orgSlug]/warranties` | Warranties |
| `/[orgSlug]/requests` | Requests |
| `/[orgSlug]/reports` | Reports |
| `/[orgSlug]/users` | User management |
| `/[orgSlug]/audit-logs` | Audit log |
| `/[orgSlug]/support` | Support tickets |
| `/[orgSlug]/settings` | Org settings |
| `/[orgSlug]/subscription` | Subscription |
| `/superadmin` | Superadmin portal |

### Login screen spec (Variant A — locked)
- Layout: centered card on `surface-page` with subtle dot grid background
- Card: 480px wide, `shadow-lg`, `r-xl`, white background
- Fields: email → password → submit button (full width, primary, lg)
- No decorative split-screen panels

---

## 14. Permission-gated UI

```ts
// hooks/usePermission.ts
export function usePermission(module: string, action: string) {
  const { user } = useAuth();
  return hasPermission(user, module, action);
}

// Hide elements the user cannot perform
const canCreateAsset = usePermission('assets', 'create');
{canCreateAsset && <Button icon={PlusIcon}>Add asset</Button>}

// Subscription feature gates
const { features } = useAuth();
{features.reports ? <ReportsPage /> : <UpgradePrompt feature="Reports" />}
```

- Always validate permissions in API routes too — UI hiding is UX, not security
- Superadmin routes (`/superadmin/*`) use dark navy sidebar (`--sa-bg: #1E3A5F`)

---

## 15. Tailwind Config

Add to `tailwind.config.ts` → `theme.extend`:

```ts
theme: {
  extend: {
    fontFamily: {
      sans:    ['Capriola', 'Geist', 'system-ui', 'sans-serif'],
      display: ['Thamanyah', 'Geist', 'system-ui', 'sans-serif'],
      arabic:  ['Thamanyah', 'Noto Sans Arabic', 'sans-serif'],
      mono:    ['Geist Mono', 'JetBrains Mono', 'ui-monospace'],
    },
    colors: {
      primary: {
        50:  'var(--primary-50)',
        100: 'var(--primary-100)',
        400: 'var(--primary-400)',
        500: 'var(--primary-500)',
        600: 'var(--primary-600)',
        700: 'var(--primary-700)',
      },
      surface: {
        page:    'var(--surface-page)',
        card:    'var(--surface-card)',
        sidebar: 'var(--surface-sidebar)',
      },
      border: {
        DEFAULT: 'var(--border-default)',
        strong:  'var(--border-strong)',
      },
    },
    borderRadius: {
      sm:  'var(--r-sm)',
      md:  'var(--r-md)',
      lg:  'var(--r-lg)',
      xl:  'var(--r-xl)',
    },
    boxShadow: {
      xs: 'var(--shadow-xs)',
      sm: 'var(--shadow-sm)',
      md: 'var(--shadow-md)',
      lg: 'var(--shadow-lg)',
    },
    transitionTimingFunction: {
      'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      'spring':   'cubic-bezier(0.34, 1.56, 0.64, 1)',
      'in-sharp': 'cubic-bezier(0.7, 0, 1, 0.6)',
      'smooth':   'cubic-bezier(0.65, 0, 0.35, 1)',
    },
    transitionDuration: {
      micro: '120ms',
      fast:  '200ms',
      base:  '300ms',
      slow:  '450ms',
    },
  },
}
```

---

## 16. globals.css

Add the full token set from `tokens.css` (which ships with the design system bundle) to `app/globals.css`. The structure is:

```css
:root { /* light mode tokens */ }
[data-theme="dark"] { /* dark mode overrides */ }
body { font-family: var(--font-sans); color: var(--text-primary); background: var(--surface-page); }
/* type scale classes: .t-display .t-h1 .t-h2 ... .t-mono .t-arabic */
/* utility: .muted .kbd */
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; } }
```
