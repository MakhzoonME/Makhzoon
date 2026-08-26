# Haraka — Point of Sale (حركة)

**Brand color**: `#C2185B` (deep pink/crimson)
**Arabic name**: حركة
**Feature key**: `pos`

---

## Overview

Haraka is a full point-of-sale module. It supports cashier sessions, product scanning (barcode or manual search), multi-payment methods (cash, card, other), discounts, tax rates, refunds, voids, customer tracking, receipt printing, and optional integration with Jordan's **Fawtara** (ISTD e-invoicing) system.

> Scope note: this doc covers the original register/session/customer/transaction workflow. Haraka has since grown substantially beyond what's documented here — Orders, Service Jobs, Retainers, Appointments, Delivery Agents/Staff, Service Vehicles, Warranty Certificates, Loyalty, and till/discount-approval flows all now live under `haraka.*` permissions and `/haraka/*` routes (see `supabase/migrations/0017`, `0034`, `0035`, `0038`, `0053`, `0056`, `0059`, `0060`, `0070`, and `types/user-permissions.types.ts`). None of that is described below; treat this doc as covering only the register/POS core.

---

## Data Models

### PosSession
```
id, organizationId, spaceId (= locationId)
cashierId, cashierName
status: 'open' | 'closed'
openedAt, closedAt?
openingFloat, closingFloat?, expectedFloat?, discrepancy?
```

### PosTransaction
```
id, organizationId, sessionId, locationId (spaceId)
cashierId, cashierName
customerId?, customerName?
items: PosLineItem[]
  inventoryItemId, itemName, sku, barcode
  quantity, unitPrice, taxRateId, taxRate, taxAmount
  discountAmount, lineTotal
subtotal, taxAmount, discountAmount, total
payments: PosPayment[]  ← method: 'cash'|'card'|'other', amount, reference, cardLast4?
change (cash overpay)
status: 'completed' | 'refunded' | 'voided'
receiptNumber, offlineId
parentTransactionId? (set on refunds)
fawtara?: FawtaraSubmission
```

### PosCustomer
```
id, organizationId, spaceId
name, phone?, email?, taxNumber?, notes?
```

### PosConfig (per org)
```
taxRates, defaultTaxRateId
receiptHeader?, receiptFooter?
allowDiscounts, maxDiscountPercent, requireManagerOverride
currency, currencySymbol
```

---

## Pages & UI

### Overview Page
**Route**: `/{locale}/{orgSlug}/{space}/haraka`

- Metric cards: open sessions today, total sales today, total revenue today.
- Quick-action: "Open Register" button (opens a new session).
- Links to Sessions, Customers, Reports.

### Register (POS Screen)
**Route**: `/{locale}/{orgSlug}/{space}/haraka/register`

The main selling interface. Opens a new session (or resumes an existing open one).

**Layout** (two-panel on desktop, single-panel on mobile):

**Left panel — Cart**:
- Cart line items: product name, qty, unit price, discount, line total.
- Qty +/- buttons and delete per line.
- Discount field per line (if `haraka.applyDiscount` permission granted).
- Cart footer: subtotal, tax, total discount, **Grand Total**.
- Customer picker (search or create new customer inline) — optional.
- **Charge** button → opens Payment Dialog.

**Right panel — Product Grid**:
- Search bar (name, SKU, or barcode scan input — barcode scanner sends keystrokes then Enter).
- Category filter tabs across the top.
- `ProductGrid` component: shows inventory items with `posEnabled = true` as cards with photo (if present), name, price, stock badge.
- Clicking a card adds the item to the cart.

**Payment Dialog** (`components/haraka/PaymentDialog.tsx`):
- Shows grand total.
- Payment method tabs: Cash, Card, Other (split payment: add multiple payment rows summing to total).
- Cash: enter amount received → shows change due.
- Card: amount field + optional last-4-digits field.
- Other: amount + reference field.
- **Complete Sale** button creates the transaction, decrements inventory, and opens receipt.

**Receipt**:
- Printable receipt view rendered after sale completion.
- Shows: receipt number, date, cashier, customer (if selected), line items, totals, payments, change.
- Receipt header/footer from `PosConfig`.
- Print button triggers `window.print()` (thermal printer-compatible layout via CSS `@media print`).
- If Fawtara is enabled and configured, the Fawtara QR payload is shown as a QR code on the receipt.

**Session close flow**:
- "Close Session" button in the register header.
- Enter closing float (actual cash in drawer).
- System shows expected float (opening float + cash sales) and discrepancy.
- Confirm close → session marked `closed`.

### Sessions
**Route**: `/{locale}/{orgSlug}/{space}/haraka/sessions`

Lists all POS sessions with columns: Cashier, Opened At, Closed At, Status badge, Opening Float, Closing Float, Discrepancy, Actions.

**Session Detail**:
**Route**: `/{locale}/{orgSlug}/{space}/haraka/sessions/[sessionId]`

- Session summary header (cashier, dates, floats, discrepancy).
- Transactions table: receipt number, customer, items count, total, payment method, status, Fawtara status, time.
- Filter by status.

**New Session**:
**Route**: `/{locale}/{orgSlug}/{space}/haraka/sessions/new`

- Enter opening float.
- Submit → creates session and redirects to the Register.

### Customers
**Route**: `/{locale}/{orgSlug}/{space}/haraka/customers`

Lists all POS customers with columns: Name, Phone, Email, Tax Number, Created At, Actions.

Gated by `haraka.customersView` permission.

Bulk actions: delete, move to space, duplicate to space. See Known Issues — no dedicated permission keys back these bulk actions.

**Customer Detail / Edit**:
**Route**: `/{locale}/{orgSlug}/{space}/haraka/customers/[customerId]`

- Edit form: Name, Phone, Email, Tax Number (for Fawtara B2B), Notes.
- Transaction history for this customer.

**New Customer**:
**Route**: `/{locale}/{orgSlug}/{space}/haraka/customers/new`

- Same form as edit.

### Transactions
**Route**: `/{locale}/{orgSlug}/{space}/haraka/transactions`

A cross-session view of all POS transactions for this space, gated by `haraka.transactionsView`.

**Layout**:
- Summary stat cards for today: Total Revenue, Transaction Count, Average Basket, Top Payment Method.
- Status filter: All / Completed / Refunded / Voided.
- `DataTable` with columns: Receipt No., Customer, Items, Total, Payment Method, Status badge, Cashier, Time.
- Row click → Transaction Detail page.

**Transaction Detail**:
**Route**: `/{locale}/{orgSlug}/{space}/haraka/transactions/[transactionId]`

- Full transaction breakdown: line items, payments, totals, tax, discount, change.
- Status badge + refund/void actions if applicable.
- Fawtara submission status.
- Receipt share/print buttons.

### Reports
**Route**: `/{locale}/{orgSlug}/{space}/haraka/reports`

Gated by `haraka.posReportView` permission.

- Date range picker.
- Summary cards: total revenue, total transactions, average basket, total tax collected, total discounts.
- Revenue by payment method breakdown (cash vs card vs other).
- Top-selling items table.
- Sales by cashier table.
- Sales timeline chart (daily/weekly).

---

## Fawtara (Jordan ISTD E-Invoicing)

Fawtara is Jordan's electronic invoicing mandate (ISTD). When enabled in org settings:

- Each completed POS transaction is submitted to the Fawtara API.
- `FawtaraSubmission` is stored on the transaction: `status` (pending / submitted / failed / skipped), `uuid`, `qrPayload`, `invoiceNumber`, `errorCode`.
- The Fawtara QR payload is printed on the receipt.
- Failed submissions can be manually resubmitted (gated by `haraka.transactionsView` permission — see Known Issues).

**Fawtara config lives in Settings → Jo-Fotara** (see Settings module doc).

---

## Printer & Receipt Settings

Accessible from the register toolbar (quick printer connect/disconnect) and fully from **Settings → Receipt** (`/{locale}/{orgSlug}/settings/receipt`).

- Thermal printer: WebUSB connect/disconnect, paper width (58mm / 80mm), font size, auto-print toggle.
- Receipt template, language (EN/AR/both), logo, header/footer text, accent color.
- Live preview via `ReceiptPreview` component.
- Settings stored in `store/printer.store.ts` (persisted to `localStorage`) for printer hardware; receipt visual settings persisted to `organization_configs` via `/api/organizations/receipt-config`.

---

## POS Cart Store

`store/pos-cart.store.ts` — Zustand store holding the in-progress cart:
- Line items array with product details and quantities.
- Selected customer.
- Discount state.
- Cleared on session close or tab refresh.

---

## Permissions

The permission keys below are wrong in earlier versions of this doc — there is no `pos.*` permission module. Haraka permissions live under a single `haraka` module key in `types/user-permissions.types.ts` (`featureKey: 'pos'`), and routes call `requirePermission(user, 'haraka', '<opKey>')`. The register/session/transaction-relevant subset:

| Key | Description |
|-----|-------------|
| `haraka.sessionsOpen` | Start a register session (requires `sessionsView`) |
| `haraka.sessionsCloseOwn` / `sessionsCloseOthers` | Close own / others' register sessions |
| `haraka.registerOpen` | Open the register screen |
| `haraka.chargeReceipt` | Complete a sale |
| `haraka.applyDiscount` | Apply line/cart discounts (requires `chargeReceipt`) |
| `haraka.approveDiscount` | Approve a discount via manager PIN |
| `haraka.transactionsRefund` | Issue a refund on a transaction |
| `haraka.transactionsVoid` | Void a completed transaction |
| `haraka.posReportView` / `posReportExport` | View / export POS reports |
| `haraka.customersView` / `customersCreate` / `customersUpdate` / `customersDelete` | Manage POS customers |
| `haraka.printerSettings` | Access printer settings |

There is no `pos.fawtara_submit` key — manual Fawtara resubmission (`app/api/jo-fotara/submit/[transactionId]/route.ts`) is gated by `haraka.transactionsView` instead. There are also no dedicated bulk-delete/move/duplicate permission keys for POS customers; the bulk actions section further up in this doc describing them is not backed by any permission op in the current catalog.

The `haraka` module has many more operations beyond this table (orders, service jobs, retainers, appointments, delivery agents, staff) — see the scope note at the top of this doc and `types/user-permissions.types.ts` for the full list.
