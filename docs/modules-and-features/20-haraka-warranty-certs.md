# Haraka — Warranty Certificates (شهادات الضمان)

**Parent module**: Haraka (حركة) — Feature key: `pos`
**Brand color**: `#C2185B` (inherited from Haraka)

---

## Overview

Warranty Certificates are customer-facing documents generated from an order (or a POS transaction). They prove the customer's warranty coverage for purchased items, and are designed to be treated exactly like receipts and invoices: printable on thermal or A4 paper, shareable via WhatsApp/email/link, downloadable as PDF/PNG, and fully customizable through org settings.

This is **distinct** from the existing Usool Warranties module (which tracks vendor warranties on assets and inventory items). Warranty Certificates are customer-facing documents issued by the business to its customers.

---

## Data Models

### HarakaWarrantyCert
```
id, organizationId, spaceId
warrantyNumber              ← sequential, e.g. WRT-000001

sourceType: 'order' | 'pos_transaction'
orderId?                    ← FK → haraka_orders
transactionId?              ← FK → pos_transactions

customerName, customerPhone?

items: WarrantyCertItem[]   ← snapshot of covered items at generation time
  inventoryItemId, inventoryItemName, sku?, quantity, unitPrice

warrantyStartDate           ← date (usually the order/transaction date)
warrantyEndDate             ← date (start + configured duration, or manual)
notes?                      ← custom terms for this specific certificate

createdAt, createdBy, updatedAt, updatedBy
```

### HarakaWarrantyConfig (per org, stored in org settings)
```
organizationId
defaultDurationDays         ← e.g. 180 for 6 months; applied when generating a cert
termsText                   ← warranty terms in English
termsTextAr                 ← warranty terms in Arabic
headerText, headerTextAr    ← custom header line below org name
footerText, footerTextAr    ← footer / disclaimer
showLogo                    ← bool
showQr                      ← bool (QR → public cert link)
language: 'en' | 'ar' | 'both'
accentColor                 ← hex
template: 'thermal-58' | 'thermal-80' | 'a4-modern' | 'a4-certificate'
```

---

## Certificate Template

A dedicated `WarrantyCertPreview` component renders the certificate. It shares the same infrastructure as `ReceiptPreview` (same template IDs, same language switching, same RTL support) but with certificate-specific content:

- Org name + logo
- "WARRANTY CERTIFICATE" heading (bilingual)
- Customer name + phone
- Certificate number + issue date
- Covered items table (name, qty, unit price)
- Warranty period: start date → end date
- Terms & conditions block
- Footer text
- QR code linking to the public certificate URL

---

## Sharing & Printing

Mirrors the receipt system exactly:

| Action | Mechanism |
|--------|-----------|
| Share link | Public URL at `/w/[orgSlug]/[certId]` |
| Copy link | Clipboard API |
| WhatsApp | `https://wa.me/?text=...` |
| Email | `mailto:?subject=...&body=...` |
| Download PDF | Open public URL with `?download=1` |
| Download PNG/JPG | `html-to-image` (same as ReceiptShareDialog) |
| Thermal print | ESC/POS via WebUSB (same transport as receipt printing) |

---

## Integration with Orders

The generate-warranty action lives inside the **order detail page** (`/haraka/orders/[orderId]`):

- A "Generate Warranty" button appears in the order detail header (gated by `pos.manage_warranty_certs`).
- If a certificate already exists for the order, the button becomes "View Warranty" with a badge.
- Clicking "Generate" opens a small dialog to confirm the warranty period (pre-filled with `defaultDurationDays` from config), then creates the certificate and immediately opens `WarrantyCertShareDialog`.

The same flow can also be triggered from a **POS transaction detail page** for backward compatibility with existing in-store sales.

---

## Pages & UI

### Warranty Certificates List
**Route**: `/{locale}/{orgSlug}/{space}/haraka/warranty-certs`

- Table: cert number, customer, source (order/transaction), items count, warranty period, issue date.
- Filters: date range.
- Row click → share dialog (no separate detail page needed).
- Gated by `pos.view_warranty_certs`.

### Warranty Certificate Settings
**Route**: `/{locale}/{orgSlug}/settings/warranty-cert`

- Same layout as `Settings → Receipt`.
- Live preview using `WarrantyCertPreview` with sample data.
- Fields: default duration (days), terms (EN + AR), header/footer (EN + AR), language, template, logo toggle, QR toggle, accent color.
- Org-scoped settings page.

### Public Certificate View
**Route**: `/w/[orgSlug]/[certId]`

- No auth required.
- Renders `WarrantyCertPreview` with real data.
- `?download=1` triggers browser print-to-PDF.

---

## Permissions

Two new operations added to the existing `pos` module.

| Key | Label | Admin | Staff |
|-----|-------|-------|-------|
| `pos.view_warranty_certs` | View Warranty Certificates | ✅ | ❌ |
| `pos.manage_warranty_certs` | Generate & Delete Warranties | ✅ | ❌ |

---

## Navigation

Warranty Certificates appears as a child item of the Haraka group in the sidebar, gated by `pos.view_warranty_certs`. The Settings page link is added to Settings → (org-scoped) alongside "Receipt".
