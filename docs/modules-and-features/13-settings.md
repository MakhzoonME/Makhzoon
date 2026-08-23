# Settings

**Route base**: `/{locale}/{orgSlug}/settings/`

Settings is a group of org-level configuration pages. Each sub-page is gated by a specific permission key under `settings.*`.

---

## Settings Navigation

Each settings sub-page is its own top-level permission module in `types/user-permissions.types.ts` (`settingsOrgInfo`, `settingsSpaces`, …) rather than a nested `settings.*` key, and each page's guard is `useAdminGuard('<module>.view')`:
- **Organization** (`settingsOrgInfo.view`)
- **Spaces** (`settingsSpaces.view`)
- **Managed Lists** (`settingsLists.view` — not `settingsOrgInfo`)
- **Subscription** (`settingsSubscription.view`)
- **Users** (`settingsUsers.view` — note: the Users page itself lives at `/{locale}/{orgSlug}/users`, outside the `/settings/` route base)
- **Tax Rates** (`settingsTaxRates.view`)
- **Jo-Fotara** (`settingsFawtara.view`)
- **Receipt** (`settingsReceipt.view`)
- **Invoice** (`settingsInvoice.view`) — route is `/settings/invoice`, not `/settings/order-documents`; covers what was documented below as "Order Documents"
- **Warranty Certificate** (`settingsWarrantyCert.view`)
- **Notifications** (`settingsNotifications.view`)
- **Cash Drawer** (`settingsCashDrawer.view`)
- **Card Terminal** (`settingsCardTerminal.view`)

None of these guards check a `pos` feature flag directly in the page component (unlike the claim in the prior version of this doc) — access is controlled purely by the permission key.

---

## Organization Info

**Route**: `/{locale}/{orgSlug}/settings/organization`
**Permission**: `settingsOrgInfo.view`

**Form**:
- Organization Name (required)
- Industry / Category (dropdown from `org_industry` managed list)
- Contact Email
- Description (textarea)

Footer: Cancel + Save.

Changes are logged as `ORGANIZATION_UPDATED` in the audit trail.

---

## Spaces

**Route**: `/{locale}/{orgSlug}/settings/spaces`
**Permission**: `settingsSpaces.view` (`useAdminGuard('settingsSpaces.view')`) — not simply "admin only"; it's a real permission key that can be restricted per user.

See dedicated [Spaces doc](02-spaces.md) for full details.

Displays all spaces in the org with create/edit/delete and member management.

---

## Managed Lists

**Route**: `/{locale}/{orgSlug}/settings/lists`
**Permission**: `settingsLists.view`

Managed Lists are the configurable dropdown options used across all modules. They have two tiers:
- **Platform defaults** (set by superadmin) — shown as the base values.
- **Org overrides/additions** — org admins can add custom values or rename/recolor platform defaults.

**Page layout**:
- `PageHeader` "Managed Lists".
- Left sidebar: list of all managed list types.
- Right panel: items for the selected list.

**Free lists** (org can add/edit/delete) — `ListKey`s marked `scope: 'org', isSystem: false` in `types/managed-lists.types.ts`:
| List | Used in |
|------|---------|
| Asset Statuses | Usool — status field |
| Asset Categories | Usool — category field |
| Locations | Usool + Raseed — location field |
| Inventory Units | Raseed — unit field |
| Inventory Categories | Raseed — category field |
| Inventory Storage Locations | Raseed — storage location field |
| Vendors / Suppliers | Raseed purchases — supplier field |
| Order Channels | Haraka orders — source channel (phone, WhatsApp, etc.) |
| Service Job Types | Haraka service jobs — category of work |
| Service Categories | Haraka service catalog |

**System lists** (values locked; label/color/order only editable):
| List | Used in |
|------|---------|
| Purchase Statuses | Raseed purchases |
| Inventory Movements | Stock transactions |
| POS Transaction Statuses | Haraka |
| POS Session Statuses | Haraka |
| Warranty Statuses | Warranties |
| Warranty Coverage | Warranties |
| Maintenance Types | Asset maintenance records |
| Order Statuses | Haraka orders |
| Order Payment Methods | Haraka orders |
| Service Job Statuses | Haraka service jobs |
| Service Job Payment Methods | Haraka service jobs |
| Retainer Statuses | Haraka retainers |
| Appointment Statuses | Haraka appointments (only "completed" unlocks invoicing) |

`org_industry` is a platform-scoped (not per-org) free list used by the Organization Info page's Industry dropdown.

> Note: `Request Statuses` and `Request Types` still exist as list keys in `types/managed-lists.types.ts` (`request_status`, `request_type`), but there is no Requests module left to consume them — no `requests` table, no `app/**/requests` routes. These two list entries are vestigial.

**Per-item controls**:
- Label (EN) and Label (AR) — bilingual.
- Color picker (hex) — shown as colored dot in dropdowns.
- Sort order (drag-and-drop reorder).
- Enable/disable toggle.

For free lists, org can also add new items and delete custom ones (platform defaults cannot be deleted, only disabled).

---

## Tax Rates

**Route**: `/{locale}/{orgSlug}/settings/tax-rates`
**Permission**: `settingsTaxRates.view`

Tax rates are shared across Raseed (item default tax), Purchases (cost lines), and Haraka (sale lines).

**Page layout**:
- Table: Name, Rate (%), Default badge, Created By, Actions.
- "+ Add Tax Rate" button.

**Add / Edit Tax Rate form**:
- Name (e.g. "VAT 16%")
- Rate — decimal fraction, e.g. `0.16` for 16% (displayed as "16%")
- Is Default toggle — marks this rate as the default applied to new items/transactions.

Only one rate can be the default. Setting a new default clears the old one.

---

## Jo-Fotara (Jordan E-Invoicing)

**Route**: `/{locale}/{orgSlug}/settings/jo-fotara`
**Permission**: `settingsFawtara.view` (also requires the `pos` feature per the nav entry in `lib/nav/index.ts`)

Fawtara is Jordan's ISTD electronic invoicing system. When enabled, all Haraka POS transactions are submitted to the Fawtara API and a QR code is printed on receipts.

**Page layout**:
- **Enabled** toggle (master on/off for Fawtara integration).
- **Mode**: Sandbox (testing) | Production.
- **Taxpayer Number** (Jordan tax registration number).
- **Activity Number**.
- **Client Credentials** — masked input; shows "credentials set" indicator if already configured. Setting new credentials overwrites the old ones (stored encrypted server-side; never returned to the client).
- **Invoice Type Default**: Income | General.
- **VAT Registered** toggle.

Save changes button. All changes logged in audit trail.

**Fawtara re-submission**: Failed transactions can be manually resubmitted from the Haraka **transaction detail** page (`haraka/transactions/[transactionId]`), not the sessions page. There is no dedicated resubmit permission key — the button is gated by `haraka.transactionsView` (`canResubmitFawtara` in the page component) and only shown when `tx.fawtara.status !== 'submitted'`.

---

## Receipt

**Route**: `/{locale}/{orgSlug}/settings/receipt`
**Permission**: `settingsReceipt.view` (its own permission module, not `settingsFawtara`)

Configures how POS receipts look when printed or shared.

**Page layout**:
- **Printer settings** — WebUSB thermal printer: connect/disconnect, paper width (58mm / 80mm), font size, auto-print toggle. State persisted to `localStorage` via `store/printer.store.ts`.
- **Receipt template** — Template picker: `thermal-58`, `thermal-80`, `a4-modern`, `a4-invoice`.
- **Language** — EN / AR / Both (bilingual).
- **Logo** — Toggle show/hide; upload org logo (stored via Supabase Storage).
- **Header / Footer** — Custom text lines printed above and below items.
- **Accent color** — Hex color picker (preset swatches: Indigo, Teal, Purple, Red, Black).
- **Live preview** — `ReceiptPreview` component renders a sample receipt reflecting all settings.
- Save button — PATCH `/api/organizations/receipt-config`.

Changes logged as `RECEIPT_CONFIG_UPDATED` in the audit trail.

---

## Order Documents (Invoice settings)

**Route**: `/{locale}/{orgSlug}/settings/invoice` — not `/settings/order-documents`; the page is titled "Invoice Customization" and lives at the `invoice` path even though it configures order documents.
**Permission**: `settingsInvoice.view` (its own permission module, not `settingsFawtara`)

Configures the invoice and receipt generated from Haraka orders (distinct from the POS receipt above).

**Page layout**:
- **Document titles** — "Invoice title" (default: `TAX INVOICE`) and "Receipt title" (default: `RECEIPT`) — appear as the large heading at the top of each document.
- **Show / hide fields** — Toggles for:
  - Delivery address
  - Order channel (Phone, WhatsApp…)
  - Sales agent name
  - Delivery agent name
- **Footer** — "Thank you message" (short line) and "Terms and conditions" textarea (printed at the bottom of every invoice and receipt).
- Note: Logo, org name, address, phone, and tax number are shared with Receipt settings.
- Save button — PATCH `/api/organizations/order-document-config`.

Config stored as `order_document_config` JSONB in `organization_configs`. Changes logged as `ORDER_DOCUMENT_CONFIG_UPDATED`.

---

## Other Settings Pages (undocumented previously)

Four more settings sub-pages exist that weren't covered above:

- **Warranty Certificate** — `/{locale}/{orgSlug}/settings/warranty-cert`, permission `settingsWarrantyCert.view`. Configures the certificate generated for Usool warranties: default duration (days), language, template, accent color, show logo/QR toggles, bilingual header/footer and terms & conditions text.
- **Notifications** — `/{locale}/{orgSlug}/settings/notifications`, permission `settingsNotifications.view`. Toggles for which events trigger notifications (email/in-app/push).
- **Cash Drawer** — `/{locale}/{orgSlug}/settings/cash-drawer`, permission `settingsCashDrawer.view`. Enable/disable a connected cash drawer, auto-open on cash sale, PIN requirement for manual open, and serial port / pulse timing (on-time / off-time in ms) for the drawer kick signal.
- **Card Terminal** — `/{locale}/{orgSlug}/settings/card-terminal`, permission `settingsCardTerminal.view`. Enable/disable a card terminal integration, integration mode, bridge URL, provider, terminal device ID, API key, webhook URL/secret, and timeout.
