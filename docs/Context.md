# Makhzoon Project Context

## 1. Project Overview

**Makhzoon** (مخزون) is a **Business OS for Arab organizations** — a multi-tenant SaaS platform built to replace spreadsheets across core business domains: assets, inventory, sales/POS, orders, finance, and workspace configuration.

**Vision / Positioning:** "أدير عملك في مكان واحد. بدون جداول بيانات." (Run your business in one place. No spreadsheets.)

**Target Users:**
- Small to medium-sized organizations across multiple industries (Technology, Healthcare, Finance, Retail, Manufacturing, Education, Government, Non-Profit)
- Org owners and admins — manage users, subscriptions, configurations
- Staff members — create requests, view assets, track inventory, take orders
- Makhzoon support team — manage subscriptions, troubleshoot issues
- Superadmin — manage all organizations, team, backend logs, configurations

---

## 2. The Modules (Module Identity System)

Makhzoon is organized around named modules, each with a distinct Arabic name, English brand name, and brand color applied consistently across nav, marketing, and UI.

| Module | Arabic | English | Color | Domain |
|--------|--------|---------|-------|--------|
| أصول | Usool | Assets | `#00695C` (deep teal) | Asset management |
| رصيد | Raseed | Inventory | `#E65100` (deep orange) | Inventory + purchasing |
| حركة | Haraka | Sales / POS | `#C2185B` (deep pink) | Point of sale + orders |
| مال | Maal | Finance | `#1B5E20` (deep green) | Finance & reporting *(future)* |
| بنّا | Banna | Workspace | `#1565C0` (deep blue) | Workspace builder / custom fields |

**Brand colors:** Navy `#0F3F5C` · Teal `#1A7A9A`

**How module identity is applied:**
- `lib/nav/index.ts` — Each nav entry carries `moduleColor` and `moduleName`
- `components/layout/AppSidebar.tsx` — Active nav items use module color for pill background, left border, and icon; Arabic module name shown as subtitle in EN locale
- `locales/messages.ts` — `nav.assets = 'Usool'` / `'أصول'`, `nav.inventory = 'Raseed'` / `'رصيد'`, etc.

---

## 3. Core Feature Modules

### 3.1 Asset Management — Usool (أصول)
- **Asset Register:** Create, edit, retire, and import assets (CSV)
- **Asset Fields:** Name, category, status, serial number, purchase date/cost, assigned person, location, notes
- **Asset Statuses:** Configurable via managed lists (`asset_status`)
- **Asset Actions:** QR code generation, checkout/check-in, maintenance records, asset notes
- **Asset Import:** Bulk import via CSV with validation
- **Asset Export:** Export all assets to CSV with audit metadata
- **Custom Fields:** `CustomFieldValuesSection` rendered on asset detail page — reads/writes values from `custom_field_values` table
- **Routes:** `/{locale}/{orgSlug}/{space}/usool/`

### 3.2 Inventory Management — Raseed (رصيد)
- **Inventory Items:** Track stocked items with quantity, reorder thresholds, unit cost
- **Stock Status:** `ok` / `low` / `out` — computed from `quantityOnHand` vs `minimumThreshold`
- **Ledger Transactions:** In / Out / Adjustment movements with reason + performer tracking
- **POS Integration:** Items flagged `posEnabled` appear in the Haraka register; `posPrice` is used for sales
- **Purchases (POs):** Draft → Received or Cancelled; receiving triggers stock-in transactions
- **Stock Audits:** Physical count audits (draft → in_progress → completed) with variance reconciliation
- **Custom Fields:** `CustomFieldValuesSection` rendered on inventory item detail page
- **Routes:** `/{locale}/{orgSlug}/{space}/raseed/`

### 3.3 Point of Sale — Haraka (حركة)

#### POS Register
- Session-based selling: cashier opens a session (with opening float), rings up sales, closes session
- Product search by name, SKU, or barcode scan (keyboard input)
- Category filter tabs on the product grid
- Multi-payment: Cash, Card, Other — split payments supported
- Per-line discounts (gated by `pos.apply_discount`)
- Cart hold / recall — cashier can pause and resume multiple carts
- Refunds (full or partial line) and voids
- **Receipt printing:** Thermal printer via WebUSB (ESC/POS), 58mm and 80mm paper; Arabic via canvas raster
- **Receipt sharing:** Share link (public `/r/[orgSlug]/[txId]`), WhatsApp, email, download PNG/PDF
- **Receipt configuration:** Templates (thermal-58, thermal-80, a4-modern, a4-invoice), language (EN/AR/both), logo, footer, accent color
- **Fawtara (Jordan ISTD e-invoicing):** Optional; when enabled, every transaction is submitted to Fawtara async and a QR payload is printed on the receipt

#### Orders System
For businesses that receive orders via phone, WhatsApp, Instagram, Facebook, or other channels:
- Order lifecycle: `new → confirmed → assigned → in_transit → delivered` (delivery) or `ready_for_pickup → picked_up` (pickup)
- Items sourced from Raseed catalog; payment tracked separately via `haraka_order_payments` table
- Sales agent (org member) + delivery agent (org member or external `haraka_delivery_agents`)
- Channel and payment method configurable via managed lists (`order_channel`, `order_payment_method`)
- Order statuses relabelable/recolorable by org via managed lists (`order_status`)
- Sequential order numbers: `ORD-000001`
- **Invoice generation:** on-demand `INV-YYYY-NNNNNN` number allocation; renders a configurable A4 invoice document
- **Delivery token sharing:** "Share Delivery Link" generates a capability token; delivery agent opens `/delivery/[token]` (public, no auth) to view order, advance status, and record payments from their phone
- **Routes:** `/{locale}/{orgSlug}/{space}/haraka/orders/` · Public delivery: `/delivery/[token]`

#### Warranty Certificates
Customer-facing warranty documents generated from an order or POS transaction:
- Printable, shareable (WhatsApp/email/link), downloadable (PDF/PNG)
- Template system: A4, thermal, certificate styles — EN/AR
- Public cert page: `/w/[orgSlug]/[certId]`
- Settings → Warranty Certificate configuration
- **Routes:** `/{locale}/{orgSlug}/{space}/haraka/warranties/`

#### Cash Drawer
- ESC/POS `kickDrawer` command via WebUSB
- `openCashDrawer()` server-side helper; auto-triggers on cash sale in register
- `CashDrawerButton` in Haraka header
- Settings → Cash Drawer configuration page

#### Card Terminal
- 4 modes: **display** (show amount on screen only), **local_bridge** (connect to a local REST bridge), **cloud** (server-side API call to provider), **webhook** (provider pushes result back)
- Provider abstraction (`CardTerminalProvider` interface): **Paymob**, **SumUp**, **Square** — all implemented server-side
- Paymob: 4-step flow — auth token → order → payment key (`/acceptance/payment_keys`) → initiate terminal charge; HMAC-SHA256 webhook verification
- SumUp: checkout creation + polling; HMAC-SHA256 webhook support
- Square: Terminal Checkout API with polling; HMAC webhook verification
- `CardTerminalPayment` component + Settings → Card Terminal page
- API keys stored encrypted (`api_key_enc` column)
- **Routes:** `/{locale}/{orgSlug}/{space}/haraka/settings/card-terminal`

#### POS Customers
- Customer database (name, phone, email, tax number, notes)
- Attach customers to sales for receipt personalization and Fawtara B2B submissions
- Bulk delete / move / duplicate across spaces

#### POS Transactions & Reports
- Cross-session view of all transactions: receipt number, customer, items, total, payment method, status, cashier
- Status filter; today's summary stat cards
- Sales by day, top items, by cashier, by payment method, by session — date range picker, CSV export

### 3.4 Warranty Management — Usool (أصول)
- **Vendor warranty tracking:** Per-asset, with start/end dates and reminder toggle
- **Expiry status:** Active / Expiring Soon / Expired (computed daily)
- **Cron alerts:** Cloudflare Worker cron emails all org admins at 30, 14, and 7 days before expiry
- **Routes:** `/{locale}/{orgSlug}/{space}/warranties/`

### 3.5 Requests Workflow
- **Types:** REFILL, RETIRE, BUY_NEW, EXTEND_WARRANTY
- **Status flow:** PENDING → APPROVED or REJECTED
- **Detail page:** `/{locale}/{orgSlug}/{space}/requests/[requestId]` — shows type, description, linked asset/inventory, approve/reject buttons for admins, custom field values section
- **Custom Fields:** `CustomFieldValuesSection` rendered on request detail page (recordType = `'requests'`)
- **Routes:** `/{locale}/{orgSlug}/{space}/requests/`

### 3.6 Reports & Analytics
- **Dashboard:** Quick stats across assets, inventory, warranties, requests
- **Reports:** Utilization, depreciation, cost analytics
- **Routes:** `/{locale}/{orgSlug}/{space}/dashboard/` · `/{locale}/{orgSlug}/{space}/reports/`

### 3.7 Support Ticketing
- **In-app tickets:** Staff creates; Makhzoon team replies
- **Thread-based:** Messages per ticket
- **Lifecycle:** OPEN → IN_PROGRESS → RESOLVED → CLOSED
- **Priority:** LOW / MEDIUM / HIGH / URGENT
- **Routes:** `/{locale}/{orgSlug}/{space}/support/` · `/superadmin/support/`

### 3.8 Audit Logs
- Immutable trail for every create/update/delete action across all modules
- 41+ logged action types
- Space scope / org scope toggle
- CSV export (`/api/audit-logs/export`)
- Advanced filtering: org, user, action, date range
- **Routes:** `/{locale}/{orgSlug}/audit-logs/` · `/superadmin/audit-logs/`

### 3.9 Notifications System
- **In-app:** Bell icon in `AppHeader`, `NotificationPanel` slide-over, full list page — real-time via React Query polling; unread count badge
- **Email:** Resend-based delivery per recipient who has email enabled for the event type
- **Web push:** VAPID-based browser push via `web-push` package; service worker at `public/sw.js`; `web_push_subscriptions` table (per user/device); Enable/Disable toggle in notification settings
- **Event catalog:** 27 event types across 7 modules (orders, pos, inventory, requests, users, warranty, system) — see `lib/notifications/catalog.ts`
- **Preference resolution:** 3-level hierarchy: user override → org default → catalog default
- **Role-based fanout:** events are fanned out to org members matching the configured roles for each event type
- **Fire-and-forget:** `notificationQueue.enqueue()` is synchronous (never awaited by callers)
- **User preferences:** Settings → Notifications — per-event in-app/email switches + browser push enable/disable
- **Routes:** `/{locale}/{orgSlug}/notifications/` · `/{locale}/{orgSlug}/settings/notifications`

### 3.10 Banna — Workspace Configuration (بنّا)
- **Purpose:** Lets orgs define and store custom fields on top of any built-in record (assets, inventory, requests)
- **Custom field types:** text, number, date, boolean, select, multi_select, user
- **Management UI:** `/{locale}/{orgSlug}/{space}/banna/custom-fields/` — create/edit/delete field definitions per module
- **Value storage:** `custom_field_values` table keyed by `(record_type, record_id, field_id)` — one value per field per record
- **UI integration:** `CustomFieldValuesSection` component renders on asset detail, inventory item detail, and request detail pages
- **Banna overview:** `/{locale}/{orgSlug}/{space}/banna/` — module entry point (placeholder dashboard, will become full workspace config hub)
- **Feature flag:** `banna` key in subscription `features` JSONB; included in all packages via migration `0030`
- **Routes:** `/{locale}/{orgSlug}/{space}/banna/`

---

## 4. Settings & Configuration

**Route base:** `/{locale}/{orgSlug}/settings/` (org-scoped, no space in URL)

| Page | Route | Permission |
|------|-------|-----------|
| Organization Info | `/settings/organization` | `settings.orgInfo` |
| Spaces | `/settings/spaces` | Admin only |
| Managed Lists | `/settings/lists` | `settings.orgInfo` |
| Tax Rates | `/settings/tax-rates` | `settings.taxRates` + `pos` feature |
| Jo-Fotara (e-invoicing) | `/settings/jo-fotara` | `settings.fawtara` + `pos` feature |
| Receipt | `/settings/receipt` | `settings.fawtara` + `pos` feature |
| Order Documents | `/settings/order-documents` | `settings.fawtara` + `pos` feature |
| Cash Drawer | `/settings/cash-drawer` | `pos` feature |
| Card Terminal | `/settings/card-terminal` | `pos` feature |
| Warranty Certificate | `/settings/warranty-certificate` | `pos` feature |
| Notifications | `/settings/notifications` | All users |
| Users | `/users` | `settings.users` |
| Subscription | `/subscription` | `settings.subscription` |

### Managed Lists
Config-driven dropdown system. Two tiers:
- **Platform defaults** — seeded by superadmin; apply to all orgs
- **Org overrides/additions** — org admin can add, rename, recolor, reorder

**Free lists** (org can add/remove): `asset_status`, `asset_category`, `location`, `inventory_unit`, `inventory_category`, `inventory_storage_location`, `vendor`, `org_industry`, `order_channel`

**System lists** (values locked; label/color/order editable): `request_status`, `request_type`, `purchase_status`, `inventory_movement`, `pos_txn_status`, `pos_session_status`, `warranty_status`, `warranty_target`, `maintenance_type`, `order_status`, `order_payment_method`

---

## 5. Spaces Architecture

Every org has one or more Spaces (branches, warehouses, departments). All module data is scoped to `space_id`. Org-wide data (users, billing, settings, managed lists, tax rates) is not space-scoped.

- Default space auto-created on signup; cannot be deleted
- Users gain access via `space_members` rows (org_owner with `all_spaces = true` is implicitly in all)
- **SpaceSwitcher** in sidebar — navigates to same module path under new space slug
- **Move / Duplicate to Space** bulk actions across assets, inventory, requests, POS customers

---

## 6. Users & Permissions

### Roles
| Role | Description |
|------|-------------|
| `org_owner` | Full access; cannot be deactivated by others |
| `admin` | Full access by default; manages users and settings |
| `staff` | View-only on most modules; submits requests and support tickets |

### Permission System
- Default permissions defined in `types/user-permissions.types.ts`
- Per-user custom overrides per module+operation
- UI: Permissions Editor with module groups (Core, Commerce, Workflow, Admin)
- Server: `lib/permissions/require.ts` — `requirePermission()` called in every API route

### Permission Keys (full list)

| Module | Operations |
|--------|-----------|
| `assets` | view, create, update, delete, import, checkout, maintenance, notes, bulk_delete, bulk_move, bulk_duplicate |
| `inventory` | view, create, update, delete, transactions, audits, bulk_delete, bulk_move, bulk_duplicate |
| `purchases` | view, create, update, delete, receive |
| `warranties` | view, create, update, delete |
| `requests` | view, create, approve, bulk_move, bulk_duplicate |
| `reports` | view |
| `support` | view, create |
| `auditLogs` | view |
| `leads` | view |
| `pos` | open_session, close_session, process_sale, apply_discount, issue_refund, void_transaction, view_reports, fawtara_submit, customers_bulk_delete, customers_bulk_move, customers_bulk_duplicate, view_orders, manage_orders, assign_delivery, manage_delivery_agents |
| `settings` | view, orgInfo, subscription, users, taxRates, fawtara |

---

## 7. Technical Architecture

### Stack
- **Frontend:** Next.js 15 (App Router, Turbopack), React 18, TypeScript
- **Backend:** Next.js API Routes (serverless, Cloudflare Workers)
- **Database:** Supabase (Postgres + Row-Level Security)
- **Auth:** Supabase Auth + `@supabase/ssr` (httpOnly session cookies)
- **State:** Zustand (global/UI state) + TanStack Query v5 (server state)
- **Email:** Resend (transactional: invites, alerts, notifications)
- **Web Push:** `web-push` package (VAPID-based browser push); service worker at `public/sw.js`
- **Error Tracking:** Sentry
- **Analytics:** ContentSquare, LogRocket
- **Styling:** Tailwind CSS + Radix UI primitives + Framer Motion
- **Validation:** Zod
- **i18n:** Custom `useT()` hook, `locales/messages.ts` (EN + AR)
- **Thermal printing:** ESC/POS via WebUSB (`lib/modules/haraka/printing/`)
- **Image capture:** `html-to-image` (receipt/cert download as PNG/JPG)

### Deployment
- **Hosting:** Cloudflare Workers via `@opennextjs/cloudflare`
- **Database:** Supabase (hosted Postgres)
- **Environments:**
  - Production: `app.makhzoon.me` (main branch)
  - Staging: `stg.makhzoon.me` (STGBranch)
  - Dev: `dev.makhzoon.me` (DevBranch)
  - Marketing: `makhzoon.me` / `www.makhzoon.me`
- **Crons:** Cloudflare Workers cron in `workers/cron/` — triggers Next.js API endpoints on schedule

### Routing
- **Multi-tenant, path-based:**
  - Marketing: `/{locale}/home`, `/product`, `/pricing`, etc.
  - Auth: `/{locale}/login`, `/{locale}/invites/[token]`
  - Org Portal: `/{locale}/[orgSlug]/[spaceSlug]/{module}`
  - Superadmin: `/{locale}/superadmin/*`
  - Public receipt: `/r/[orgSlug]/[receiptId]`
  - Public receipt preview: `/r/[orgSlug]/preview`
  - Public delivery page: `/delivery/[token]` (no auth — delivery agent portal)
  - Public warranty cert: `/w/[orgSlug]/[certId]`
- **`proxy.ts`** (project root) — ALL routing: domain routing, session enforcement, locale detection/redirect. **Never create `middleware.ts` alongside this file** — it causes a build conflict.

### Event & Audit Infrastructure
- **Event bus** (`lib/platform/events/event-bus.ts`) — in-memory, emits 27+ typed events across 9 service modules. No subscribers yet — hook point for future consumers.
- **Audit log** (`lib/platform/audit/`) — `auditLog.queue()` fire-and-forget; writes to `audit_logs` table. Called in every service mutation.
- **Notification queue** (`lib/notifications/notification-queue.ts`) — `notificationQueue.enqueue()` fire-and-forget; delivers in-app (DB insert), email (Resend), and web push (`lib/webpush/`) per recipient preferences.
- **Email** (`lib/email/resend.ts`) — `sendEmail({ to, subject, html, text })` via Resend. Gracefully skips if unconfigured.
- **Web push** (`lib/webpush/index.ts`) — `sendWebPush(userIds, payload)` using VAPID keys; auto-removes stale subscriptions (HTTP 404/410).

### Session & Auth Flow
1. Sign in via Supabase Auth (email/password)
2. `@supabase/ssr` manages httpOnly session cookies
3. Server-side session cache: 5–10s TTL (`lib/supabase/session-cache.ts`)
4. Permission cache: 10s TTL keyed by user UID
5. Logout: `supabase.auth.signOut()` + hard redirect
6. Superadmin transfer mode: `transferOrgId` cookie → org portal with Transfer Mode banner

---

## 8. Data Models (Key Tables)

All tables use Supabase Postgres with Row-Level Security. Schema in `supabase/migrations/` (0001–0031).

| Table | Description |
|-------|-------------|
| `organizations` | Tenants — `id`, `slug`, `name`, `contact_email` |
| `spaces` | Sub-units of org — `id`, `organization_id`, `slug`, `name`, `is_default` |
| `space_members` | User ↔ space membership |
| `users` | Org members — `id` (Supabase UID), `role`, `status`, `permissions` (jsonb) |
| `superadmin_users` | Platform staff — `role` (super_admin / makhzoon_admin / makhzoon_support) |
| `invites` | One-time invite tokens |
| `packages` | Subscription tiers — `features` (jsonb), `limits` (jsonb), `inclusions` (jsonb), pricing |
| `subscriptions` | `organization_id`, `package_id`, `features` (jsonb), `status` |
| `assets` | Asset register — name, category, status, serial_number, purchase_date/cost, location |
| `asset_checkouts` | Checkout/check-in log |
| `asset_notes` | Free-form notes per asset |
| `maintenance_records` | Service/repair/inspection events per asset |
| `warranties` | Vendor warranties — asset_id or inventory_item_id, vendor, start/end dates |
| `inventory_items` | Stocked items — quantity_on_hand, minimum_threshold, stock_status, posEnabled, posPrice |
| `inventory_transactions` | In/out/adjustment ledger |
| `inventory_audits` + `inventory_audit_items` | Physical count audits |
| `purchases` + `purchase_lines` | Purchase orders |
| `pos_sessions` | Haraka register sessions — cashier, opening/closing float, discrepancy |
| `pos_transactions` | POS sales — items (jsonb), payments (jsonb), fawtara (jsonb) |
| `pos_receipt_counters` | Sequential receipt number per org/space |
| `pos_customers` | Haraka customer records |
| `haraka_orders` | Orders system — channel, status, fulfillment_type, delivery_address (jsonb), items (jsonb), payment_status, invoice_number, delivery_token |
| `haraka_order_payments` | Individual payment entries per order |
| `haraka_delivery_agents` | External delivery people |
| `haraka_order_counters` | Sequential order number per org/space |
| `haraka_invoice_counters` | Sequential invoice number per org per calendar year |
| `haraka_warranty_certs` | Customer warranty certificates — template, EN/AR labels, expiry |
| `haraka_cash_drawer_config` | Per-org cash drawer settings (port, baud, auto-open) |
| `haraka_card_terminal_config` | Per-org card terminal config — mode, provider, encrypted api_key, terminal_id, webhook_secret |
| `haraka_card_charges` | In-flight and completed card charges — reference, amount, status, provider_ref |
| `requests` | Staff requests — type, status (PENDING/APPROVED/REJECTED) |
| `support_tickets` + `ticket_messages` | In-app support thread |
| `audit_logs` | Immutable mutation trail — organization_id, user_id, action, module, old_value, new_value |
| `platform_list_items` | Superadmin-owned managed list catalog + defaults |
| `org_list_items` | Per-org managed list additions and overrides |
| `tax_rates` | Org-level tax rates — shared across Raseed, Purchases, and Haraka |
| `fawtara_counters` | Sequential Fawtara invoice number per org |
| `backend_logs` | System-level logs for superadmin debugging |
| `payment_logs` | Subscription payment tracking |
| `custom_fields` | Banna field definitions — organization_id, module, field_key, type, label, label_ar, options (jsonb) |
| `custom_field_values` | Banna field values — organization_id, record_type, record_id, field_id, value (jsonb) |
| `notifications` | In-app notification rows — recipient_id, event_type, title, body, data, link, is_read |
| `notification_preferences` | Per-user overrides — event_type, in_app, email |
| `notification_org_defaults` | Org-wide defaults — event_type, in_app_enabled, email_enabled, notify_roles |
| `web_push_subscriptions` | Browser push subscriptions — user_id, endpoint, p256dh, auth (VAPID) |

---

## 9. Cron Jobs

| Endpoint | Schedule | What it does |
|----------|----------|-------------|
| `/api/cron/warranty-alerts` | Mondays 9 AM UTC | Emails org admins about warranties expiring within 30 days |
| `/api/cron/subscription-status` | Daily 1 AM UTC | Auto-expires overdue subscriptions |

Auth: `Authorization: Bearer {CRON_SECRET}` header.

---

## 10. Superadmin Portal

**Route:** `/{locale}/superadmin/`

- Dashboard: system overview
- Organizations: create, view, edit subscriptions, view users, transfer into org (Transfer Mode)
- Lists: platform managed list catalog (seeds platform defaults; orgs see these via their settings)
- Packages: subscription package management
- Team: manage Makhzoon platform staff
- Backend Logs: system-level debugging
- Support: view all org support tickets
- Audit Logs: cross-org audit trail with full filtering (org, user, action, date range) and CSV export
- Sync: environment sync tooling

**Superadmin Transfer Mode:** Superadmin sets `transferOrgId` cookie → sees org portal with Transfer Mode banner → exit clears cookie.

**Sidebar:** Animated collapsible (240px ↔ 68px). Mobile: hidden by default; hamburger opens full-width overlay drawer.

---

## 11. Current State (June 2026)

### Fully Implemented & Stable
- ✅ Supabase as sole data layer (Postgres + RLS) — Firebase fully removed
- ✅ Cloudflare Workers deployment — Amplify/Vercel removed
- ✅ Multi-tenant, multi-space architecture (`/{locale}/{orgSlug}/{spaceSlug}/{module}`)
- ✅ Supabase Auth — email/password + invite-based onboarding
- ✅ Granular RBAC + custom per-user, per-module permissions
- ✅ **Usool (Assets):** register, QR, checkout, maintenance, notes, CSV import/export, audits, custom field values
- ✅ **Raseed (Inventory):** items, transactions, purchases, stock audits, POS integration, custom field values
- ✅ **Haraka POS:** sessions, register, multi-payment, discounts, refunds, voids, receipt printing/sharing, customers, reports, Fawtara integration
- ✅ **Haraka Orders:** full order management (channel, lifecycle, delivery agents, payment tracking, invoice)
- ✅ **Haraka Warranty Certs:** PDF/PNG certs, public share link, WhatsApp/email share, A4/thermal/certificate templates
- ✅ **Haraka Cash Drawer:** ESC/POS kick, auto-open on cash sale, settings page
- ✅ **Haraka Card Terminal:** 4 modes, Paymob/SumUp/Square providers, polling, webhooks, encrypted config
- ✅ **Managed Lists:** platform + org tier, bilingual, free/system lists
- ✅ Warranties — tracking + cron email alerts
- ✅ Requests workflow — list, detail page, approve/reject, custom field values
- ✅ Support ticketing (thread-based)
- ✅ Audit logs (immutable, searchable, CSV export, org/space scope toggle, full filtering)
- ✅ Dashboard + reports
- ✅ Bulk actions across all modules (delete, move to space, duplicate to space)
- ✅ Subscription + package management + feature gating
- ✅ Spaces: create, manage members, switch, move/duplicate data
- ✅ Settings: org info, spaces, managed lists, tax rates, Jo-Fotara, receipt, cash drawer, card terminal, warranty cert
- ✅ Superadmin portal with full org management and Transfer Mode
- ✅ Dark mode, Arabic/English with RTL, Sentry, ContentSquare, LogRocket
- ✅ Module identity system (brand colors + Arabic names in sidebar)
- ✅ Fully responsive (mobile + tablet + desktop); marketing website; coming soon page
- ✅ Cron jobs (warranty alerts, subscription expiry) via Cloudflare Workers
- ✅ **Notifications:** in-app bell + panel + list page + full read/preferences UI; email via Resend; browser web push via VAPID (`web-push`); 27 event types; 3-level preference resolution
- ✅ **Banna (Custom Fields):** field definitions management, value storage, rendered on assets/inventory/requests

### Disabled / Not Production-Ready
- ⏳ **SSO/OIDC:** Implemented but disabled (`/api/auth/sso/*` returns disabled errors)
- ⏳ **Cloudflare Turnstile:** Bot verification implemented but disabled
- ❌ **SMS:** Stub exists (`lib/sms/provider.ts`) but not integrated

### Known Gaps
- Card terminal providers (Paymob, SumUp, Square) need end-to-end verification against live sandbox APIs with real credentials + physical terminals
- No pagination on large asset/inventory lists (full list fetched, client-side slice)
- Email delivery failures not tracked separately
- No password complexity enforcement
- No test suite (Vitest configured, zero test files written)
- Banna WorkspaceProfile (Phase 1+) not yet built — only custom fields are implemented

---

## 12. Code Organization

```
/app                                    — Next.js App Router
  /[locale]
    /(auth)/login, /signup              — Auth pages
    /(marketing)/home, /product, ...    — Public marketing pages
    /[orgSlug]/[space]/{module}         — Org portal (all module pages)
      /usool/[assetId]                  — Asset detail (+ custom fields)
      /raseed/[itemId]                  — Inventory item detail (+ custom fields)
      /requests/[requestId]             — Request detail (+ custom fields, approve/reject)
      /banna/custom-fields              — Banna field management
      /haraka/orders, /haraka/warranties, /haraka/sessions
    /[orgSlug]/settings/                — Org-level settings (incl. card terminal, push notifs)
    /[orgSlug]/users                    — User management
    /[orgSlug]/notifications            — Notifications list
    /superadmin/                        — Superadmin portal
    /invites/[token]                    — Invite acceptance
    /page.tsx                           — Coming soon page
  /api/                                 — API routes
    /auth/                              — session, me, sso (disabled)
    /assets, /inventory, /warranties, /requests, /support
    /requests/[requestId]               — GET single request
    /haraka/orders, /haraka/delivery-agents
    /haraka/transactions, /haraka/sessions, /haraka/customers
    /haraka/tax-rates, /haraka/reports, /haraka/fawtara-config
    /haraka/card-charges                — Initiate card terminal charge
    /haraka/card-terminal-config        — Card terminal settings
    /haraka/card-payment-result         — Card terminal webhook receiver
    /banna/custom-fields                — Field definition CRUD
    /banna/custom-field-values          — Value read/write per record
    /notifications                      — In-app notifications list + mark read
    /notification-preferences           — User preference CRUD
    /push-subscriptions                 — POST subscribe, DELETE unsubscribe
    /push-subscriptions/vapid-key       — GET VAPID public key
    /audit-logs, /audit-logs/export     — Audit log query + CSV export
    /lists/[listKey]                    — Managed list resolution (org + platform merge)
    /spaces, /users, /organizations
    /superadmin/lists, /superadmin/organizations, /superadmin/team
    /cron/warranty-alerts, /cron/subscription-status
    /ping                               — Health check
  /r/[orgSlug]/[receiptId]              — Public receipt view
  /r/[orgSlug]/preview                  — Receipt preview
  /w/[orgSlug]/[certId]                 — Public warranty cert view
  /delivery/[token]                     — Public delivery agent portal

/components
  /layout                               — AppHeader, AppSidebar, BottomNav, SpaceSwitcher,
                                          SuperAdminBanner, TransferModeBanner, MobileDrawer
  /haraka                               — Cart, ProductGrid, CustomerPicker, PaymentDialog,
                                          CardTerminalPayment, PrinterSettingsDialog,
                                          ReceiptShareDialog, WarrantyCertPreview,
                                          WarrantyCertShareDialog, CashDrawerButton,
                                          OrderStatusBadge, DeliveryAgentPicker
  /banna                                — CustomFieldForm, CustomFieldValuesSection
  /notifications                        — NotificationBell, NotificationPanel
  /shared                               — PageHeader, DataTable, FilterBar, StatusBadge,
                                          StatCard, SubscriptionGate, NetworkStatusIndicator,
                                          ConfigSelect, BulkActionsBar, DocumentList
  /ui                                   — Base components (button, input, dialog, badge, etc.)
  /marketing                            — MarketingHeader, Footer, CTABand

/hooks
  /haraka                               — useOrders, useTransactions, useSessions,
                                          useCustomers, useDeliveryAgents, useTaxRates,
                                          useFawtara, useReports, useCardTerminal,
                                          useCashDrawer, useWarrantyCerts
  /inventory                            — useInventory, usePurchases, useStockAudits
  /requests                             — useRequests, useRequest (single)
  /banna                                — useCustomFields, useCustomFieldValues,
                                          useSaveCustomFieldValues, useCreateCustomField,
                                          useUpdateCustomField, useDeleteCustomField
  /notifications                        — useNotifications, useNotificationPreferences,
                                          useUpdateNotificationPreferences,
                                          useOrgNotificationDefaults
  /lists                                — useList (managed list resolution)
  /spaces                               — useSpaceMembers, useSpaces, useAccessibleSpaces
  /org                                  — useOrgInfo
  /ui                                   — useT, useAdminGuard, useDebounce, toast

/lib
  /platform
    /tenancy                            — resolveTenant(), TenantContext type
    /events                             — EventBus (emits 27+ events; no subscribers yet)
    /audit                              — auditLog.queue() fire-and-forget
    /permissions                        — hasPermission(), hasPermByKey()
    /limits                             — checkResourceLimit()
  /modules
    /haraka
      /orders                           — schemas, repository, service
      /delivery-agents                  — schemas, repository, service
      /transactions                     — repository, service
      /card-terminal                    — service, repository, providers (Paymob, SumUp, Square)
      /sessions, /customers, /tax, /fawtara, /pricing, /printing
    /banna
      /repositories                     — banna.repository.ts, banna-values.repository.ts
      /services                         — banna.service.ts, banna-values.service.ts
      /types                            — index.ts (WorkspaceProfile placeholder)
    /inventory /services, /purchases
    /assets/services
    /requests/services
    /spaces/services
  /email                                — resend.ts, templates.ts
  /webpush                              — index.ts (sendWebPush via VAPID)
  /notifications                        — catalog.ts (27 event types), notification-queue.ts, types.ts
  /supabase                             — client.ts, admin.ts, auth-helpers.ts, session-cache.ts
  /permissions                          — index.ts (hasPermission), require.ts
  /receipts                             — labels.ts (bilingual receipt text)
  /nav                                  — ORG_NAV_ENTRIES, buildNavUrl, getFirstAccessiblePath
  /utils                                — cn, date, format, tenant-url
  /rate-limit                           — rateLimitTenant()

/public
  sw.js                                 — Service worker for web push (push event + notificationclick)

/store
  auth.store.ts                         — Auth user + session state
  theme.store.ts                        — Dark/light mode
  locale.store.ts                       — Language + RTL
  transfer.store.ts                     — Superadmin transfer mode
  ui.store.ts                           — sidebarCollapsed, superAdminSidebarCollapsed
  pos-cart.store.ts                     — Haraka POS in-progress cart

/types
  pos.types.ts                          — PosTransaction, PosSession, HarakaOrder, etc.
  banna.types.ts                        — CustomField, CustomFieldValue, CustomFieldWithValue,
                                          CustomFieldRecordType, UpsertCustomFieldValueInput
  user-permissions.types.ts             — UserPermissions, DEFAULT_ADMIN/STAFF_PERMISSIONS
  managed-lists.types.ts                — ListKey, LIST_REGISTRY, ResolvedListItem
  package.types.ts                      — PackageFeatures (FeatureKey includes 'banna')
  inventory.types.ts, auth.types.ts, request.types.ts, ...

/supabase/migrations/                   — 0001–0031
  0026_banna_custom_fields.sql          — custom_fields table
  0029_banna_field_values.sql           — custom_field_values table
  0030_banna_feature_flag.sql           — backfills banna: true into all packages
  0031_web_push_subscriptions.sql       — web_push_subscriptions table + RLS

/workers/cron/                          — Cloudflare Worker cron orchestrator
/locales/messages.ts                    — All EN + AR translation keys
proxy.ts                                — ALL routing (domain, locale, session gate)
                                          NEVER create middleware.ts alongside this
```

---

## 13. Environment Variables

### Public (`NEXT_PUBLIC_*`)
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `NEXT_PUBLIC_APP_URL` — Domain for email links (`https://app.makhzoon.me`)
- `NEXT_PUBLIC_APP_ENV` — `dev` | `staging` | `production`
- `NEXT_PUBLIC_SENTRY_DSN`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — VAPID public key for web push (generate once with `npx web-push generate-vapid-keys`)
- `NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY` — Disabled

### Server-only (via `wrangler secret put`)
- `SUPABASE_SERVICE_ROLE_KEY` — Bypasses RLS; server-side only
- `CRON_SECRET` — Authorization for `/api/cron/*`
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- `VAPID_PRIVATE_KEY` — VAPID private key for web push
- `VAPID_EMAIL` — VAPID contact email (e.g. `mailto:support@makhzoon.com`)
- `GOOGLE_DRIVE_PRIVATE_KEY` — Google Drive service-account
- `FAWTARA_SECRET_ENC_KEY` — Jordan ISTD e-invoicing encryption key
- `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`
- `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` — Manual deploy (GitHub Actions minutes exhausted until July 1 2026)

---

## 14. Security

### Implemented
- ✅ httpOnly session cookies via `@supabase/ssr`
- ✅ Supabase service-role key used server-side only
- ✅ Row-Level Security on all Supabase tables (incl. `web_push_subscriptions`, `custom_field_values`)
- ✅ Role + permission checks on every mutation API route
- ✅ Immutable audit logs
- ✅ Sentry (no PII in logs)
- ✅ CRON_SECRET via Authorization header only
- ✅ CSP headers in `next.config.ts`
- ✅ Rate limiting on auth and tenant endpoints (`lib/rate-limit.ts`)
- ✅ CSRF origin checking (`lib/csrf.ts`)
- ✅ Card terminal API keys stored encrypted in DB (`api_key_enc`)
- ✅ HMAC-SHA256 webhook verification on all card terminal providers

### Gaps
- ⚠️ No rate limiting on some public endpoints (`/api/early-access`, `/api/organizations/self-serve`)
- ⚠️ Email delivery failures not tracked
- ⚠️ SSO code present but disabled (security review needed before enabling)
- ⚠️ Turnstile disabled (bot verification gap)
- ⚠️ No password complexity enforcement
- ⚠️ 5–10s session cache window where stale tokens remain valid (accepted trade-off)

---

## 15. Not in Codebase

- No test suite (Vitest configured, zero tests written)
- No GraphQL (REST only)
- No Stripe/payment processor (payment logs tracked, no processor integrated)
- No Redis (in-memory session cache only)
- No cursor-based pagination (full list fetch, client-side slice)
- No Supabase Realtime (all polling via React Query; push notifications use VAPID, not websockets)
- No OpenAPI/Swagger docs
