# Makhzoon — Work Backlog

> **Start here after every pull.** This file lists everything planned but not yet built, in priority order.

---

## 🟡 Planned — not yet built

### 1. Banna — WorkspaceProfile
`WorkspaceProfile` is exported from `lib/modules/banna/types/index.ts` as a placeholder (`id`, `organizationId`, `spaceId`) but is not used anywhere yet. Flesh it out when the workspace-level config concept is defined.

### 3. Banna — Phase 1: Foundation
Prerequisites: items 1 & 2 above must be done first.
- Flesh out `WorkspaceProfile` (business type, industry, size, use cases) — DB migration + service + API
- Banna overview becomes a real dashboard: active modules, profile completeness, quick actions
- Module visibility panel: owner sees which modules are on/off within their subscription
- Self-service module activation: owners can toggle on modules already in `subscription.features`; locked modules shown as "available to upgrade"
- Industry-based custom field templates (pre-built sets for retail, logistics, school, clinic, etc.) — one-click apply

### 4. Banna — Phase 2: Guided Setup Wizard (no AI)
- Step-by-step form wizard: business type → module selection → custom field template → done
- Onboarding trigger: shown to new spaces before any configuration exists
- Re-runnable from Banna overview ("Reconfigure workspace")

### 5. Banna — Phase 3: AI Wizard (Claude API)
- Conversational setup flow using Claude API
- Open-ended interview ("I run a small electronics shop with 3 branches") → auto-configure
- AI-generated custom field suggestions based on business type + existing usage
- Ongoing recommendations surfaced in Banna overview

### 7. Haraka — Card Terminal: live sandbox verification
Paymob, SumUp, and Square providers are fully wired (Paymob 4-step auth/order/payment_key/pay flow fixed). End-to-end verification against each provider's live sandbox still needs real API credentials and a physical terminal.

---

## ✅ Recently completed

- **Haraka — POS camera barcode scanner** — `CameraScannerDialog` (native `BarcodeDetector` API, no new dependency) + opt-in `enableCamera` prop on the shared `BarcodeInput`; camera button renders only when the device supports it, feeds the same `onResolve` path, and surfaces distinct errors for unsupported / permission-denied / no-camera / timeout. Wired into the POS register; `Permissions-Policy` updated to `camera=(self)`; EN/AR strings added.
- **Banna feature flag** — migration `0030_banna_feature_flag.sql` backfills `banna: true` into all existing packages so the nav item shows without manual superadmin toggle
- **Banna — Custom field values (full stack)** — migration `0029_banna_field_values.sql`, `custom_field_values` repository/service/API already implemented; `CustomFieldValuesSection` added to asset, inventory, and request detail pages; request detail page (`requests/[requestId]/page.tsx`) created with approve/reject actions
- **Notifications — email + web push delivery** — Resend (email) was already wired; web push added: `web_push_subscriptions` table (migration `0031`), VAPID-based `sendWebPush()` lib, subscribe/unsubscribe API (`/api/push-subscriptions`), service worker (`public/sw.js`), "Enable browser push notifications" toggle in notification settings; push fired for all recipients on every notification event
- **Superadmin — audit log improvements** — CSV export (`/api/audit-logs/export`) and full filtering (org, user, action, date range) already implemented
- **Haraka — Paymob 4-step flow** — corrected `initiateCharge` to fetch payment key via `/acceptance/payment_keys` before calling `/acceptance/payments/pay` (previously used auth token as payment token, which is invalid)
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
