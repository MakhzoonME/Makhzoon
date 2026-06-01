# Settings

**Route base**: `/{locale}/{orgSlug}/settings/`

Settings is a group of org-level configuration pages. Each sub-page is gated by a specific permission key under `settings.*`.

---

## Settings Navigation

The settings section has its own sidebar sub-nav with sections:
- **Organization** (`settings.orgInfo`)
- **Spaces** (`settings.users` — admin)
- **Managed Lists** (`settings.orgInfo`)
- **Tax Rates** (`settings.taxRates`)
- **Jo-Fotara** (`settings.fawtara`)

---

## Organization Info

**Route**: `/{locale}/{orgSlug}/settings/organization`
**Permission**: `settings.orgInfo`

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
**Permission**: Admin only.

See dedicated [Spaces doc](02-spaces.md) for full details.

Displays all spaces in the org with create/edit/delete and member management.

---

## Managed Lists

**Route**: `/{locale}/{orgSlug}/settings/lists`
**Permission**: `settings.orgInfo`

Managed Lists are the configurable dropdown options used across all modules. They have two tiers:
- **Platform defaults** (set by superadmin) — shown as the base values.
- **Org overrides/additions** — org admins can add custom values or rename/recolor platform defaults.

**Page layout**:
- `PageHeader` "Managed Lists".
- Left sidebar: list of all managed list types.
- Right panel: items for the selected list.

**Free lists** (org can add/edit/delete):
| List | Used in |
|------|---------|
| Asset Statuses | Usool — status field |
| Asset Categories | Usool — category field |
| Locations | Usool + Raseed — location field |
| Inventory Units | Raseed — unit field |
| Inventory Categories | Raseed — category field |
| Inventory Storage Locations | Raseed — storage location field |
| Vendors / Suppliers | Raseed purchases — supplier field |

**System lists** (values locked; label/color/order only editable):
| List | Used in |
|------|---------|
| Request Statuses | Requests |
| Request Types | Requests |
| Purchase Statuses | Raseed purchases |
| Inventory Movements | Stock transactions |
| POS Transaction Statuses | Haraka |
| POS Session Statuses | Haraka |
| Warranty Statuses | Warranties |
| Warranty Coverage | Warranties |
| Maintenance Types | Asset maintenance records |

**Per-item controls**:
- Label (EN) and Label (AR) — bilingual.
- Color picker (hex) — shown as colored dot in dropdowns.
- Sort order (drag-and-drop reorder).
- Enable/disable toggle.

For free lists, org can also add new items and delete custom ones (platform defaults cannot be deleted, only disabled).

---

## Tax Rates

**Route**: `/{locale}/{orgSlug}/settings/tax-rates`
**Permission**: `settings.taxRates`

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
**Permission**: `settings.fawtara`

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

**Fawtara re-submission**: Failed transactions can be manually resubmitted from the Haraka sessions detail page (gated by `pos.fawtara_submit`).
