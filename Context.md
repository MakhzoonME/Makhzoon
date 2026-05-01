# Makhzoon Project Context

## 1. Project Overview

**Makhzoon** is a multi-tenant, SaaS-based asset and inventory management platform designed for organizations to track, manage, and maintain their physical assets, inventory, and warranties across distributed locations.

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

## 2. Core Features

### 2.1 Asset Management
- **Asset Register:** Create, edit, retire, and import assets (CSV)
- **Asset Fields:** Name, category, status, serial number, purchase date/cost, assigned person, location, notes
- **Asset Statuses:** Active, Retired (configurable via org config)
- **Asset Actions:**
  - QR code generation and download
  - Checkout/check-in (loan-out and return tracking)
  - Maintenance records (service, repair, inspection events)
  - Asset notes (free-form annotations)
- **Asset Import:** Bulk import via CSV file with validation
- **Asset Export:** Export all assets to CSV with audit metadata
- **Routes:** `/[orgSlug]/assets/`, `/[orgSlug]/assets/[assetId]/`, `/[orgSlug]/assets/new`, `/[orgSlug]/assets/import`

### 2.2 Inventory Management
- **Inventory Items:** Track stocked items with quantity, reorder thresholds, unit cost
- **Stock Status:** Automatic calculation of stock health (ok, low, out)
- **Units:** Each, box, pack, pair, roll, liter, kg, meter, sheet, set
- **Transactions:** Record in/out/adjustment movements with reason and performer tracking
- **Inventory Audits:**
  - Physical count audits (draft → in_progress → completed)
  - Per-item status tracking (pending, found, missing)
  - Audit history and completion tracking
- **Routes:** `/[orgSlug]/inventory/`, `/[orgSlug]/inventory/[itemId]/`, `/[orgSlug]/inventory/audits/`

### 2.3 Warranty Management
- **Warranty Tracking:** Track vendor warranties per asset with start/end dates
- **Alerts:** Optional reminder flag; cron job alerts admins on warranties expiring within 30 days
- **Actions:** Create, edit, delete warranties; filter by vendor, asset, or expiry date
- **Cron Endpoint:** `/api/cron/warranty-alerts` (triggered externally, secured by `CRON_SECRET`)
- **Routes:** `/[orgSlug]/warranties/`, `/[orgSlug]/warranties/[warrantyId]/edit`

### 2.4 Requests Workflow
- **Request Types:** REFILL, RETIRE, BUY_NEW, EXTEND_WARRANTY
- **Status Flow:** PENDING → APPROVED or REJECTED
- **Workflow:**
  - Staff submit requests for new assets, retire items, refill inventory, or extend warranties
  - Admins review and approve/reject with decision tracking
  - Audit log captures all request activity
- **Routes:** `/[orgSlug]/requests/`

### 2.5 Reports & Analytics
- **Dashboard Metrics:** Quick stats on assets, inventory, warranties, requests
- **Reports Module:** Utilization, depreciation, and cost analytics (structure defined, full implementation varies by subscription)
- **Routes:** `/[orgSlug]/dashboard/`, `/[orgSlug]/reports/`

### 2.6 Support Ticketing
- **In-App Tickets:** Staff create tickets; Makhzoon support team replies
- **Ticket Lifecycle:** OPEN → IN_PROGRESS → RESOLVED → CLOSED
- **Priority Levels:** LOW, MEDIUM, HIGH, URGENT
- **Messages:** Thread-based messages with author tracking (name, role)
- **Routes:** `/[orgSlug]/support/`, `/superadmin/support/`

### 2.7 Audit Logs
- **Immutable Audit Trail:** Every create/update/delete action is logged
- **Logged Actions:** ORGANIZATION_CREATED, ASSET_CREATED, WARRANTY_UPDATED, REQUEST_APPROVED, etc.
- **Audit Fields:** Action, module, timestamp, user, old/new values, record ID
- **Permissions:** Admins can view and export org logs; superadmin views global audit logs
- **Export:** CSV export of audit logs with full metadata
- **Routes:** `/[orgSlug]/audit-logs/`, `/superadmin/audit-logs/`

### 2.8 User Management & Permissions
- **Org Roles:** org_owner, admin, staff
- **Default Permissions:** Admins get full access; staff get view + limited create (can create requests, asset notes, support tickets)
- **Granular Permissions:** Each user's access can be customized per operation (view, create, update, delete, etc.) across assets, inventory, warranties, requests, reports, support, audit logs
- **Unified Permission Editor:** Superadmin can edit all org roles' permissions; org admins edit their org's staff permissions
- **Routes:** `/[orgSlug]/users/`, `/superadmin/organizations/[orgId]/configuration`

### 2.9 Organization Configuration
- **Asset Statuses:** Customizable statuses (default: Active, Inactive)
- **Locations:** Custom location list for asset assignment
- **Categories:** Custom categories for assets and inventory items
- **Subscription & Packages:** Feature flags per org based on active subscription
- **Routes:** `/superadmin/organizations/[orgId]/configuration`

### 2.10 Subscriptions & Packages
- **Packages:** Bundles of features with asset/user/warranty/request limits
- **Feature System:** Dashboard, assets, inventory, warranties, requests, reports, support, audit logs, maintenance, checkouts, asset notes (11 features)
- **Subscription Status:** ACTIVE, EXPIRED, SUSPENDED
- **Billing:** Payment logs track method (CARD, BANK_TRANSFER, MANUAL, OTHER), amount, currency, date
- **Routes:** `/[orgSlug]/subscription/`, `/superadmin/organizations/[orgId]/subscription`

### 2.11 Authentication & Session Management
- **Auth Methods:**
  - Email/password (production-ready)
  - Username/password (for non-email users; alternative identity)
  - Invite-based user onboarding (accept invite → set password → auto-login)
  - SSO via OIDC/PKCE (currently disabled/commented out, not production-ready)
- **Session Management:**
  - Firebase Auth on client
  - httpOnly session cookies on server (5-day expiry)
  - Server-side session cache with 5-10 second TTL for performance
  - Turnstile bot verification (currently disabled, commented out)
- **Routes:** `/login`, `/signup`, `/api/auth/session`, `/api/auth/me`, `/invites/[token]`

### 2.12 Superadmin Portal
- **Dashboard:** System overview, organization count, activity
- **Organization Management:** Create org, edit, view subscription, view audit logs, configuration
- **Backend Logs:** System-level logs for debugging
- **Team Management:** Manage Makhzoon platform staff (superadmin, support, admin roles)
- **Transfer Mode:** Superadmins can "transfer into" an org to troubleshoot as that org
- **Routes:** `/superadmin/`, `/superadmin/organizations/`, `/superadmin/team/`, `/superadmin/backend-logs/`

### 2.13 Marketing Pages
- **Public Routes:**
  - `/home` — Landing page
  - `/product` — Product overview
  - `/pricing` — Package and pricing details
  - `/customers` — Customer testimonials
  - `/security` — Security and compliance info
  - `/about` — Company info
  - `/contact` — Contact form

### 2.14 Localization
- **Languages:** Arabic and English (RTL for Arabic)
- **Translation Hook:** `useT()` provides `t()`, `lang`, `dir` (rtl/ltr)
- **Locale Files:** `/locales` directory with translation keys
- **Store:** `locale.store.ts` manages current language/locale

### 2.15 Dark Mode & Theme
- **Theme Support:** Light and dark modes
- **Store:** `theme.store.ts` manages theme preference
- **CSS Variables:** `--primary-*`, `--gray-*`, `--surface-*` etc. applied per theme

---

## 3. Business Model

### Monetization Strategy
- **SaaS Subscription Model:** Organizations pay for subscriptions based on features and usage limits
- **Feature Tiering:** Packages define which features are available (dashboard, assets, inventory, warranties, requests, reports, support, audit logs, maintenance, checkouts, notes)
- **Usage Limits:** Each package specifies max assets, max users, max warranties, max requests
- **Payment Methods:** Card, bank transfer, manual, other (tracked in payment logs)
- **Subscription Lifecycle:** Start date, end date, status (ACTIVE, EXPIRED, SUSPENDED)

### User Tiers
- **Superadmin:** Full platform access, manage all orgs, billing, team, backend
- **Makhzoon Admin/Support:** View backend logs, manage support tickets, team management
- **Org Owner:** Full access to org features, manage team, subscription, settings
- **Org Admin:** Most features except org settings and subscription management
- **Org Staff:** Limited access: view assets/inventory, create requests/notes/tickets (determined by custom permissions)

### Access Control Model
- **Organization Isolation:** Strict multi-tenant isolation; users see only their org's data
- **Role-Based Access Control (RBAC):** Org roles (owner, admin, staff) + Makhzoon platform roles (superadmin, admin, support)
- **Custom Permissions:** Beyond role defaults, each user's access per module can be customized independently
- **Feature Gating:** Feature availability tied to subscription, enforced in UI and API

---

## 4. Technical Architecture

### Stack
- **Frontend:** Next.js 14 (App Router), React 18, TypeScript
- **Backend:** Next.js 14 API Routes (server-side)
- **Database:** Firebase Firestore (NoSQL)
- **Auth:** Firebase Authentication (client) + Firebase Admin SDK (server)
- **State Management:** Zustand (global state), React Query (client-side data fetching and caching)
- **Email:** Resend (email service for invites, alerts, notifications)
- **Error Tracking:** Sentry (error monitoring and logging)
- **Styling:** Tailwind CSS + Radix UI components + Framer Motion (animations)
- **Validation:** Zod (runtime schema validation)
- **Cron Jobs:** External trigger via `/api/cron/*` endpoints (secured by `CRON_SECRET`)
- **QR Codes:** qrcode library for asset QR generation
- **CSV Export/Import:** papaparse for CSV handling
- **Localization:** Custom i18n system with `useT()` hook
- **Theme Management:** Zustand for light/dark mode
- **Animations:** Framer Motion for component animations, page transitions, sidebar collapse

### Deployment
- **Hosting:** Vercel (Next.js optimized platform)
- **Database:** Firebase (Google Cloud)
- **Environment Variables:** .env files with NEXT_PUBLIC_* and server-only vars

### Routing Architecture
- **Multi-Tenant Path-Based Routing:**
  - Public: `/`, `/home`, `/product`, `/pricing`, `/customers`, `/security`, `/about`, `/contact`, `/login`
  - Auth: `/signup`, `/invites/[token]`
  - Org Portal: `/[orgSlug]/*` — e.g., `/acme-corp/assets`, `/acme-corp/dashboard`
  - Superadmin: `/superadmin/*` — e.g., `/superadmin/organizations`, `/superadmin/team`
- **Middleware:** Enforces session existence for protected routes; redirects to /login if missing
- **API Routes:** `/api/*` — all require per-route session verification via `verifySessionCookie()`

### Session & Auth Flow
1. **Login:** User signs in with email + password or username + password
2. **ID Token:** Firebase returns an ID token with custom claims (role, organizationId)
3. **Session Cookie:** Frontend exchanges ID token for httpOnly session cookie via POST `/api/auth/session`
4. **Caching:** Server caches decoded session for 5-10 seconds for performance
5. **Logout:** DELETE `/api/auth/session` clears cookie and session cache; client hard-reloads to `/login` with `window.location.href`
6. **Middleware:** Session cookie checked on protected routes; lack of cookie redirects to /login

### Permission Caching
- **Session Cache:** Stores decoded session tokens (5-10 second TTL) to avoid redundant Firebase calls
- **Permission Cache:** Stores user permissions (10 second TTL) keyed by user UID
- **Invalidation:** Explicit `invalidateCachedSession(token)` call on logout; implicit expiry after TTL

### Data Flow
1. **Client State:** Zustand (`auth.store`) + React Query (data fetching)
2. **API Layer:** React hooks (useQuery, useMutation) in components fetch data from `/api/*` endpoints
3. **Server Handlers:** Each API route verifies session, permission, then queries Firestore
4. **Database:** Firestore collections indexed by organizationId for multi-tenant isolation
5. **Audit Logging:** Every write operation triggers `writeAuditLog()` to immutable audit collection

---

## 5. Data Models

### Collections & Schemas

#### Organizations
```
organizations/{orgId}
  - id: string (Firestore doc ID)
  - name: string
  - subdomain: string (unique, used for URL routing)
  - contactEmail: string
  - description: string | null
  - category: OrgCategory | null (Technology, Healthcare, Finance, Retail, Manufacturing, Education, Government, Non-Profit, Other)
  - packageDetails: string | null
  - createdAt: Date
  - createdBy: string (user UID)
  - updatedAt: Date
  - updatedBy: string
```

#### Users (org-level)
```
users/{userId}
  - id: string (Firebase UID)
  - organizationId: string
  - email: string | null
  - username: string | null (alternative to email for login)
  - displayName: string
  - role: 'org_owner' | 'admin' | 'staff'
  - status: 'active' | 'deactivated'
  - permissions: UserPermissions | null (custom per-user overrides)
  - createdAt: Date
  - createdBy: string
  - updatedAt: Date
  - updatedBy: string
```

#### SuperAdminUsers
```
superadminUsers/{userId}
  - id: string (Firebase UID)
  - email: string
  - displayName: string
  - role: 'super_admin' | 'makhzoon_admin' | 'makhzoon_support'
  - createdAt: Date
  - createdBy: string
  - updatedAt: Date
  - updatedBy: string
```

#### Assets
```
assets/{assetId}
  - id: string
  - organizationId: string
  - name: string
  - category: string (custom per org)
  - status: 'Active' | 'Retired' (from org config)
  - serialNumber: string | null
  - purchaseDate: Date | null
  - purchaseCost: number | null
  - assignedTo: string | null (user name or ID)
  - location: string | null (custom location from org config)
  - notes: string | null
  - createdAt: Date
  - createdBy: string
  - createdByEmail: string | null
  - createdByName: string | null
  - createdByRole: string | null
  - updatedAt: Date
  - updatedBy: string
  - updatedByEmail: string | null
  - updatedByName: string | null
  - updatedByRole: string | null
```

#### Warranties
```
warranties/{warrantyId}
  - id: string
  - organizationId: string
  - assetId: string
  - assetName: string | null
  - vendor: string
  - startDate: Date
  - endDate: Date
  - reminder: boolean (alert eligibility)
  - notes: string | null
  - createdAt: Date
  - createdBy: string
  - updatedAt: Date
  - updatedBy: string
```

#### InventoryItems
```
inventory/{itemId}
  - id: string
  - organizationId: string
  - name: string
  - category: string
  - sku: string | null
  - unit: InventoryUnit (each, box, pack, pair, roll, liter, kg, meter, sheet, set)
  - quantityOnHand: number
  - minimumThreshold: number
  - reorderQuantity: number | null
  - location: string | null
  - supplier: string | null
  - unitCost: number | null
  - notes: string | null
  - stockStatus: 'ok' | 'low' | 'out' (computed)
  - createdAt: Date
  - createdBy: string
  - createdByEmail: string | null
  - createdByName: string | null
  - updatedAt: Date
  - updatedBy: string
  - updatedByEmail: string | null
  - updatedByName: string | null
```

#### InventoryTransactions
```
inventoryTransactions/{transactionId}
  - id: string
  - organizationId: string
  - itemId: string
  - itemName: string
  - type: 'in' | 'out' | 'adjustment'
  - quantity: number
  - quantityBefore: number
  - quantityAfter: number
  - reason: string
  - note: string | null
  - performedAt: Date
  - performedBy: string (user UID)
  - performedByEmail: string | null
  - performedByName: string | null
  - performedByRole: string | null
```

#### Requests
```
requests/{requestId}
  - id: string
  - organizationId: string
  - type: 'REFILL' | 'RETIRE' | 'BUY_NEW' | 'EXTEND_WARRANTY'
  - assetId: string | null
  - assetName: string | null
  - warrantyId: string | null
  - inventoryItemId: string | null
  - inventoryItemName: string | null
  - description: string
  - status: 'PENDING' | 'APPROVED' | 'REJECTED'
  - decisionBy: string | null (user UID)
  - decisionAt: Date | null
  - createdAt: Date
  - createdBy: string
  - createdByName: string | null
  - createdByEmail: string | null
  - updatedAt: Date
  - updatedBy: string
```

#### SupportTickets
```
supportTickets/{ticketId}
  - id: string
  - organizationId: string
  - subject: string
  - description: string
  - status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
  - priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  - createdBy: string (user UID)
  - createdAt: Date
  - updatedAt: Date

ticketMessages/{messageId}
  - id: string
  - ticketId: string
  - body: string
  - authorId: string (user UID)
  - authorName: string
  - authorRole: string
  - createdAt: Date
```

#### Subscriptions
```
subscriptions/{subscriptionId}
  - id: string
  - organizationId: string
  - packageId: string | null
  - features: Record<FeatureKey, boolean>
  - notes: string | null
  - packageDetails: Record<string, unknown>
  - startDate: Date
  - endDate: Date
  - status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED'
  - createdAt: Date
  - createdBy: string
  - updatedAt: Date
  - updatedBy: string
```

#### Packages
```
packages/{packageId}
  - id: string
  - name: string
  - description: string
  - isActive: boolean
  - limits: { maxAssets: number, maxUsers: number, maxWarranties: number, maxRequests: number }
  - features: Record<FeatureKey, boolean>
  - createdAt: Date
  - createdBy: string
  - updatedAt: Date
  - updatedBy: string
```

#### AuditLogs
```
auditLogs/{logId}
  - id: string
  - organizationId: string
  - userId: string (user UID or 'system')
  - role: UserRole
  - action: string (ORGANIZATION_CREATED, ASSET_UPDATED, WARRANTY_DELETED, etc.)
  - module: string (organizations, assets, warranties, requests, etc.)
  - recordId: string | null
  - oldValue: Record<string, unknown> | null
  - newValue: Record<string, unknown> | null
  - timestamp: Date
```

#### InventoryAudits
```
inventoryAudits/{auditId}
  - id: string
  - organizationId: string
  - title: string
  - status: 'draft' | 'in_progress' | 'completed'
  - notes: string | null
  - totalAssets: number
  - foundCount: number
  - missingCount: number
  - pendingCount: number
  - startedBy: string (user UID)
  - startedByName: string | null
  - completedAt: Date | null
  - createdAt: Date
  - updatedAt: Date

inventoryAuditItems/{itemId}
  - id: string
  - auditId: string
  - organizationId: string
  - assetId: string
  - assetName: string
  - assetCategory: string
  - assetSerial: string | null
  - assetLocation: string | null
  - assetAssignedTo: string | null
  - status: 'pending' | 'found' | 'missing'
  - note: string | null
  - checkedAt: Date | null
  - checkedBy: string | null (user UID)
  - checkedByName: string | null
```

#### OrganizationConfig
```
organizationConfigs/{orgId}
  - organizationId: string
  - assetStatuses: Array<{ id: string, label: string, color: string }>
  - locations: Array<{ id: string, name: string }>
  - categories: Array<{ id: string, name: string }>
  - createdAt: Date
  - createdBy: string
  - updatedAt: Date
  - updatedBy: string
```

#### Other Collections
- **assetCheckouts/{checkoutId}** — Loan-out and return records for shared assets
- **assetNotes/{noteId}** — Free-form notes attached to assets
- **maintenanceRecords/{recordId}** — Service, repair, inspection events on assets
- **paymentLogs/{logId}** — Subscription payment tracking (amount, method, date)
- **invites/{tokenId}** — One-time invitation tokens for user onboarding
- **backendLogs/{logId}** — System-level logs for superadmin debugging

---

## 6. User Flows

### 6.1 Signup Flow (Self-Service)
1. New user visits `/signup`
2. Enters email, password, display name, organization name, subdomain
3. Frontend validates with `signupSchema` (Zod)
4. Backend (POST `/api/organizations/self-serve`):
   - Creates organization record
   - Creates subscription with default features
   - Creates org_owner user record
   - Sets Firebase custom claims (role, organizationId)
   - Sends welcome email
5. User auto-redirected to `/{subdomain}/dashboard` after account confirmation

### 6.2 Login Flow
1. User visits `/login`
2. Selects auth method: email/password or username/password
3. Enters credentials
4. Frontend calls `signInWithEmailAndPassword(auth, ...)`
5. Firebase returns ID token
6. Frontend calls POST `/api/auth/session` with ID token
7. Backend verifies token, checks role/org custom claims, creates httpOnly session cookie
8. Frontend's `useAuth` hook listens for Firebase auth state change, fetches `/api/auth/me` for features + permissions
9. User redirected to their portal: `/[orgSlug]/dashboard` (org user) or `/superadmin` (platform role)

### 6.3 Invite Acceptance Flow
1. User receives invite email with unique token link: `/invites/[token]`
2. User clicks link, lands on invite acceptance page
3. Page fetches invite details from GET `/api/invites/[token]`
4. Shows invite info: inviter name, role, org name
5. User sets password and clicks "Accept invitation"
6. Frontend calls POST `/api/invites/[token]/accept` with password
7. Backend creates account (email or username), sets password, accepts the invite
8. Frontend logs in with email/username + password (auto-completes flow)
9. User redirected to `/{orgSlug}/dashboard`

### 6.4 Asset Management Flow (Example CRUD)
1. **View Assets:** User navigates to `/[orgSlug]/assets` → frontend fetches GET `/api/assets` → lists all assets for org
2. **Create Asset:** Click "Add asset" → form on `/[orgSlug]/assets/new` → POST `/api/assets` with asset data → redirect to asset detail
3. **Edit Asset:** Click asset → view `/[orgSlug]/assets/[assetId]` → click "Edit" → `/[orgSlug]/assets/[assetId]/edit` → PATCH `/api/assets/[assetId]` → view updated asset
4. **Delete Asset:** On asset detail, click "Delete" → DELETE `/api/assets/[assetId]` → redirect to assets list
5. **QR Code:** GET `/api/assets/[assetId]/qr` returns image URL → user downloads/prints
6. **Audit:** Every action logged to auditLogs collection with old/new values

### 6.5 Request Workflow
1. **Staff submits request:** Navigate to `/[orgSlug]/requests` → click "New request" → choose type (BUY_NEW, RETIRE, REFILL, EXTEND_WARRANTY) → enter details → POST `/api/requests` → request created in PENDING state
2. **Admin reviews:** Admin visits `/[orgSlug]/requests` → sees PENDING requests → clicks request → reads description → approves or rejects
3. **Approve:** Click "Approve" → POST `/api/requests/[requestId]/approve` → status → APPROVED, decision logged
4. **Reject:** Click "Reject" → POST `/api/requests/[requestId]/reject` → status → REJECTED, decision logged
5. **Audit:** Request lifecycle fully audited with timestamps and decision info

### 6.6 Warranty Alert Flow (Cron-Triggered)
1. **External cron job** calls GET `/api/cron/warranty-alerts` with Authorization header
2. **Server logic:**
   - Queries all warranties with endDate between (now - 7 days) and (now + 30 days)
   - Groups by org
   - For each org, fetches all admin emails
   - Fetches asset names from bulk Firestore get
   - Renders HTML + text email with warranty items sorted by days left
   - Sends via Resend email service
   - Logs audit event `WARRANTY_ALERT_SENT` with item count, recipient count, sent count
3. **Email:** Admins receive email with warranty list, expiry dates, links to assets in dashboard

### 6.7 Superadmin Transfer Mode Flow
1. **Superadmin** logs in, lands on `/superadmin/dashboard`
2. **Transfer into org:** Clicks "Transfer mode" or navigates to org detail → clicks "Transfer"
3. **Backend:** POST `/api/organizations/[orgId]/transfer` → sets `transferOrgId` cookie for this superadmin
4. **Frontend:** Middleware + layout detects transfer mode, shows "Transfer Mode" banner at top
5. **Superadmin now sees:**
   - Org's portal: `/[orgSlug]/dashboard`, `/[orgSlug]/assets`, etc.
   - Can view/edit org's data as if they are an org admin
   - Full audit trail and admin capabilities
6. **Exit transfer:** Click "Exit transfer mode" → DELETE `/api/organizations/[orgId]/transfer` → clears cookie → redirects to `/superadmin`

### 6.8 Permission Customization Flow
1. **Org admin** navigates to `/[orgSlug]/users`
2. **Click user** → view user detail
3. **Click "Customize permissions"** → modal/form showing MODULE_PERMISSIONS_CONFIG
4. **Toggle operations** per module (view, create, update, delete, etc.)
5. **Save:** PATCH `/api/users/[userId]` with new permissions object
6. **Permission cache invalidated** → next API call fetches fresh permissions
7. **Staff member** sees UI/API-blocked operations per their new custom permissions

---

## 7. Current State

### Implemented Features
- ✅ Multi-tenant organization management with path-based routing
- ✅ User authentication (email/password, username/password, invite-based)
- ✅ Org-level RBAC (org_owner, admin, staff) + superadmin roles
- ✅ Custom per-user permissions with granular module controls
- ✅ Asset register (create, edit, retire, import, QR codes)
- ✅ Inventory management (items, transactions, stock status)
- ✅ Inventory audits (physical counts with per-item status)
- ✅ Warranty tracking and alerts (cron-triggered email alerts)
- ✅ Request workflow (create, approve/reject, audit)
- ✅ Asset checkout/check-in tracking
- ✅ Maintenance records and asset notes
- ✅ Support ticketing with thread-based messages
- ✅ Audit logs (immutable, searchable, exportable to CSV)
- ✅ Reports/Dashboard (metrics, analytics framework)
- ✅ Organization configuration (custom statuses, locations, categories)
- ✅ Subscription & package management with feature flags
- ✅ Payment log tracking (billing history)
- ✅ Dark mode and light mode support
- ✅ Arabic and English localization with RTL support
- ✅ Sentry error tracking and monitoring
- ✅ Role-based API route protection via `verifySessionCookie()`
- ✅ Server-side session caching for performance
- ✅ CSV export for assets, inventory, audit logs, warranties
- ✅ CSV import for assets and inventory
- ✅ Email service via Resend (invites, alerts, support notifications)
- ✅ Sidebar collapse animation with tooltip labels
- ✅ Page transition animations (fade + translate)
- ✅ Button press animations (scale + easing)
- ✅ Loading skeleton animations (gradient shimmer)
- ✅ Motion/UX polish with easing tokens and duration utilities
- ✅ Barrel exports (components/ui, components/shared, hooks) for cleaner import paths
- ✅ Organized lib/utils with permissions and nav config split into separate modules
- ✅ Comprehensive .env.example documenting all environment variables

### Commented Out / Not Production-Ready
- ⏳ **SSO/OIDC:** Full OIDC/PKCE flow implemented but disabled with TODO comments
  - `/app/api/auth/sso/check/route.ts` — returns `ssoEnabled: false`
  - `/app/api/auth/sso/initiate/route.ts` — returns 503 error
  - `/app/api/auth/sso/callback/route.ts` — redirects to error
  - `lib/oidc/discovery.ts`, `lib/oidc/tokens.ts`, `lib/oidc/pkce.ts` — dead code, not called
  - `lib/firestore/sso-config.ts` — not called
  - `types/sso.types.ts` — type definitions only

- ⏳ **Cloudflare Turnstile:** Bot verification implemented but disabled
  - Login page: Turnstile widget import and component render commented out
  - `/api/auth/session/route.ts` — Turnstile verification block commented out

- ❌ **SMS Provider:** Stub exists (`lib/sms/provider.ts`) but not integrated; used only in types

### Known Issues & TODOs
1. **SSO Not Production-Ready:** Disabled until full OIDC/PKCE integration and key management are finalized
2. **Turnstile Bot Verification:** Disabled until bot attack assessment and user experience testing complete
3. **Email Delivery Monitoring:** Email send failures logged but not tracked separately from successful sends
4. **Support Ticket Assignment:** Tickets created by org users but routing to Makhzoon support is manual
5. **Report Exports:** Report data structure defined but full report computation logic varies
6. **Frontend Error Boundaries:** Error pages added for `/[orgSlug]/error.tsx` and `/superadmin/error.tsx`, but not all sub-routes have dedicated error.tsx files

### Recent Fixes (Tracks 1-4 - Comprehensive Audit)

**Track 1 (Functional Audit):**
- Commented out SSO (disabled /api/auth/sso/* endpoints)
- Commented out Turnstile bot verification
- Fixed middleware to check session cookie existence
- Added CRON_SECRET guard to /api/cron/warranty-alerts
- Deleted 14 duplicate route folders ("subscription 2", "support 2", etc.)
- Fixed usage bar max={-1} placeholder
- Cleaned up signup flow logic

**Track 2 (UI Audit):**
- Replaced 5 inline SVG functions with lucide-react icons in assets page
- Fixed i18n interpolation in subscription page (removed duplicate text)
- Moved FEATURE_LABELS to locales/messages.ts with translations
- Removed image optimization bypass on profile avatar
- Added error boundaries: app/error.tsx (root) and app/(marketing)/error.tsx

**Track 3 (Performance):**
- Fixed N+1 query in inventory.updateInventoryItem using Firestore transaction

**Track 4 (Architecture) — 5/8 items complete:**
- ✅ T4-8: Created .env.example documenting all 19 environment variables
- ✅ T4-7: Added barrel exports (components/ui, components/shared, hooks)
- ✅ T4-6: Split lib/utils → lib/permissions/, lib/nav/ (11 files updated)
- ✅ T4-5: Moved domain-specific components → components/features/ (4 files)
- ✅ T4-4: Reorganized hooks by domain (27 hooks into 9 subfolders, 150+ imports updated)
- ✅ T4-2: Renamed lib/firestore/ → lib/db/ (84 imports updated)
- ⏳ T4-3: Create lib/services/ layer (deferred — requires refactoring 67 API routes)
- ⏳ T4-1: Already done in earlier audit (deleted 14 duplicate route folders)

**Earlier Fixes (Tasks A, B, C):**
- Fixed logout handlers to use hard redirect (`window.location.href`)
- Invalidated server-side session cache on logout
- Fixed wrong redirects for non-superadmin users
- Added loading/disabled states to logout buttons
- Added orgSlug fetching and storage for correct redirects
- Added session-expired notification to login page
- Fixed signup page redirects to org portal
- Fixed invite acceptance error handling
- Removed query param fallback for cron secret
- Changed non-superadmin routes to use `router.replace()`

### API Rate Limiting
- **Not implemented** on public endpoints:
  - `/api/early-access` — open to spam
  - `/api/organizations/self-serve` — open to org enumeration
  - `/api/invites/[token]` — open to invite token enumeration
  - `/api/organizations/by-subdomain/[subdomain]` — open to subdomain enumeration

### Deployment & Monitoring
- **Vercel:** Hosting (auto-deploys from main branch)
- **Sentry:** Error tracking with org/user context
- **Firebase:** Database, auth, session management
- **Email:** Resend service (no rate limiting or bounce handling configured)

---

## 8. Code Organization

### Directory Structure
```
/app                       — Next.js App Router routes
  /(auth)                  — Login, signup (public)
  /(marketing)             — Public marketing pages
  /[orgSlug]               — Org portal routes
  /superadmin              — Superadmin routes
  /invites                 — Invite acceptance
  /api                     — API route handlers
    /auth                  — Auth endpoints
    /assets                — Asset CRUD
    /inventory             — Inventory CRUD
    /warranties            — Warranty CRUD
    /organizations         — Org management
    /users                 — User management
    /requests              — Request workflow
    /support               — Support ticketing
    /cron                  — Cron job triggers (warranty alerts, etc.)

/components                — Reusable React components
  /ui                      — Base components (button, input, dialog, etc.) [barrel export: index.ts]
  /layout                  — App layout (header, sidebar, nav, drawer)
  /shared                  — Shared components (QueryProvider, etc.) [barrel export: index.ts]

/hooks                     — Custom React hooks [barrel export: index.ts]
  useAuth.ts               — Auth state
  useT.ts                  — i18n/localization
  useAssets.ts, useInventory.ts, etc. — Data fetching hooks by domain

/lib                       — Utility functions and services
  /db                      — Database access layer (22 files, one per collection/entity)
  /firebase                — Firebase client/admin initialization
  /permissions             — Permission utilities (hasPermission, hasModuleAccess)
  /nav                     — Navigation config (ORG_NAV_ITEMS, getFirstAccessiblePath)
  /oidc                    — OIDC/PKCE helpers (commented out)
  /email                   — Email templates and sending
  /audit                   — Audit logging
  /middleware              — Auth, role-based middleware
  /validations             — Zod schemas for form/API validation
  /utils                   — Pure utilities (cn, date, format, tenant-url, api-fetch, etc.)
  /export                  — CSV export
  /logging                 — Backend logging
  /services                — (proposed, not yet created) — Business logic layer extracted from API routes

/store                     — Zustand state stores
  auth.store.ts            — Auth user + loading
  theme.store.ts           — Dark/light mode
  locale.store.ts          — Language/RTL preference
  transfer.store.ts        — Superadmin transfer mode
  ui.store.ts              — UI state (sidebar collapse, etc.)

/types                     — TypeScript type definitions
  index.ts                 — Barrel export
  [entity].types.ts        — Per-entity types (asset, warranty, user, etc.)

/locales                   — i18n translation files (JSON or similar)

/public                    — Static assets (favicon, images, etc.)

/scripts                   — Build/deploy scripts

.env.local.example         — Example env vars
.env.development.example   — Development env template
.env.staging.example       — Staging env template
.env.production.example    — Production env template
middleware.ts              — Next.js middleware (session check)
next.config.mjs            — Next.js config (Sentry, redirects)
tailwind.config.ts         — Tailwind CSS config
tsconfig.json              — TypeScript config
```

### Key Files
- **middleware.ts** — Enforces session presence on protected routes
- **app/layout.tsx** — Root layout, QueryProvider, Sentry, theme/locale setup
- **app/[orgSlug]/layout.tsx** — Org portal layout with sidebar, header, auth check
- **app/superadmin/layout.tsx** — Superadmin layout with transfer mode banner
- **app/error.tsx** — Root-level error boundary for uncaught exceptions
- **app/(marketing)/error.tsx** — Error boundary for marketing/public pages
- **lib/firebase/auth-helpers.ts** — `verifySessionCookie()` for API routes
- **lib/audit/logger.ts** — `writeAuditLog()` called by all mutation endpoints
- **lib/permissions/index.ts** — Permission utilities
- **lib/nav/index.ts** — Navigation configuration
- **components/shared/QueryProvider.tsx** — React Query setup, 401 handling
- **components/ui/index.ts** — Barrel export of all UI components
- **components/shared/index.ts** — Barrel export of shared components
- **hooks/index.ts** — Barrel export of all hooks organized by domain

---

## 9. Environment Variables

**See `.env.example` for comprehensive documentation of all 19 environment variables with descriptions and sources.**

### Public Variables (NEXT_PUBLIC_*)
- `NEXT_PUBLIC_FIREBASE_API_KEY` — Firebase client API key
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` — Firebase Auth domain
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` — Firebase project ID
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` — Firebase storage bucket
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` — Firebase messaging ID
- `NEXT_PUBLIC_FIREBASE_APP_ID` — Firebase app ID
- `NEXT_PUBLIC_APP_URL` — Domain for email links, redirects, etc.
- `NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY` — Bot protection (disabled)
- `NEXT_PUBLIC_SENTRY_DSN` — Error tracking endpoint

### Server-Only Variables
- `FIREBASE_PROJECT_ID` — Firebase project ID (server)
- `FIREBASE_CLIENT_EMAIL` — Firebase Admin SDK service account email
- `FIREBASE_PRIVATE_KEY` — Private key for Firebase Admin SDK (must be kept secret)
- `CRON_SECRET` — Secret for cron job triggers (`/api/cron/*` endpoints)
- `RESEND_API_KEY` — Email service API key (Resend)
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_SMS_FROM`, `TWILIO_WHATSAPP_FROM` — SMS service (not yet integrated)
- `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` — Error tracking credentials
- `CLOUDFLARE_TURNSTILE_SECRET_KEY` — Bot protection secret (disabled)
- `NODE_ENV` — Deployment environment (development, staging, production)

---

## 10. Not Found in Codebase

- **Database migrations/seeds** — Firebase uses Firestore; no SQL migrations
- **Test suite** — No Jest/Vitest tests found; only dev dependencies present
- **GraphQL API** — Uses REST + JSON
- **CI/CD pipeline config** — Vercel auto-deploys; no explicit GitHub Actions
- **Kubernetes/Docker** — Vercel handles deployment
- **Stripe/Payment processing** — Payment logs tracked but actual processor not integrated
- **Twilio/SMS sending** — Stub exists but not integrated
- **Redis caching** — In-memory session cache only (Firebase)
- **Webhook handling** — No incoming webhook handlers (but outgoing emails via Resend)
- **File upload** — QR generation is server-side; no persistent file storage beyond Firestore
- **Search/Elasticsearch** — Firestore queries only
- **Scheduled jobs framework** — Cron jobs via external HTTP triggers, not internal scheduler
- **API documentation** — No OpenAPI/Swagger; inferred from route handlers

---

## 11. Security Considerations

### Implemented
- ✅ httpOnly session cookies (server-side, not accessible to JS)
- ✅ CORS / same-site cookie restrictions
- ✅ Session verification on every API route via `verifySessionCookie()`
- ✅ Firebase Admin SDK for trusted server operations
- ✅ Role and permission checks on mutation endpoints
- ✅ Audit logging of all data mutations
- ✅ Multi-tenant isolation by organizationId
- ✅ Immutable audit logs (append-only pattern)
- ✅ Sentry error tracking with context (no PII in logs)
- ✅ Cron job secret for scheduled tasks (Authorization header only, not query param)

### Gaps / Concerns
- ⚠️ No rate limiting on public endpoints (early-access, org creation, invite enumeration)
- ⚠️ Email delivery failures not tracked (sent flag always true even if email failed)
- ⚠️ SSO disabled but code remains (potential security review needed before enabling)
- ⚠️ Turnstile disabled but code remains (bot verification gap in prod)
- ⚠️ No password complexity enforcement
- ⚠️ Session cache has 5-10 second window where stale tokens remain valid (acceptable trade-off)

---

## 12. Performance Considerations

### Optimizations
- ✅ Server-side session caching (5-10 second TTL)
- ✅ Server-side permission caching (10 second TTL)
- ✅ React Query with staleTime and cacheTime for client-side data
- ✅ Firestore indexing by organizationId for fast tenant queries
- ✅ Bulk Firestore get (getAll) for asset name lookups in warranty alerts
- ✅ CSV chunking (assets, inventory) for exports without memory bloat

### Bottlenecks
- ⚠️ Warranty alert cron fetches all asset names sequentially (could batch parallel)
- ⚠️ No pagination on large asset/inventory lists (could implement cursor-based)
- ⚠️ Audit logs not indexed (every query is collection scan)
- ⚠️ Session verification hits Firestore on cache miss (could use Redis in production)

---

## 13. Internationalization (i18n)

- **Languages:** Arabic (RTL), English (LTR)
- **Hook:** `useT()` returns `{ t: (key) => string, lang: 'ar' | 'en', dir: 'rtl' | 'ltr' }`
- **Store:** `locale.store.ts` manages global language preference
- **Locales:** `/locales` directory with translation key files
- **Fallback:** English if locale not found

---

## 14. Theming

- **Modes:** Light (default), Dark
- **Store:** `theme.store.ts` manages preference
- **CSS Variables:** `--primary-*`, `--gray-*`, `--surface-*`, etc. applied via Tailwind
- **Persistence:** Theme preference stored in localStorage via Zustand

---

## 15. Animations & Motion

- **Library:** Framer Motion for declarative animations
- **Easing Tokens:** CSS custom properties define standard easing curves (ease-out-expo, ease-spring, ease-in-sharp, ease-in-out-smooth)
- **Duration Tokens:** CSS custom properties for standard animation durations (120ms, 180ms, 250ms, 350ms, 450ms)
- **Page Transitions:** Route changes fade and translate with 300ms enter, 180ms exit
- **Sidebar Animation:** Collapse/expand animates width smoothly with easing; labels fade out
- **Button Interactions:** Hover lifts, active scales down (97%)
- **Skeleton Loading:** Gradient shimmer animation for loading states
- **Preference:** `prefers-reduced-motion` media query reduces all animations to 0.01ms for accessibility
