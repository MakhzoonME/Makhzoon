# Makhzoon Project Context

## 1. Project Overview

**Makhzoon** (مخزون) is a **Business OS for Arab organizations** — a multi-tenant SaaS platform built to replace spreadsheets across five core business domains: assets, inventory, sales/POS, finance, and workspace configuration.

**Vision / Positioning:** "أدير عملك في مكان واحد. بدون جداول بيانات." (Run your business in one place. No spreadsheets.)

**Target Users:**
- Small to medium-sized organizations across multiple industries (Technology, Healthcare, Finance, Retail, Manufacturing, Education, Government, Non-Profit)
- Org owners and admins (manage users, subscriptions, configurations)
- Staff members (create requests, view assets, track inventory)
- Makhzoon support team (manage subscriptions, troubleshoot issues)
- Superadmin (manage all organizations, team, backend logs, configurations)

**Key Value Propositions:**
- Centralized asset register with full audit trail
- Inventory tracking with reorder thresholds and stock movements
- Warranty expiry alerts and management
- Request workflow (new asset, retire, extend warranty requests)
- Detailed usage and cost reports
- In-app support ticketing
- Granular role-based access control (RBAC) with custom permissions per user

---

## 2. The Five Modules (Module Identity System)

Makhzoon is organized around five named modules, each with a distinct Arabic name, English brand name, and brand color. These identities are applied consistently across nav, marketing, and UI.

| Module | Arabic | English | Color | Domain |
|--------|--------|---------|-------|--------|
| أصول | Usool | Assets | `#00695C` (deep teal) | Asset management |
| رصيد | Raseed | Inventory | `#E65100` (deep orange) | Inventory management |
| حركة | Haraka | POS/Sales | `#6A1B9A` (deep purple) | Point of sale |
| مال | Maal | Finance | `#1B5E20` (deep green) | Finance & reporting |
| بنّا | Banna | Workspace | `#1565C0` (deep blue) | Workspace builder |

**Brand colors:**
- Brand Navy: `#0F3F5C`
- Brand Teal: `#1A7A9A`

**How module identity is applied:**
- `lib/nav/index.ts` — Each nav item has `moduleColor?: string` and `moduleName?: string`
- `components/layout/AppSidebar.tsx` — Active nav items use module color for pill background, left border, and icon; Arabic module name shown as subtitle in EN locale
- `components/layout/BottomNav.tsx` — Module-aware icons on mobile bottom nav
- `locales/messages.ts` — `nav.assets = 'Usool'` / `nav.inventory = 'Raseed'` (EN); `nav.assets = 'أصول'` / `nav.inventory = 'رصيد'` (AR)
- Marketing pages — Module cards use module color for border, background tint, and name display

---

## 3. Core Features

### 3.1 Asset Management (أصول / Usool)
- **Asset Register:** Create, edit, retire, and import assets (CSV)
- **Asset Fields:** Name, category, status, serial number, purchase date/cost, assigned person, location, notes
- **Asset Statuses:** Active, Retired (configurable via org config)
- **Asset Actions:** QR code generation and download, checkout/check-in, maintenance records, asset notes
- **Asset Import:** Bulk import via CSV file with validation
- **Asset Export:** Export all assets to CSV with audit metadata
- **Routes:** `/[orgSlug]/assets/`, `/[orgSlug]/assets/[assetId]/`, `/[orgSlug]/assets/new`, `/[orgSlug]/assets/import`

### 3.2 Inventory Management (رصيد / Raseed)
- **Inventory Items:** Track stocked items with quantity, reorder thresholds, unit cost
- **Stock Status:** Automatic calculation of stock health (ok, low, out)
- **Units:** Each, box, pack, pair, roll, liter, kg, meter, sheet, set
- **Transactions:** Record in/out/adjustment movements with reason and performer tracking
- **Inventory Audits:** Physical count audits (draft → in_progress → completed)
- **Routes:** `/[orgSlug]/inventory/`, `/[orgSlug]/inventory/[itemId]/`, `/[orgSlug]/inventory/audits/`

### 3.3 Warranty Management
- **Warranty Tracking:** Track vendor warranties per asset with start/end dates
- **Alerts:** Progressive alerts at 30, 14, and 7 days before expiration
- **Cron Endpoint:** `/api/cron/warranty-alerts` (triggered externally, secured by `CRON_SECRET`)
- **Routes:** `/[orgSlug]/warranties/`, `/[orgSlug]/warranties/[warrantyId]/edit`

### 3.4 Requests Workflow
- **Request Types:** REFILL, RETIRE, BUY_NEW, EXTEND_WARRANTY
- **Status Flow:** PENDING → APPROVED or REJECTED
- **Routes:** `/[orgSlug]/requests/`

### 3.5 Reports & Analytics
- **Dashboard Metrics:** Quick stats on assets, inventory, warranties, requests
- **Reports Module:** Utilization, depreciation, and cost analytics
- **Routes:** `/[orgSlug]/dashboard/`, `/[orgSlug]/reports/`

### 3.6 Support Ticketing
- **In-App Tickets:** Staff create tickets; Makhzoon support team replies
- **Ticket Lifecycle:** OPEN → IN_PROGRESS → RESOLVED → CLOSED
- **Priority Levels:** LOW, MEDIUM, HIGH, URGENT
- **Routes:** `/[orgSlug]/support/`, `/superadmin/support/`

### 3.7 Audit Logs
- **Immutable Audit Trail:** Every create/update/delete action is logged
- **Logged Actions:** ORGANIZATION_CREATED, ASSET_CREATED, WARRANTY_UPDATED, REQUEST_APPROVED, etc.
- **Permissions:** Admins view and export org logs; superadmin views global audit logs
- **Routes:** `/[orgSlug]/audit-logs/`, `/superadmin/audit-logs/`

### 3.8 User Management & Permissions
- **Org Roles:** org_owner, admin, staff
- **Default Permissions:** Admins get full access; staff get view + limited create
- **Granular Permissions:** Per-user customization per module operation
- **Routes:** `/[orgSlug]/users/`, `/superadmin/organizations/[orgId]/configuration`

### 3.9 Organization Configuration
- **Customizable:** Asset statuses, locations, categories
- **Subscription & Packages:** Feature flags per org based on active subscription
- **Routes:** `/superadmin/organizations/[orgId]/configuration`

### 3.10 Subscriptions & Packages
- **Packages:** Bundles of features with asset/user/warranty/request limits
- **Feature System:** 11 features (dashboard, assets, inventory, warranties, requests, reports, support, audit logs, maintenance, checkouts, asset notes)
- **Subscription Status:** ACTIVE, EXPIRED, SUSPENDED
- **Routes:** `/[orgSlug]/subscription/`, `/superadmin/organizations/[orgId]/subscription`

### 3.11 Authentication & Session Management
- **Auth Methods:** Email/password, username/password, invite-based onboarding
- **Session Management:** Firebase Auth client + httpOnly session cookies (5-day expiry) + server-side cache (5-10s TTL)
- **SSO:** OIDC/PKCE implemented but disabled (not production-ready)
- **Routes:** `/login`, `/invites/[token]`, `/api/auth/session`, `/api/auth/me`

### 3.12 Superadmin Portal
- **Dashboard:** System overview, organization count, activity
- **Organization Management:** Create org, edit, view subscription, view audit logs, configuration
- **Backend Logs:** System-level logs for debugging
- **Team Management:** Manage Makhzoon platform staff
- **Transfer Mode:** Superadmins can "transfer into" an org to troubleshoot
- **Collapsible Sidebar:** Animated sidebar (240px ↔ 68px) with Framer Motion, persistent via Zustand; RTL-aware toggle
- **Mobile Support:** Sidebar hidden on mobile; mobile header bar with hamburger opens sidebar as overlay with backdrop
- **Routes:** `/superadmin/`, `/superadmin/organizations/`, `/superadmin/team/`, `/superadmin/backend-logs/`

### 3.13 Marketing Pages (Public)
All under `/(marketing)` route group. Fully responsive on all screen sizes.

- `/home` — Landing page (Business OS positioning, 5 module cards, role workflow, stats, testimonials)
- `/product` — Feature overview (pillar sections alternating text/preview, integrations grid)
- `/pricing` — Package and pricing details
- `/customers` — Customer testimonials
- `/security` — Security and compliance info
- `/about` — Company info
- `/contact` — Contact form

**Copy Tone:** Arabic-first, direct, no-nonsense. Headlines in Arabic. Body in English or bilingual. Module names in `Arabic · English` format.

### 3.14 Coming Soon Page
- **Route:** `/[locale]/` (root path per locale)
- **Shows:** Business OS pitch, early-access signup form (name + email), login link
- **Domain routing:** When accessed from `makhzoon.me` or `www.makhzoon.me`, the entire site routes to this page (all other paths redirect to `/[locale]`)
- **Future:** Will be replaced by full marketing website once `/home` and related pages are deployed to `makhzoon.me`

### 3.15 Localization
- **Languages:** Arabic (RTL), English (LTR)
- **Translation Hook:** `useT()` provides `t()`, `lang`, `dir` (rtl/ltr)
- **Locale Files:** `/locales/messages.ts` with EN + AR translation keys
- **Store:** `locale.store.ts` manages current language/locale

### 3.16 Dark Mode & Theme
- **Theme Support:** Light and dark modes
- **Store:** `theme.store.ts` manages preference
- **CSS Variables:** `--primary-*`, `--gray-*`, `--surface-*` etc. applied per theme
- **Dropdown Menus:** `components/ui/dropdown-menu.tsx` has full dark mode variants (`dark:text-gray-200`, `dark:focus:bg-gray-700/60`, etc.)

### 3.17 Network Status Indicator
- **Component:** `components/shared/NetworkStatusIndicator.tsx`
- **States:** `online` (green), `slow` (amber), `offline` (red)
- **Icons:** Custom SVG wifi icons — full bars (online), lower bars faded (slow), bars with X (offline)
- **Detection:**
  - Polls `/api/ping` every 15 seconds
  - Listens to `window` online/offline events
  - Listens to Network Information API `change` events
  - Uses `_isSlowConnection()` (checks `effectiveType === '2g' || 'slow-2g'`) on each successful ping to decide between `online` and `slow`
  - Requires 3 consecutive ping failures before showing `offline`
- **Toast notifications:** Shows on state change (error for offline, info for slow, success for back online)
- **Placement:**
  - Superadmin: `components/layout/SuperAdminBanner.tsx` (top-right of dark banner, `variant="ghost-dark"`)
  - Org portal: `components/layout/AppHeader.tsx` (right actions row, `variant="ghost-light"`)

---

## 4. Business Model

### Monetization Strategy
- **SaaS Subscription Model:** Organizations pay for subscriptions based on features and usage limits
- **Feature Tiering:** Packages define which features are available
- **Usage Limits:** Each package specifies max assets, max users, max warranties, max requests
- **Payment Methods:** Card, bank transfer, manual, other
- **Subscription Lifecycle:** Start date, end date, status (ACTIVE, EXPIRED, SUSPENDED)

### User Tiers
- **Superadmin:** Full platform access, manage all orgs, billing, team, backend
- **Makhzoon Admin/Support:** View backend logs, manage support tickets, team management
- **Org Owner:** Full access to org features, manage team, subscription, settings
- **Org Admin:** Most features except org settings and subscription management
- **Org Staff:** Limited access determined by custom permissions

### Access Control Model
- **Organization Isolation:** Strict multi-tenant isolation
- **RBAC:** Org roles (owner, admin, staff) + Makhzoon platform roles (superadmin, admin, support)
- **Custom Permissions:** Beyond role defaults, each user's access per module can be customized
- **Feature Gating:** Feature availability tied to subscription, enforced in UI and API

---

## 5. Technical Architecture

### Stack
- **Frontend:** Next.js 14 (App Router), React 18, TypeScript
- **Backend:** Next.js 14 API Routes
- **Database:** Firebase Firestore (NoSQL)
- **Auth:** Firebase Authentication (client) + Firebase Admin SDK (server)
- **State Management:** Zustand (global state), React Query (client-side data fetching)
- **Email:** Resend (invites, alerts, notifications)
- **Error Tracking:** Sentry
- **Styling:** Tailwind CSS + Radix UI components + Framer Motion (animations)
- **Validation:** Zod (runtime schema validation)
- **Localization:** Custom i18n system with `useT()` hook

### Deployment
- **Hosting:** Vercel (Next.js optimized platform)
- **Database:** Firebase (Google Cloud)
- **Domain:** `app.makhzoon.me` — main app; `makhzoon.me` / `www.makhzoon.me` — coming soon / marketing

### Routing Architecture
- **Multi-Tenant Path-Based Routing:**
  - Coming soon / marketing root: `/{locale}` — coming soon page (at `makhzoon.me`)
  - Public marketing: `/{locale}/home`, `/product`, `/pricing`, `/customers`, `/security`, `/about`, `/contact`
  - Auth: `/{locale}/login`, `/{locale}/invites/[token]`
  - Org Portal: `/{locale}/[orgSlug]/*` — e.g., `/en/acme-corp/assets`
  - Superadmin: `/{locale}/superadmin/*`
- **Proxy (`proxy.ts`):** All routing logic lives here — imported by Next.js as the middleware entry. Two responsibilities:
  1. **Domain routing** — When host is `makhzoon.me` or `www.makhzoon.me`, only the root coming soon path is served; all other paths redirect to `/{locale}`. `app.makhzoon.me` redirects locale-root to `/login`.
  2. **Session enforcement** — Enforces session cookie on protected routes; redirects to `/login` if missing. Public paths (home, product, pricing, etc.) and `/invites/*` are always accessible.
  3. **Locale detection** — If no locale prefix in path, detects from cookie → Accept-Language → default `en`, then redirects to prefixed URL.
- **API Routes:** `/api/*` — all require session verification via `verifySessionCookie()`

### Session & Auth Flow
1. User signs in (email/password or username/password)
2. Firebase returns ID token
3. Frontend exchanges ID token for httpOnly session cookie via POST `/api/auth/session`
4. Server caches decoded session for 5-10 seconds
5. Logout: DELETE `/api/auth/session` + `window.location.href` hard redirect
6. Login page auto-redirects authenticated users — uses `fetch('/api/auth/me', { cache: 'no-store' })` to bypass browser cache and prevent redirect loops

### Sidebar Architecture
Both portals use animated collapsible sidebars with Framer Motion:

**Org portal (`components/layout/AppSidebar.tsx`):**
- Widths: 240px (expanded) / 68px (collapsed)
- `hidden md:flex` — desktop only; mobile uses `BottomNav`
- State: `useUiStore().sidebarCollapsed`
- Module-aware active states (color per module)

**Superadmin portal (`app/[locale]/superadmin/layout.tsx`):**
- Widths: 240px (expanded) / 68px (collapsed)
- Desktop: animated `motion.aside` with collapse toggle button
- Mobile: hidden by default; hamburger in mobile header opens as full-width overlay with backdrop
- State: `useUiStore().superAdminSidebarCollapsed`; mobile state: local `mobileNavOpen` + `isMobile` (resize listener)
- `isMobile` check prevents `marginLeft` from being applied to main content on mobile

### Permission Caching
- **Session Cache:** 5-10 second TTL for decoded Firebase session tokens
- **Permission Cache:** 10 second TTL keyed by user UID
- **Invalidation:** `invalidateCachedSession(token)` on logout

---

## 6. Data Models

### Collections & Schemas

#### Organizations
```
organizations/{orgId}
  - id, name, subdomain (URL slug), contactEmail, description, category
  - packageDetails, createdAt, createdBy, updatedAt, updatedBy
```

#### Users (org-level)
```
users/{userId}
  - id (Firebase UID), organizationId
  - email: string | null
  - username: string | null (alternative login identity)
  - displayName, role: 'org_owner' | 'admin' | 'staff'
  - status: 'active' | 'deactivated'
  - permissions: UserPermissions | null (custom overrides)
  - createdAt, createdBy, updatedAt, updatedBy
```

#### SuperAdminUsers
```
superadminUsers/{userId}
  - id (Firebase UID), email, displayName
  - role: 'super_admin' | 'makhzoon_admin' | 'makhzoon_support'
  - createdAt, createdBy, updatedAt, updatedBy
```

#### Assets
```
assets/{assetId}
  - id, organizationId, name, category, status
  - serialNumber, purchaseDate, purchaseCost, assignedTo, location, notes
  - createdAt/By/Email/Name/Role, updatedAt/By/Email/Name/Role
```

#### Warranties
```
warranties/{warrantyId}
  - id, organizationId, assetId, assetName
  - vendor, startDate, endDate, reminder, notes
  - createdAt, createdBy, updatedAt, updatedBy
```

#### InventoryItems
```
inventory/{itemId}
  - id, organizationId, name, category, sku, unit
  - quantityOnHand, minimumThreshold, reorderQuantity
  - location, supplier, unitCost, notes
  - stockStatus: 'ok' | 'low' | 'out' (computed)
  - createdAt/By/Email/Name, updatedAt/By/Email/Name
```

#### InventoryTransactions
```
inventoryTransactions/{transactionId}
  - id, organizationId, itemId, itemName
  - type: 'in' | 'out' | 'adjustment'
  - quantity, quantityBefore, quantityAfter, reason, note
  - performedAt, performedBy/Email/Name/Role
```

#### Requests
```
requests/{requestId}
  - id, organizationId
  - type: 'REFILL' | 'RETIRE' | 'BUY_NEW' | 'EXTEND_WARRANTY'
  - assetId, assetName, warrantyId, inventoryItemId, inventoryItemName
  - description, status: 'PENDING' | 'APPROVED' | 'REJECTED'
  - decisionBy, decisionAt, createdAt/By/Name/Email, updatedAt/By
```

#### SupportTickets
```
supportTickets/{ticketId}
  - id, organizationId, subject, description
  - status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
  - priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  - createdBy, createdAt, updatedAt

ticketMessages/{messageId}
  - id, ticketId, body, authorId, authorName, authorRole, createdAt
```

#### Subscriptions
```
subscriptions/{subscriptionId}
  - id, organizationId, packageId
  - features: Record<FeatureKey, boolean>
  - startDate, endDate, status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED'
  - createdAt/By, updatedAt/By
```

#### AuditLogs
```
auditLogs/{logId}
  - id, organizationId, userId, role
  - action (ORGANIZATION_CREATED, ASSET_UPDATED, etc.)
  - module, recordId, oldValue, newValue, timestamp
```

#### OrganizationConfig
```
organizationConfigs/{orgId}
  - organizationId
  - assetStatuses: Array<{ id, label, color }>
  - locations: Array<{ id, name }>
  - categories: Array<{ id, name }>
  - createdAt/By, updatedAt/By
```

#### Other Collections
- **assetCheckouts** — Loan-out and return records
- **assetNotes** — Free-form notes on assets
- **maintenanceRecords** — Service, repair, inspection events
- **paymentLogs** — Subscription payment tracking
- **invites** — One-time invitation tokens
- **backendLogs** — System-level logs for superadmin debugging
- **inventoryAudits** + **inventoryAuditItems** — Physical count audit records

---

## 7. User Flows

### 7.1 Login Flow
1. Visit `/login` → select email or username tab
2. Enter credentials → Firebase `signInWithEmailAndPassword`
3. Exchange ID token for httpOnly session cookie via POST `/api/auth/session`
4. Redirect: superadmin roles → `/superadmin/dashboard`; org users → `/{orgSlug}/dashboard`
5. Login page checks `/api/auth/me` with `{ cache: 'no-store' }` to auto-redirect already-authenticated users without browser cache causing loops

### 7.2 Invite Acceptance Flow
1. User receives invite email with unique token: `/invites/[token]`
2. Page fetches invite info, shows inviter name, role, org
3. User sets password → POST `/api/invites/[token]/accept`
4. Backend creates account, auto-signs in, redirects to `/{orgSlug}/dashboard`

### 7.3 Asset Management CRUD
1. GET `/api/assets` → list; POST `/api/assets` → create; PATCH `/api/assets/[id]` → update; DELETE → delete
2. Every mutation logs to `auditLogs` with old/new values

### 7.4 Superadmin Transfer Mode
1. Superadmin logs in → navigates to org → clicks "Transfer"
2. POST `/api/organizations/[orgId]/transfer` → sets `transferOrgId` cookie
3. Superadmin sees org portal with Transfer Mode banner
4. DELETE to exit → clears cookie → returns to `/superadmin`

### 7.5 Warranty Alert Cron
1. External cron calls GET `/api/cron/warranty-alerts` with `Authorization: Bearer {CRON_SECRET}`
2. Queries warranties expiring within 30 days, groups by org, emails all org admins via Resend
3. Logs `WARRANTY_ALERT_SENT` audit event

---

## 8. Services Layer

Architecture: `API Route → Service Layer (auth + permissions + business logic) → Database Layer`

**Base service (`lib/services/base.service.ts`):** `requireAuth()`, `requirePermission()`, `requireActiveSubscription()`, `requireFeature()`, `getUserContext()`, `errorResponse()`, `successResponse()`

**Domain services:** `lib/services/assets.service.ts`, `lib/services/inventory.service.ts` — handle permission checks, subscription validation, DB ops, and audit logging. Pattern extends to all other domains.

---

## 9. Current State (as of May 2026)

### Implemented & Stable
- ✅ Multi-tenant organization management (path-based routing)
- ✅ Email/password + username/password + invite-based auth
- ✅ Org RBAC + custom per-user permissions
- ✅ Asset register (create, edit, retire, QR, import/export CSV)
- ✅ Inventory management (items, transactions, stock status, audits)
- ✅ Warranty tracking + cron-triggered email alerts (progressive 30/14/7 day)
- ✅ Request workflow (submit, approve/reject)
- ✅ Asset checkout/check-in, maintenance records, asset notes
- ✅ Support ticketing (thread-based)
- ✅ Immutable audit logs (searchable, CSV export)
- ✅ Dashboard + reports
- ✅ Org configuration (statuses, locations, categories)
- ✅ Subscription + package management + payment logs
- ✅ Dark mode (full dark variants in all UI components including Radix dropdowns)
- ✅ Arabic + English with RTL layout support
- ✅ Sentry error tracking
- ✅ Server-side session + permission caching
- ✅ CSV import/export for assets, inventory, audit logs
- ✅ Sidebar collapse animation (Framer Motion) — both org portal and superadmin
- ✅ Page transition animations, button press animations, skeleton loading
- ✅ Module identity system (Usool/Raseed/Haraka/Maal/Banna with colors and Arabic names)
- ✅ Network status indicator (online/slow/offline) in org portal header and superadmin banner
- ✅ Full-app responsiveness (all marketing pages, superadmin portal, login, invites, org portal)
- ✅ Domain routing middleware (`makhzoon.me` → coming soon page)
- ✅ Marketing website (home, product, pricing, customers, security, about, contact)
- ✅ Coming soon page with early-access form
- ✅ Services layer (base + assets + inventory)

### Recent Changes (May 2026 session)

**Module Identity:**
- `lib/nav/index.ts` — `NavItemConfig` extended with `moduleColor` and `moduleName`
- `components/layout/AppSidebar.tsx` — Active states use module color for pill/border/icon; Arabic name subtitle shown in EN locale
- `locales/messages.ts` — nav.assets = 'Usool' / 'أصول', nav.inventory = 'Raseed' / 'رصيد'
- `components/layout/BottomNav.tsx` — Module-aware labels

**Coming soon page (`app/[locale]/page.tsx`):**
- Business OS copy in both EN and AR
- Vertical padding (`py-16`) above logo and below login link

**Marketing website copy + components:**
- `app/[locale]/(marketing)/home/page.tsx` — MODULES array (5 modules with colors), Business OS headlines, role workflow section, stats, testimonials
- `app/[locale]/(marketing)/product/page.tsx` — Module kickers with colors, Business OS headline
- `components/marketing/Footer.tsx` — Business OS tagline and copyright
- `components/marketing/CTABand.tsx` — Responsive padding + `clamp()` headline + `flex-wrap` CTAs

**Dark mode fix:**
- `components/ui/dropdown-menu.tsx` — All `DropdownMenuItem`, `DropdownMenuLabel`, `DropdownMenuShortcut`, `DropdownMenuSubTrigger`, `DropdownMenuContent` have full `dark:` variants

**Login redirect loop fix:**
- `app/[locale]/(auth)/login/page.tsx` — `/api/auth/me` fetch uses `{ cache: 'no-store' }` to bypass browser caching

**Superadmin sidebar collapsible:**
- `store/ui.store.ts` — Added `superAdminSidebarCollapsed` state and `toggleSuperAdminSidebar`
- `app/[locale]/superadmin/layout.tsx` — `motion.aside` animates width (240px ↔ 68px), ChevronLeft/Right toggle, animated labels, user info collapses, mobile overlay drawer

**Network status indicator:**
- `components/shared/NetworkStatusIndicator.tsx` — Fixed: `_isSlowConnection()` now called in `checkConnectivity()` so slow state is actually detected
- `components/layout/AppHeader.tsx` — `NetworkStatusIndicator` added to org portal header right-actions

**Full-app responsiveness:**
- `components/marketing/Header.tsx` — Mobile hamburger menu + collapsible nav dropdown (closes on route change)
- `app/[locale]/(marketing)/home/page.tsx` — All grids responsive: modules (1→2→5 cols), roles/testimonials (1→3 cols), stats (2→4 cols), logo cloud (3→6 cols); section padding responsive
- `components/marketing/Footer.tsx` — Grid responsive (2→3→5 cols); padding responsive
- `app/[locale]/(marketing)/product/page.tsx` — Pillars single column on mobile; integrations (2→4 cols); padding responsive
- `app/[locale]/superadmin/layout.tsx` — isMobile state (resize listener); sidebar hidden on mobile; marginLeft only applied on md+; mobile header bar with hamburger opens sidebar as overlay with backdrop

**Domain routing:**
- `proxy.ts` (project root) — Already contained `MARKETING_HOSTS` logic. No new file needed; the `makhzoon.me` → coming soon redirect was already implemented here. `middleware.ts` must NOT exist alongside `proxy.ts` — the project uses only `proxy.ts` for all routing.

### Commented Out / Not Production-Ready
- ⏳ **SSO/OIDC:** Full flow implemented but disabled (`/api/auth/sso/*` returns disabled errors)
- ⏳ **Cloudflare Turnstile:** Bot verification implemented but disabled on login page and session endpoint
- ❌ **SMS Provider:** Stub exists (`lib/sms/provider.ts`) but not integrated

### Known Issues
1. No rate limiting on public endpoints (`/api/early-access`, `/api/organizations/self-serve`, `/api/invites/*`)
2. Email delivery failures not tracked separately from successful sends
3. No pagination on large asset/inventory lists (could implement cursor-based)
4. Audit logs not indexed by field (every filtered query is a collection scan)

---

## 10. Code Organization

### Directory Structure
```
/app                              — Next.js App Router routes
  /[locale]
    /(auth)/login                 — Login page (email + username tabs, forgot password modal)
    /(marketing)                  — Public marketing pages (home, product, pricing, etc.)
    /[orgSlug]                    — Org portal routes
    /superadmin                   — Superadmin portal
    /invites/[token]              — Invite acceptance
    /page.tsx                     — Coming soon page (root per locale)
  /api                            — API route handlers
    /auth                         — session, me, sso (disabled)
    /assets                       — Asset CRUD
    /inventory                    — Inventory CRUD
    /warranties, /requests, /support, /users, /organizations, /packages
    /cron                         — Cron job triggers
    /ping                         — Used by NetworkStatusIndicator health check
    /contact, /early-access       — Public form submissions

/components
  /layout                         — AppHeader, AppSidebar, BottomNav, SuperAdminBanner, MobileDrawer, TransferModeBanner
  /marketing                      — MarketingHeader, MarketingFooter, CTABand, DashboardMock, FeaturePreview
  /shared                         — NetworkStatusIndicator, ThemeToggle, LanguageToggle, CommandPalette, QueryProvider
  /ui                             — Base UI components (button, input, dialog, dropdown-menu, tooltip, badge, etc.)

/hooks                            — Custom hooks organized by domain
/lib
  /db                             — Firestore access layer (one file per collection)
  /services                       — Business logic layer (base, assets, inventory)
  /firebase                       — Client + admin SDK initialization
  /permissions                    — hasPermission, hasModuleAccess
  /nav                            — ORG_NAV_ENTRIES, ALL_NAV_ITEMS, NavItemConfig (with moduleColor, moduleName)
  /email                          — Resend email templates
  /audit                          — writeAuditLog()
  /middleware                     — withAuth, withRole helpers
  /validations                    — Zod schemas
  /utils                          — cn, date, format, tenant-url, api-fetch
  /export                         — CSV export

/store
  auth.store.ts                   — Auth user + loading state
  theme.store.ts                  — Dark/light mode
  locale.store.ts                 — Language/RTL
  transfer.store.ts               — Superadmin transfer mode
  ui.store.ts                     — sidebarCollapsed, superAdminSidebarCollapsed, mobileMenuOpen

/locales/messages.ts              — EN + AR translation keys (including module names and network status strings)
/types                            — TypeScript type definitions
proxy.ts                          — ALL routing logic: domain routing (makhzoon.me → coming soon), session enforcement, locale detection/redirect. NEVER create middleware.ts alongside this file — it causes a build conflict.
next.config.ts                    — Turbopack, env vars, CORS headers, CSP, redirects
tailwind.config.ts                — Tailwind CSS config
```

### Key Files
- **`proxy.ts`** — ALL routing: domain routing for `makhzoon.me`, session enforcement, locale detection. Do NOT create `middleware.ts` — it conflicts with `proxy.ts` and breaks the build.
- **`store/ui.store.ts`** — `sidebarCollapsed` + `superAdminSidebarCollapsed` — persistent sidebar states
- **`components/shared/NetworkStatusIndicator.tsx`** — Three-state wifi icon (online/slow/offline) used in both portals
- **`components/layout/AppHeader.tsx`** — Org portal header with NetworkStatusIndicator, ThemeToggle, LanguageToggle, user menu
- **`components/layout/AppSidebar.tsx`** — Org portal sidebar with module-aware active states, collapse animation
- **`app/[locale]/superadmin/layout.tsx`** — Superadmin layout: collapsible animated sidebar, mobile overlay drawer
- **`components/marketing/Header.tsx`** — Marketing header with mobile hamburger menu
- **`lib/nav/index.ts`** — Nav config with `moduleColor` and `moduleName` per entry
- **`locales/messages.ts`** — All EN + AR translations including module names (Usool/Raseed etc.)
- **`lib/firebase/auth-helpers.ts`** — `verifySessionCookie()` for API routes
- **`lib/audit/logger.ts`** — `writeAuditLog()` called by all mutation endpoints
- **`lib/services/base.service.ts`** — Shared service utilities (requireAuth, requirePermission, etc.)

---

## 11. Environment Variables

### Public Variables (NEXT_PUBLIC_*)
- `NEXT_PUBLIC_FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID`
- `NEXT_PUBLIC_APP_URL` — Domain for email links (`https://app.makhzoon.me`)
- `NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY` — Disabled
- `NEXT_PUBLIC_SENTRY_DSN`

### Server-Only Variables
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (or `FIREBASE_SERVICE_ACCOUNT_BASE64`)
- `CRON_SECRET` — Authorization for `/api/cron/*`
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`
- `CLOUDFLARE_TURNSTILE_SECRET_KEY` — Disabled
- `NODE_ENV`

---

## 12. Security

### Implemented
- ✅ httpOnly session cookies
- ✅ Session verification on every API route
- ✅ Firebase Admin SDK for trusted server operations
- ✅ Role + permission checks on all mutation endpoints
- ✅ Immutable audit logs
- ✅ Multi-tenant isolation by organizationId
- ✅ Sentry error tracking (no PII in logs)
- ✅ CRON_SECRET via Authorization header only (not query param)
- ✅ CSP headers configured in next.config.ts

### Gaps
- ⚠️ No rate limiting on public endpoints
- ⚠️ Email delivery failures not tracked
- ⚠️ SSO code disabled but present (security review needed before enabling)
- ⚠️ Turnstile disabled (bot verification gap)
- ⚠️ No password complexity enforcement
- ⚠️ 5-10 second session cache window where stale tokens remain valid (acceptable trade-off)

---

## 13. Performance

### Optimizations
- ✅ Server-side session + permission caching (5-10 second TTL)
- ✅ React Query with staleTime + cacheTime
- ✅ Firestore indexing by organizationId
- ✅ Bulk Firestore get for asset name lookups in warranty alerts
- ✅ CSV chunking for exports

### Bottlenecks
- ⚠️ No pagination on large lists (cursor-based pagination not implemented)
- ⚠️ Audit logs not indexed (collection scans on filter queries)
- ⚠️ Session verification hits Firestore on cache miss

---

## 14. Animations & Motion

- **Library:** Framer Motion
- **Easing Tokens:** CSS custom properties (ease-out-expo, ease-spring, ease-in-sharp, ease-in-out-smooth)
- **Duration Tokens:** CSS custom properties (120ms, 180ms, 250ms, 350ms, 450ms)
- **Page Transitions:** Fade + translate on route changes
- **Sidebar Animation:** `motion.aside` animates width (240 ↔ 68px) with `EASE_SLIDE = [0.4, 0, 0.2, 1]`; `motion.span` animates label width/opacity; both org and superadmin portals use the same pattern
- **Button Interactions:** Hover lifts, active scales
- **Skeleton Loading:** Gradient shimmer
- **Preference:** `prefers-reduced-motion` reduces all animations to near-zero

---

## 15. Responsiveness

All pages are fully responsive across mobile, tablet, and desktop.

### Marketing
- **Header:** Mobile hamburger button; nav collapses to drawer; closes on route change
- **Home:** All grids fluid — modules (1→2→5 cols), roles/testimonials (1→3 cols), stats (2→4 cols), logos (3→6 cols); section padding uses Tailwind responsive prefixes
- **Product:** Pillar sections stack vertically on mobile; integrations grid (2→4 cols)
- **Footer:** 2→3→5 column grid; padding responsive
- **CTABand:** `clamp()` headline, `flex-wrap` CTAs, responsive padding

### App Portal
- **Sidebar:** `hidden md:flex` — desktop only. Mobile uses `BottomNav` at the bottom of the screen.
- **Header:** Burger button on mobile opens `MobileDrawer`; search moves to CommandPalette

### Superadmin Portal
- **Sidebar:** `hidden md:flex` on desktop; on mobile shows as full-width overlay drawer triggered by hamburger in mobile header bar
- **Main content:** `marginLeft/Right` only applied when `!isMobile` (checked via resize listener)

### Auth / Invites
- **Login:** Right marketing panel `hidden lg:flex`; form column fills full width on mobile
- **Invites:** `max-w-md w-full px-4` — inherently responsive

---

## 16. Not Found in Codebase

- Database migrations/seeds (Firebase/Firestore; no SQL)
- Test suite (no Jest/Vitest)
- GraphQL API (REST only)
- CI/CD config (Vercel auto-deploys)
- Stripe/payment processing (payment logs tracked but no processor)
- Redis caching (in-memory session cache only)
- File upload (no persistent file storage beyond Firestore)
- Pagination (no cursor-based pagination yet)
- OpenAPI/Swagger docs
