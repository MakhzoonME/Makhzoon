# Haraka Warranty Certificates — Implementation Plan

> Feature doc lives in `docs/modules-and-features/20-haraka-warranty-certs.md`.
> Pick up from here. Check off each item as it is completed.

---

## Status: ⬜ Not started

---

## Before you start — read these

- `docs/modules-and-features/20-haraka-warranty-certs.md` — full feature spec
- `docs/modules-and-features/19-haraka-orders.md` — orders system (warranty integrates here)
- `components/haraka/ReceiptShareDialog.tsx` — copy the share/print/download pattern exactly
- `components/settings/receipt/ReceiptPreview.tsx` — copy the template + ReceiptConfig pattern
- `app/r/[orgSlug]/[receiptId]/page.tsx` — copy for the public cert view at `/w/[orgSlug]/[certId]`
- `lib/modules/haraka/printing/receipt-template.ts` — thermal print pattern to reuse
- `lib/modules/haraka/orders/orders.repository.ts` — already-built orders backend to link from

---

## 1. Database

- [ ] `supabase/migrations/0018_haraka_warranty_certs.sql`
  - **`haraka_warranty_certs`** table:
    - `id`, `organization_id`, `space_id`
    - `warranty_number` text NOT NULL — sequential (e.g. `WRT-000001`)
    - `source_type` text CHECK IN ('order', 'pos_transaction')
    - `order_id` uuid REFERENCES `haraka_orders(id)` ON DELETE SET NULL (nullable)
    - `transaction_id` uuid REFERENCES `pos_transactions(id)` ON DELETE SET NULL (nullable)
    - `customer_name` text NOT NULL, `customer_phone` text
    - `items` jsonb NOT NULL DEFAULT '[]' — snapshot: `{ inventoryItemId, inventoryItemName, sku, quantity, unitPrice }`
    - `warranty_start_date` date NOT NULL
    - `warranty_end_date` date NOT NULL
    - `notes` text
    - `created_at`, `created_by`, `updated_at`, `updated_by`
  - **`haraka_warranty_counters`** table — same pattern as `haraka_order_counters`:
    - `organization_id`, `space_id`, `last_warranty_number`, PRIMARY KEY (org, space)
  - **`haraka_warranty_configs`** table — one row per org:
    - `organization_id` PRIMARY KEY
    - `default_duration_days` integer NOT NULL DEFAULT 180
    - `terms_text` text, `terms_text_ar` text
    - `header_text` text, `header_text_ar` text
    - `footer_text` text, `footer_text_ar` text
    - `show_logo` boolean DEFAULT true
    - `show_qr` boolean DEFAULT true
    - `language` text DEFAULT 'en' CHECK IN ('en', 'ar', 'both')
    - `template` text DEFAULT 'a4-modern'
    - `accent_color` text DEFAULT '#C2185B'
    - `updated_at`, `updated_by`
  - Indexes: `haraka_warranty_certs_org_idx`, `haraka_warranty_certs_order_idx`

---

## 2. Types

- [ ] `types/pos.types.ts` — add:
  - `WarrantyCertItem` — `{ inventoryItemId, inventoryItemName, sku, quantity, unitPrice }`
  - `WarrantyCertSourceType` — `'order' | 'pos_transaction'`
  - `HarakaWarrantyCert` — full interface (see feature doc)
  - `HarakaWarrantyConfig` — config interface (see feature doc)

- [ ] `types/user-permissions.types.ts` — add to `PosPermissions`:
  - `view_warranty_certs: boolean`
  - `manage_warranty_certs: boolean`
  - Update `DEFAULT_ADMIN_PERMISSIONS` (both → true)
  - Update `DEFAULT_STAFF_PERMISSIONS` (both → false)
  - Update `MODULE_PERMISSIONS_CONFIG` under `pos` group:
    - `{ key: 'view_warranty_certs', label: 'View Warranty Certificates', labelKey: 'permOp.pos.view_warranty_certs' }`
    - `{ key: 'manage_warranty_certs', label: 'Generate & Delete Warranties', labelKey: 'permOp.pos.manage_warranty_certs', requiresView: true }`

---

## 3. Backend

### Warranty Config

- [ ] `lib/modules/haraka/warranty-certs/schemas.ts`
  - `warrantyConfigSchema` — Zod schema for all config fields
  - `createWarrantyCertSchema` — `{ sourceType, orderId?, transactionId?, customerName, customerPhone?, items[], warrantyStartDate, warrantyEndDate, notes? }`

- [ ] `lib/modules/haraka/warranty-certs/warranty-certs.repository.ts`
  - `allocateWarrantyNumber(orgId, spaceId)` — same pattern as `allocateOrderNumber`
  - `getConfig(tenant)` — returns config row or defaults
  - `updateConfig(tenant, patch)`
  - `create(tenant, input)`
  - `list(tenant, opts)` — filter by orderId, transactionId, date range, page/pageSize
  - `getById(tenant, id)`
  - `delete(tenant, id)`
  - `findByOrderId(tenant, orderId)` — used by order detail to check if cert exists

- [ ] `lib/modules/haraka/warranty-certs/warranty-certs.service.ts`
  - `getConfig` — no permission gate (needed for public cert view)
  - `updateConfig` — gated by `settings.orgInfo`
  - `list` — gated by `pos.view_warranty_certs`
  - `getById` — no permission gate (public cert view must call this too)
  - `create` — gated by `pos.manage_warranty_certs`; validates order/transaction belongs to org; audit log
  - `delete` — gated by `pos.manage_warranty_certs`; audit log

- [ ] `app/api/haraka/warranty-certs/route.ts` — GET list, POST create
- [ ] `app/api/haraka/warranty-certs/[certId]/route.ts` — GET, DELETE
- [ ] `app/api/haraka/warranty-config/route.ts` — GET config, PATCH config

---

## 4. Certificate Template Component

- [ ] `components/haraka/WarrantyCertPreview.tsx`
  - Same props shape as `ReceiptPreview`: takes `config: WarrantyCertDisplayConfig` + `data: WarrantyCertData`
  - Templates to support: `thermal-58`, `thermal-80`, `a4-modern`, `a4-certificate` (new template — full-page certificate with decorative border)
  - Content sections:
    - Org name + logo (if `showLogo`)
    - "WARRANTY CERTIFICATE" / "شهادة ضمان" heading
    - Certificate number + issue date
    - Customer name + phone
    - Items table (name, qty, unit price)
    - Warranty period: start → end date
    - Terms & conditions block
    - Footer text
    - QR code (if `showQr`) → public URL `/w/[orgSlug]/[certId]`
  - Bilingual (EN/AR/both) — same `lang` prop pattern as `ReceiptPreview`
  - **Note**: the `a4-certificate` template is new — design it as a formal document with a bordered frame, org letterhead style, and signature line

---

## 5. Hooks

- [ ] `hooks/haraka/useWarrantyCerts.ts`
  - `useWarrantyCerts(params?)` — list with filters
  - `useWarrantyCert(id)` — single cert
  - `useWarrantyCertByOrder(orderId)` — check if an order already has a cert
  - `useCreateWarrantyCert()` — mutation
  - `useDeleteWarrantyCert()` — mutation

- [ ] `hooks/haraka/useWarrantyConfig.ts`
  - `useWarrantyConfig()` — GET config
  - `useUpdateWarrantyConfig()` — PATCH mutation

- [ ] `hooks/haraka/index.ts` — re-export all new hooks

---

## 6. Share Dialog

- [ ] `components/haraka/WarrantyCertShareDialog.tsx`
  - Copy `ReceiptShareDialog.tsx` and adapt for warranty certs
  - Props: `open`, `onOpenChange`, `cert: HarakaWarrantyCert | null`, `orgSlug`, `orgName`, `config: HarakaWarrantyConfig`
  - Public URL pattern: `/w/[orgSlug]/[certId]`
  - Share actions: Copy link, WhatsApp, Email, Download PDF, Download PNG, Download JPG
  - Print via thermal printer using the existing WebUSB transport
  - Language toggle (EN/AR) when config.language === 'both'

---

## 7. Pages

- [ ] `app/w/[orgSlug]/[certId]/page.tsx` — **public certificate view** (no auth)
  - Same pattern as `app/r/[orgSlug]/[receiptId]/page.tsx`
  - Fetches cert + org config via server-side Supabase
  - Renders `WarrantyCertPreview`
  - `?download=1` → auto-triggers `window.print()` for PDF

- [ ] `app/[locale]/[orgSlug]/[space]/haraka/warranty-certs/page.tsx` — **certificates list**
  - DataTable: cert number, customer, source type badge (Order / POS), item count, warranty period, issued date
  - Clicking a row opens `WarrantyCertShareDialog`
  - "Generate" button (opens generate dialog with order/transaction picker)
  - Gated by `pos.view_warranty_certs`

- [ ] `app/[locale]/[orgSlug]/settings/warranty-cert/page.tsx` — **settings**
  - Same layout as `Settings → Receipt`
  - Left: form (default duration, terms EN/AR, header/footer EN/AR, language, template, toggles, accent color)
  - Right: live preview using `WarrantyCertPreview` with sample data
  - Org-scoped (no space in URL)

---

## 8. Integration into Order Detail

- [ ] Modify `app/[locale]/[orgSlug]/[space]/haraka/orders/[orderId]/page.tsx`
  - Import `useWarrantyCertByOrder`, `useCreateWarrantyCert`, `WarrantyCertShareDialog`
  - Add a new section or header button: **"Generate Warranty"** (gated by `pos.manage_warranty_certs`)
  - If `useWarrantyCertByOrder(order.id)` returns a cert: show **"View Warranty"** badge + open `WarrantyCertShareDialog`
  - If no cert: show **"Generate Warranty"** button → opens a small confirm dialog:
    - Pre-fills: customer name, items from the order, start date = order date
    - User sets end date (pre-filled: start + `config.defaultDurationDays`)
    - Notes field (optional)
    - On confirm: `useCreateWarrantyCert()` → opens `WarrantyCertShareDialog` immediately

---

## 9. Thermal Printing

- [ ] `lib/modules/haraka/printing/warranty-cert-template.ts`
  - Same structure as `receipt-template.ts`
  - Builds ESC/POS byte sequence for thermal printing
  - For `thermal-58` / `thermal-80`: text-mode (32/48 cols)
  - Arabic falls back to canvas raster (same approach as receipts)
  - Prints: org name, cert number, customer, items, warranty period, terms (truncated for thermal), QR

---

## 10. Navigation + i18n

- [ ] `lib/nav/index.ts` — add to Haraka group:
  ```typescript
  {
    href: '/haraka/warranty-certs',
    label: 'Warranty Certs',
    labelKey: 'nav.harakaWarrantyCerts',
    featureKey: 'pos',
    permissionKey: 'pos.view_warranty_certs',
    moduleColor: '#AD1457',
    moduleName: 'ضمانات',
  }
  ```
  Add to Settings group (org-scoped):
  ```typescript
  {
    href: '/settings/warranty-cert',
    label: 'Warranty Certificate',
    labelKey: 'nav.warrantyCert',
    permissionKey: 'settings.orgInfo',
    scope: 'org',
  }
  ```

- [ ] `locales/messages.ts` — add keys (EN + AR):
  - `nav.harakaWarrantyCerts` / `'Warranty Certs'` / `'شهادات الضمان'`
  - `nav.warrantyCert` / `'Warranty Certificate'` / `'شهادة الضمان'`
  - `haraka.warrantyCerts` / `haraka.warrantyCert` / `haraka.generateWarranty` / `haraka.viewWarranty`
  - `haraka.warrantyNumber` / `haraka.warrantyPeriod` / `haraka.warrantyStartDate` / `haraka.warrantyEndDate`
  - `haraka.warrantyTerms` / `haraka.defaultDuration` / `haraka.noWarrantyCerts`
  - `permOp.pos.view_warranty_certs` / `permOp.pos.manage_warranty_certs`

---

## Notes for the next developer

- The public cert URL is `/w/[orgSlug]/[certId]` — the `w` prefix avoids collisions with `/r` (receipts). Create the page at `app/w/[orgSlug]/[certId]/page.tsx`.
- `WarrantyCertPreview` should accept a `data` prop that is `undefined` when in settings preview mode — the component renders sample data in that case (same pattern as `ReceiptPreview`).
- The `a4-certificate` template is a new template ID — add it to `TemplateId` in `components/settings/receipt/ReceiptPreview.tsx` only if you want to reuse it for receipts too, otherwise define a local `CertTemplateId` type in the warranty component.
- Do **not** confuse this with the Usool Warranties module (`/warranties` route, `warranties` feature key) — that tracks vendor warranties on assets/inventory. This module is customer-facing documents issued by the business.
- The `findByOrderId` repository method is the key integration point — the order detail page calls it to determine whether to show "Generate Warranty" or "View Warranty".
- `warrantyStartDate` and `warrantyEndDate` are stored as `date` (no time) in Postgres — use `z.string().date()` in Zod schemas (not `.datetime()`).
