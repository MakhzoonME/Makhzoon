# Subscription & Packages

---

## Overview

Each organization has one active subscription that defines which features are enabled and what usage limits apply. Subscriptions are managed by superadmin and visible (read-only) to org owners/admins.

---

## Data Model

```
Subscription
  id, organizationId, packageId?
  features: Record<string, boolean>  ← feature flags
  notes? (internal superadmin notes)
  packageDetails (JSON snapshot of the package at time of assignment)
  startDate, endDate
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED'
  createdAt/By, updatedAt/By
```

### Feature Keys

| Key | Module |
|-----|--------|
| `dashboard` | Dashboard |
| `assets` | Usool — Asset Management |
| `inventory` | Raseed — Inventory + Purchases |
| `warranties` | Warranties |
| `requests` | Requests |
| `reports` | Reports |
| `support` | Support Tickets |
| `auditLogs` | Audit Logs |
| `pos` | Haraka — Point of Sale |
| `maintenance` | Asset Maintenance Records |
| `checkouts` | Asset Checkout / Check-in |
| `assetNotes` | Asset Notes |

### Subscription Status

| Status | Behavior |
|--------|----------|
| `ACTIVE` | Full access to enabled features |
| `EXPIRED` | Login blocked (non-super-admin); renewal required |
| `SUSPENDED` | Same as expired; manually set by superadmin |

---

## Org Subscription Page

**Route**: `/{locale}/{orgSlug}/subscription`
**Access**: Users with `settings.subscription` permission (org_owner and admin by default).

**Layout**:
- `PageHeader` with "Subscription" title.
- **Current Plan card**: package name, status badge, start date, end date, days remaining.
- **Feature List**: which features are included (green checkmark) and excluded (gray X).
- **Payment History** table: payment date, amount, method, notes.
- **Contact Support** button → opens a support ticket for billing questions.

This page is **read-only** for org users. Changes are made by superadmin.

---

## Superadmin Subscription Management

**Route**: `/{locale}/superadmin/organizations/[orgId]/subscription`

**Layout**:
- Current subscription summary.
- **Edit Subscription** form:
  - Package picker (selects a predefined package).
  - Or manual feature toggle (override individual features).
  - Start Date / End Date pickers.
  - Status selector (ACTIVE / EXPIRED / SUSPENDED).
  - Internal notes textarea.
  - Save button.
- **Payment Logs** section: table of all payment records with add-new button.
  - Add Payment: date, amount, method (card / bank transfer / manual / other), notes.

---

## Feature Gating

Features are checked at two levels:
1. **UI** — nav items, buttons, and pages are hidden/disabled if the feature flag is off.
2. **API** — every route that touches a feature calls `requireFeature(featureKey)` in `lib/services/base.service.ts`. Returns 403 if the feature is not enabled for the org.

Suspended/expired orgs are blocked at session creation for non-super-admin users.

---

## Payment Logs

```
PaymentLog
  id, organizationId
  amount, currency
  method: 'card' | 'bank_transfer' | 'manual' | 'other'
  reference? (invoice/transaction reference)
  notes?
  paidAt
  createdBy (superadmin who recorded it)
```
