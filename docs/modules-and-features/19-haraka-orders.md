# Haraka — Orders (طلبات)

**Parent module**: Haraka (حركة) — Feature key: `pos`
**Brand color**: `#C2185B` (inherited from Haraka)

---

## Overview

The Orders sub-system handles orders received via off-channel sources — phone calls, WhatsApp, Instagram, Facebook, or any custom channel an org adds. Unlike the POS register (immediate in-person sales), orders go through a fulfillment lifecycle: they are registered, confirmed, assigned to a delivery or pickup agent, and finally marked delivered or picked up.

Key characteristics:
- Orders are tied to the Raseed inventory catalog for line items.
- Each order records who took the sale (a sales agent from org members) and who fulfills it (a delivery agent — either an org member or an external delivery person).
- Fulfillment is either **delivery** (with a delivery address) or **pickup** (no address required).
- Payment is tracked separately from the order creation — cash on delivery, bank transfer, card, or other.
- Order statuses, channels, and payment methods are managed through the platform's **Managed Lists** system, so orgs can relabel and recolor statuses and add custom channels.

---

## Data Models

### HarakaOrder
```
id, organizationId, spaceId
orderNumber                    ← sequential, e.g. ORD-000042
invoiceNumber?                 ← sequential, e.g. INV-2026-000001 (allocated on demand)
deliveryToken?                 ← unique capability token for public delivery page sharing

channel                        ← value from order_channel managed list
status                         ← value from order_status managed list
fulfillmentType: 'delivery' | 'pickup'

customerId?                    ← FK → pos_customers (optional)
customerName, customerPhone?

deliveryAddress?               ← { street, area, city, notes } — delivery only

items: OrderLineItem[]
  inventoryItemId, inventoryItemName, sku
  quantity, unitPrice, taxRate, taxAmount, discountAmount, lineTotal

subtotal, discountAmount, taxAmount, total

paymentStatus: 'unpaid' | 'partial' | 'paid'
amountPaid                     ← computed from sum of haraka_order_payments entries
paymentMethod?                 ← value from order_payment_method managed list

salesAgentId, salesAgentName   ← org member
deliveryAgentId?               ← FK → haraka_delivery_agents (external)
deliveryAgentMemberId?         ← org member acting as delivery agent
deliveryAgentName?

notes?, scheduledAt?
createdAt, createdBy, updatedAt, updatedBy
```

### HarakaOrderPayment
Individual payment entries for an order. An order accumulates payments over time until fully paid.
```
id, orderId, organizationId
amount
paymentMethod?    ← free-text (cash_on_delivery, bank_transfer, card, other, etc.)
note?             ← optional note (e.g. "Change given: 5 JOD")
paidAt            ← timestamptz (defaults to now)
createdAt, createdBy
```

`amountPaid` and `paymentStatus` on `haraka_orders` are recomputed after every insert/delete on this table.

### HarakaDeliveryAgent
External delivery people who are not necessarily org members.
```
id, organizationId
name, phone?, notes?
isActive
createdAt, createdBy, updatedAt, updatedBy
```

---

## Order Status Flow

Transitions are enforced server-side. Invalid moves return 400.

```
Delivery path:  new → confirmed → assigned → in_transit → delivered
Pickup path:    new → confirmed → assigned → ready_for_pickup → picked_up
Cancellation:   any state → cancelled
```

---

## Managed Lists

All three lists appear in **Settings → Lists** and **Superadmin → Lists** automatically.

**`order_status`** — `is_system = true`. Org can relabel/recolor/reorder; cannot add/remove values (they are code-linked to the status flow).

**`order_channel`** — `is_system = false` (free list). Org can add custom channels (e.g. TikTok, Walk-in).

**`order_payment_method`** — `is_system = true`. Values are code-locked.

---

## Pages & UI

### Orders List
**Route**: `/{locale}/{orgSlug}/{space}/haraka/orders`

- Table: order number, customer, channel badge, status badge, fulfillment type, total, payment status, sales agent, created at.
- Filters: status, channel, agent, date range.
- "New Order" action button.
- Gated by `pos.view_orders`.

### New Order
**Route**: `/{locale}/{orgSlug}/{space}/haraka/orders/new`

Form fields: channel, fulfillment type toggle, customer picker (existing or ad-hoc name + phone), delivery address (delivery only), items from Raseed catalog, sales agent (org members), delivery agent (`DeliveryAgentPicker`), payment method, scheduled at, notes.

Gated by `pos.manage_orders`.

### Order Detail
**Route**: `/{locale}/{orgSlug}/{space}/haraka/orders/[orderId]`

Sections:
- **Status stepper** — visual progress bar. "Advance" button or manual status select.
- **Fulfillment info** — type, delivery address, scheduled time.
- **Agents** — sales agent, delivery agent with reassign (gated by `pos.assign_delivery`).
- **Items table** — line items, totals.
- **Payment panel** — status badge, amount paid. Lists all `HarakaOrderPayment` entries with add / delete per entry. `amountPaid` and `paymentStatus` recalculate after each change.
- **Invoice** — "Generate Invoice" button allocates a sequential `INV-YYYY-NNNNNN` invoice number and renders a printable/downloadable A4 invoice via the order document template.
- **Delivery share** — "Share Delivery Link" generates (or returns existing) `deliveryToken` and copies the public URL `/delivery/[token]` to clipboard. The link can be sent to a delivery agent.
- **Customer info**, notes.

---

## Invoice Generation

**API**: `POST /api/haraka/orders/[orderId]/invoice`

Allocates (or returns existing) a sequential invoice number for an order.

- Format: `INV-YYYY-NNNNNN` (per org, per calendar year — resets each year)
- Counter stored in `haraka_invoice_counters(organization_id, year, last_sequence)`
- Once allocated, the number never changes for that order
- The `GET` variant of the same endpoint returns the full order + org config for document rendering (no auth — public document link)
- The rendered document is an A4 template configured via **Settings → Order Documents**

---

## Delivery Token / Public Delivery Page

**API**: `POST /api/haraka/orders/[orderId]/delivery-token`

Generates (or returns existing) a `deliveryToken` — a capability key stored on the order. Possession of the token grants access to the public delivery page; no authentication is required.

**Public Delivery Page**: `/delivery/[token]` (no auth)

This is a mobile-optimised page designed for delivery agents. It shows:
- Order status with colored badge
- "Mark as [Next Status]" primary action button — advances the status to the next step
- Customer name, phone (tap-to-call), delivery address
- Collapsible items list with total
- Payment section — lists recorded payment entries; "Record Payment" form to add a new entry (amount, method, note)
- Remaining balance when partially paid
- Order notes

Payment methods on this page: Cash on Delivery, Bank Transfer, Card, Other.

The page is intentionally minimal and inline-styled for maximum compatibility (no Next.js layout, no Tailwind build required).

---

## Permissions

All new permissions sit inside the existing `pos` module and appear in the Users → role editor automatically.

| Key | Label | Admin | Staff |
|-----|-------|-------|-------|
| `pos.view_orders` | View Orders | ✅ | ❌ |
| `pos.manage_orders` | Create & Update Orders | ✅ | ❌ |
| `pos.assign_delivery` | Assign Delivery Agent | ✅ | ❌ |
| `pos.manage_delivery_agents` | Manage Delivery Agents | ✅ | ❌ |

---

## Navigation

Orders appears as a child item of the Haraka group in the sidebar, gated by `pos.view_orders`.
