# Makhzoon — Flutter Tablet App Build Guide

**Goal:** build a native Flutter app (Android-first, iPad-capable) that delivers the Makhzoon
platform on tablets — with the **Haraka POS** as the flagship experience, including **receipt
printer / cash-drawer hardware support** that a browser cannot provide.

**Strategy:** the existing Next.js + Supabase backend stays exactly as it is. The Flutter app is a
**pure API client** — no direct Supabase access from the app, no service keys, no business logic
duplication. Everything the web app can do, it does through `/api/*` routes; the Flutter app calls
the same routes.

> **The API contract is `postman/Makhzoon_API.postman_collection.json`** — 264 endpoints, all
> JSON-in/JSON-out, all JWT-authenticated. Import it into Postman and treat it as the single source
> of truth while building. This document explains everything the collection cannot: auth flow,
> conventions, module priorities, hardware, and phasing.

---

## 1. Backend facts the app must respect

| Fact | Detail |
|---|---|
| Environments | dev `https://dev.makhzoon.me` · staging `https://stg.makhzoon.me` · prod `https://app.makhzoon.me` |
| ⚠ Dev gating | The dev environment sits behind **Cloudflare Access (Zero-Trust)**. A mobile client needs a CF Access **service token** (send `CF-Access-Client-Id` / `CF-Access-Client-Secret` headers) or a bypass rule for the app's traffic. Staging/prod policy may differ — verify before pointing builds at each env. |
| Auth | Supabase JWT. **`POST /api/auth/token`** with `{"email","password"}` → `{accessToken, refreshToken, expiresAt}`. Refresh with `{"refreshToken"}` to the same endpoint. Send `Authorization: Bearer <accessToken>` on **every** request — all routes accept it (server re-reads role/org from DB on each request, so permission changes apply without re-login). |
| Token lifetime | Access-token TTL is the Supabase project JWT-expiry setting (target: 43200 s = 12 h). Refresh before expiry; on 401, refresh once and retry. |
| Multi-tenancy | Every user belongs to one organization. Org context is derived server-side from the JWT — never send an org id. **Spaces** (sub-scopes like branches) are selected per-request with the **`x-space-slug: <slug>`** header; omit it for org-wide screens. `GET /api/spaces?scope=accessible` lists what the user may open. |
| Roles | `super_admin`, `makhzoon_admin`, `makhzoon_support` (platform) · `org_owner`, `admin`, `staff` (org). The tablet app targets the **org** roles; platform/superadmin screens stay web-only. |
| Permissions | `GET /api/auth/me` returns role + granular per-module/per-space permissions. Staff can be restricted per module (e.g. POS-only cashier). Hide navigation the user lacks; the server enforces regardless. |
| Feature gating | The org's subscription (`GET /api/organizations/self`) carries feature flags: `dashboard, assets, inventory, requests, support, auditLogs, reports, pos, banna`. A tablet build must honor them (e.g. no POS tab if `pos:false`). |
| Localization | Full EN + AR with RTL. Mirror `locales/messages.ts` keys into ARB files; Flutter's `Directionality` handles RTL. |
| Errors | Non-2xx responses are `{"error": ...}` JSON. 401 = refresh/re-login, 403 = permission, 422 = validation (zod flatten shape). |
| Rate limits | Login and some mutating endpoints are rate-limited per IP; back off on 429. |

---

## 2. Recommended Flutter stack

| Concern | Package | Notes |
|---|---|---|
| HTTP | `dio` | Interceptors for bearer header, 401→refresh→retry, `x-space-slug`, logging |
| State | `riverpod` (or `bloc`) | Keep POS cart state in a dedicated notifier |
| Models | `freezed` + `json_serializable` | Generate from the Postman examples |
| Routing | `go_router` | Auth guard + feature-flag guard on routes |
| Secure storage | `flutter_secure_storage` | access/refresh tokens ONLY here, never SharedPreferences |
| Local cache/offline | `drift` (SQLite) | Catalog, customers, tax rates, receipt config |
| i18n | `flutter_localizations` + `intl` | EN + AR (RTL) |
| Printing (thermal) | `flutter_pos_printer_platform` or `print_bluetooth_thermal` + `esc_pos_utils_plus` | See §5 |
| Built-in printer devices | Sunmi: `sunmi_printer_plus` · iMin: `imin_printer` | If you buy POS tablets with integrated printers |
| PDF fallback | `printing` + `pdf` | A4 invoices via the OS print dialog |
| Barcode scanning | `mobile_scanner` | Inventory `GET /api/inventory/by-barcode?barcode=…` |
| Env/flavors | `--dart-define-from-file` | `dev.json` / `stg.json` / `prod.json` with `API_BASE_URL` (+ CF Access token for dev) |

Project layout (feature-first):

```
lib/
  core/        api client, auth session, env, errors, printers/
  features/
    auth/      login, org bootstrap, space picker
    pos/       sessions, catalog, cart, checkout, receipts, drawer
    inventory/ items, stock in/out, purchases, audits, barcode
    assets/    register, detail, checkout/checkin, maintenance
    requests/  approvals
    reports/   dashboards
    settings/  profile, printer setup, language
  l10n/        ARB files (en, ar)
```

---

## 3. Auth & session skeleton

1. **Login screen** → `POST /api/auth/token` `{email, password}`.
2. Store `accessToken`/`refreshToken` in secure storage; schedule refresh ~5 min before `expiresAt`.
3. Bootstrap: `GET /api/auth/me` (role, permissions) → `GET /api/organizations/self` (org, subscription features) → `GET /api/spaces?scope=accessible`.
4. One space → auto-select; several → space picker; persist last selection per user.
5. Dio interceptor adds `Authorization` + `x-space-slug` (when a space-scoped feature is active).
6. On 401: single-flight refresh; if refresh fails → wipe tokens → login screen.

**Never** embed Supabase keys of any kind in the app. The app talks only to `/api/*`.

---

## 4. POS (Haraka) — the core tablet flow

All endpoints below are in the Postman collection under *Haraka / POS*.

### 4.1 Session lifecycle
- Open: `POST /api/haraka/sessions` (opening float). One open session per cashier — enforced
  atomically server-side; surface the `OPEN_SESSION_EXISTS` error nicely.
- Current/detail: `GET /api/haraka/sessions?status=open`, `GET /api/haraka/sessions/{id}`.
- Close: `POST /api/haraka/sessions/{id}/close` (counted cash → over/short) → print Z-report.

### 4.2 Catalog & cart
- Sellables: `GET /api/haraka/services` (service catalog, categories are org-managed lists) and
  `GET /api/inventory?posEnabled=true` (retail items with `posPrice`).
- Tax: `GET /api/haraka/tax-rates`. Prices/taxes are recomputed **server-side** on checkout — the
  cart's math is display-only; the server's transaction response is authoritative.
- Customers (optional): `GET/POST /api/haraka/customers`.

### 4.3 Checkout
- `POST /api/haraka/transactions` with items + payment method + session id.
  - **Receipt numbers are allocated atomically on the server** (migration 0047). Never generate
    or predict them client-side.
  - Stock for POS-enabled items is decremented server-side in the same call.
- Void/refund: `POST /api/haraka/transactions/{id}/void` / `.../refund` (admin-gated).
- Service jobs / retainers / orders / delivery flows exist too — phase them in after plain sales.

### 4.4 Card payments
Card terminals are **cloud integrations** (Paymob, Square, SumUp — `card-terminal-config`), not
app-attached hardware:
1. `POST /api/haraka/card-charges` → creates a charge with a `reference`, pushes to the terminal.
2. Poll `GET /api/haraka/card-charges/{ref}/status` (2–3 s interval, ~90 s timeout).
3. The provider's webhook (`card-payment-result`, HMAC-verified) flips the status server-side.
4. On `approved` → finalize the transaction with payment method `card`.
The tablet never talks to the card terminal directly — keep it that way.

### 4.5 Receipt data
- `GET /api/organizations/receipt-config` → header/footer, logo, VAT fields, etc.
- A web receipt page exists (`/r/{orgSlug}/{receiptId}`) — keep it as the QR/share fallback on
  printed receipts.

---

## 5. Printers & cash drawer (the reason this app exists)

### 5.1 Supported hardware targets
| Type | Connection | Notes |
|---|---|---|
| 80 mm ESC/POS thermal (Epson TM-T20/T88, Xprinter, Rongta, Goojprt…) | **Bluetooth Classic (SPP)**, **USB-OTG**, **LAN/Wi-Fi (TCP 9100)** | The default. ESC/POS is a de-facto standard byte protocol. |
| POS tablets with built-in printers (Sunmi T2/V2, iMin) | Internal | Vendor SDK plugins; nice single-device setup. |
| Cash drawer | RJ11 into the printer | Opened by sending the printer the "kick" pulse `ESC p 0 25 250` (`0x1B 0x70 0x00 0x19 0xFA`). |
| A4/laser (invoices) | OS print services | Use the `printing` package → native print dialog. |

### 5.2 Implementation plan
1. **Printer abstraction** in `core/printers/`:
   ```dart
   abstract class ReceiptPrinter {
     Future<void> connect();
     Future<void> printReceipt(ReceiptData data);   // built with esc_pos_utils_plus
     Future<void> openDrawer();                      // ESC p kick
     Future<void> printZReport(SessionSummary s);
   }
   // Implementations: BluetoothEscPosPrinter, NetworkEscPosPrinter (TCP :9100),
   // UsbEscPosPrinter, SunmiPrinter, IminPrinter
   ```
2. **Settings → Printers** screen: scan/pair (Bluetooth), enter IP (network), test print, choose
   paper width (58/80 mm), toggle "auto-print on sale", "open drawer on cash".
3. **Receipt layout** from `receipt-config` + the transaction response: logo (raster), org header,
   items/qty/price, tax breakdown, total, payment method, receipt number, QR of the web receipt
   URL, footer. Arabic: render RTL text to raster (image) lines — most ESC/POS firmwares cannot
   shape Arabic natively.
4. **Cash flow hooks**: on cash sale → print + kick drawer; on session close → Z-report.
5. **Resilience**: print queue with retry; a failed print must never lose the sale (the
   transaction is already committed server-side — offer "Reprint").

### 5.3 Android specifics
- Bluetooth: `BLUETOOTH_CONNECT`/`BLUETOOTH_SCAN` runtime permissions (API 31+).
- USB: OTG + `UsbManager` permission dialog (the plugin handles it).
- Network printing needs no permission beyond INTERNET.
- iPad: Bluetooth SPP is not available to third-party apps — on iOS support **network/AirPrint
  printers and MFi/vendor-SDK printers only**. Ship Android-first for POS hardware.

---

## 6. Other modules (phase after POS)

| Module | Key endpoints | Tablet notes |
|---|---|---|
| Dashboard | `/api/assets?pageSize=1` counts, `/api/reports` | Read-only cards |
| Assets (Usool) | `/api/assets` CRUD, `{id}/checkout`, `{id}/maintenance`, `{id}/qr` | QR scan → asset detail is a great tablet flow |
| Inventory | `/api/inventory`, `by-barcode`, `{id}/transactions`, `purchases`, `stock-audits` | Barcode-driven stock-in/out; stock audits with the camera |
| Requests | `/api/requests`, `{id}/approve`, `{id}/reject` | Manager approvals |
| Warranties | `/api/warranties`, `active-ids` | Read-mostly |
| Notifications | `/api/notifications`, `unread-count`, `read-all` | Poll or FCM later; web-push config exists server-side |
| Support | `/api/support` tickets | Optional |

Exports (`/export` endpoints) return **.xlsx** files — download with dio to a temp file and hand to
`share_plus` / `open_filex`.

---

## 7. Offline policy

**v1: online-required for writes, cached reads.**
- Cache catalog (services, tax rates, POS items), customers, and receipt-config in drift; serve
  screens instantly and refresh in the background.
- Do **not** queue offline sales in v1: receipt numbers, stock decrements, and session integrity
  are all server-atomic (migration 0047) — an offline queue would fork those invariants.
- v2 (only if field demand is real): offline sales queue with client UUIDs, server-side idempotent
  replay, and *provisional* receipt slips clearly marked "OFFLINE — final number on sync".

---

## 8. Delivery phases

| Phase | Scope | Exit criteria |
|---|---|---|
| **0. Foundation** (1–2 wk) | Flavors, dio + auth/refresh interceptors, secure storage, login, org/space bootstrap, l10n scaffolding, error toasts | Log in on dev, see role-correct empty shell in EN/AR |
| **1. POS core** (2–3 wk) | Sessions, catalog, cart, cash checkout, receipt screen, void | Cash sale end-to-end against dev |
| **2. Printing** (1–2 wk) | Printer abstraction, BT + LAN ESC/POS, receipt + Z-report layouts, drawer kick, printer settings | Physical 80 mm receipt with Arabic rendering + drawer opens |
| **3. Card + extras** (1–2 wk) | Card-charge polling flow, customers, refunds, delivery/service-job basics | Card sale approved via terminal sandbox |
| **4. Ops modules** (2–3 wk) | Inventory + barcode, assets + QR, requests, notifications | Staff daily flows usable |
| **5. Hardening** | Offline caches, crash reporting (Sentry), analytics, Play Store internal track, MDM/kiosk guidance | Pilot org running on real hardware |

---

## 9. Security checklist

- Tokens only in `flutter_secure_storage`; wipe on logout/refresh-failure.
- No Supabase URL/keys, no service roles, no direct DB — API only.
- Respect server 403s; client-side gating is UX, not security.
- Consider TLS certificate pinning for prod (`dio` `badCertificateCallback`/fingerprint check).
- Screen-lock/PIN re-entry for POS after inactivity (cash drawer proximity).
- Kiosk mode for dedicated POS tablets: Android managed/dedicated device (screen pinning at minimum).

---

## 10. Open questions to settle before Phase 0

1. **Repo**: separate `makhzoon-flutter` repo (recommended) or `/mobile` folder here?
2. **Cloudflare Access on dev**: issue a service token for the app, or exempt a test path?
3. **Hardware**: which printer models/tablets will pilot orgs actually use? (Buy 1 Sunmi + 1 generic
   BT 80 mm printer for the test bench.)
4. **iPad**: required for v1, or Android-only until POS hardware strategy is proven?
5. **Push**: FCM for notifications in v1, or polling?
