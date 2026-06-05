# Makhzoon — Work Backlog

> **Start here after every pull.** This file lists everything that is planned but not yet built, in priority order. Each item links to the detailed plan/TODO doc.

---

## 🟡 Planned — lower priority

### 2. Haraka Orders — Delivery Agent App (public token page)
The delivery token system is partially built in the orders backend (`deliveryToken` field on orders). The public-facing page for delivery agents needs to be built:
- `app/delivery/[token]/page.tsx` — no auth, shows order details, lets agent advance status and record payments from their phone

### 3. Haraka Orders — Invoice / Receipt Document generation
Invoice and receipt document rendering for orders (currently the UI has Invoice/Receipt buttons in the order detail header that open `OrderDocumentDialog`, but the full document renderer + PDF export path may not be complete). Check `components/haraka/OrderDocumentDialog.tsx`.

---

## ✅ Recently completed

- Haraka Orders system — full implementation (orders list, new order, detail, status stepper, payment recording, delivery agent assignment)
- Managed Lists — `order_status`, `order_channel`, `order_payment_method` list keys
- Permissions — `pos.view_orders`, `pos.manage_orders`, `pos.assign_delivery`, `pos.manage_delivery_agents`
- Cash Drawer — ESC/POS `kickDrawer` command, `openCashDrawer()`, backend config API, `CashDrawerButton`, Settings → Cash Drawer page, auto-open on cash sale in register
- Card Terminal Integration — 4 modes (display, local bridge, cloud, webhook), `CardTerminalPayment` component, polling, Settings → Card Terminal page, PaymentDialog integration, webhook receiver with HMAC
- Warranty Certificates — `haraka_warranty_certs` table, `WarrantyCertPreview` (A4/thermal/certificate templates, EN/AR), `WarrantyCertShareDialog`, public cert page at `/w/[orgSlug]/[certId]`, certs list page, Settings → Warranty Certificate page, order detail integration via `OrderWarrantyDialog`
- Notifications System — `notifications`, `notification_preferences`, `notification_org_defaults` tables; `notificationQueue.enqueue()` (service-layer fanout pattern); bell icon in AppHeader; NotificationPanel; full list page; user preferences settings; wired into orders, transactions, inventory, and Fawtara services; 19 event types across all modules
- Context.md — fully updated to reflect current platform state (June 2026)
- Docs — `docs/modules-and-features/` files 19–23

---

## How to use this file

1. **After pulling**: Read this file first. Pick the top unchecked item.
2. **When starting a feature**: Open its `*_TODO.md` doc — it has a detailed checklist.
3. **When finishing a feature**: Move it to "Recently completed" here.
4. **When adding new planned work**: Add it here with a link to its plan docs.
