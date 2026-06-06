# Makhzoon — Work Backlog

> **Start here after every pull.** This file lists everything planned but not yet built, in priority order.

---

## 🔴 Needs attention — CI / known bugs

- **GitHub Actions minutes exhausted until July 1, 2026.** Deploy manually from local machine using the commands in `CLAUDE.md`. CI will resume automatically on July 1.
- **`banna` feature flag not in any package yet.** The `FeatureKey` type now includes `'banna'` but no existing package record in the DB has `banna: true`. Banna nav will stay hidden until a superadmin enables the feature on an org's subscription, or a default is added to the seed/packages table.

---

## 🟡 Planned — not yet built

### 1. Banna — Custom field values (data layer)
The Banna module has the schema for *defining* custom fields (`custom_fields` table) and the management UI, but there is no data layer for *storing values* against records yet:
- `custom_field_values` table (migration needed)
- API routes and service to read/write field values per record
- UI integration — render `CustomFieldForm` inside asset, inventory item, and request detail pages

### 2. Banna — WorkspaceProfile
`WorkspaceProfile` is exported from `lib/modules/banna/types/index.ts` as a placeholder (`id`, `organizationId`, `spaceId`) but is not used anywhere yet. Flesh it out when the workspace-level config concept is defined.

### 3. Haraka — Card Terminal: real provider wiring
Provider stubs (Paymob, SumUp, Square) exist in `lib/modules/haraka/card-terminal/providers/` but are scaffolded, not fully tested against live sandbox APIs. Payment flow needs end-to-end verification per provider.

### 4. Notifications — email / push delivery
The notification queue (`lib/notifications/notification-queue.ts`) enqueues events and stores them in DB, but outbound email (Resend) and push (web push / FCM) delivery channels are not wired up. Currently notifications are in-app only.

### 5. Superadmin — audit log improvements
Audit logs page exists but export (CSV download) and advanced filtering (date range, action type, user) are not implemented.

---

## ✅ Recently completed

- **Security hardening** — RLS policies on 11 Haraka tables; PIN hashing via pgcrypto (`pin_hash` column); `public.` prefix fix for `crypt`/`gen_salt` in migration
- **Performance indexes** — migration `0028_performance_indexes.sql` adds 21 indexes across 18 `organization_id` columns and 3 FK columns
- **Security & performance audit scripts** — `scripts/security-audit.mjs` (7 checks) and `scripts/performance-audit.mjs` (7 checks); `npm run audit:security` / `audit:perf`
- **Banna (بنّا) module** — custom fields schema (`0026_banna_custom_fields.sql`), types, Zod validators, repository, service (with permissions + audit), API routes, overview page, custom-fields management page, `CustomFieldForm` component, hooks; wired into nav, sidebar, bottom nav, permissions
- **Notifications system** — `notifications`, `notification_preferences`, `notification_org_defaults` tables; `notificationQueue.enqueue()` service-layer fanout; bell icon in `AppHeader`; `NotificationPanel`; full list page; user preferences settings; wired into orders, transactions, inventory, Fawtara; 19 event types
- **Card Terminal integration** — 4 modes (display, local bridge, cloud, webhook); `CardTerminalPayment` component; polling; Settings → Card Terminal page; `PaymentDialog` integration; webhook receiver with HMAC; provider architecture (Paymob, SumUp, Square)
- **Cash Drawer** — ESC/POS `kickDrawer`, `openCashDrawer()`, backend config API, `CashDrawerButton`, Settings → Cash Drawer page, auto-open on cash sale in register
- **Warranty Certificates** — `haraka_warranty_certs` table; `WarrantyCertPreview` (A4/thermal/certificate templates, EN/AR); `WarrantyCertShareDialog`; public cert page `/w/[orgSlug]/[certId]`; certs list; Settings → Warranty Certificate; order detail integration via `OrderWarrantyDialog`
- **Haraka Orders** — full implementation (orders list, new order, detail, status stepper, payment recording, delivery agent assignment, invoice/receipt document preview + PDF download)
- **Delivery Agent App** — public token page at `app/delivery/[token]/page.tsx`; API routes for token lookup, status advance, payment recording
- **Superadmin i18n** — all 8 superadmin pages migrated from hardcoded English to `useT()` with ~90 new EN/AR keys
- **Superadmin bug fixes** — layout, leads, lists, audit-logs, subscription, profile, sync, support ticket pages

---

## How to use this file

1. **After pulling**: Read this file first. Pick the top unchecked item.
2. **When starting a feature**: Create a `*_TODO.md` doc in `/docs` with a detailed checklist.
3. **When finishing a feature**: Move it to "Recently completed" here.
4. **When adding new planned work**: Add it under the appropriate priority section.
