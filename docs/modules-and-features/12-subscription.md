# Subscription & Packages

---

## Overview

Each organization has one active subscription that defines which features are enabled and what usage limits apply. Subscriptions are managed by superadmin and visible (read-only) to org owners/admins.

---

## Data Model

The subscription record is much richer than a simple feature-flag bag — it also drives a pricing model (packages, add-ons, per-org limit overrides) and a billing lifecycle (grace period, cancellation, scheduled downgrades). See `types/subscription.types.ts`.

```
Subscription
  id, organizationId, packageId?
  features: Record<string, boolean>  ← feature flags
  notes? (internal superadmin notes)
  packageDetails (JSON snapshot of the package at time of assignment)
  startDate, endDate
  status: 'ACTIVE' | 'GRACE' | 'READ_ONLY' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED'
  activeHarakaModules: ('pos' | 'services' | 'orders' | 'retainers' | 'appointments')[]
  activeAddOns: { deliveryAgents, warrantyCerts, customization, purchasesRequests,
                  vehicleIntake, loyalty, extraHarakaModules[], extraUsers, extraSpaces }
  limitOverrides: { usool?, raseed?, users?, spaces? }  ← per-org overrides of plan allowances
  foundingCohort: { isFoundingCohort, discountPercent, discountExpiresAt } | null
  billingAnchorDay, graceStartedAt
  cancelledAt, cancelReason
  pendingPackageId, pendingChangeEffectiveAt  ← scheduled downgrade at next renewal
  createdAt/By, updatedAt/By
```

### Feature Keys

Grouped the same way the sidebar and package editor group them (`lib/config/package-feature-groups.ts`):

| Key | Module |
|-----|--------|
| `dashboard` | Dashboard |
| `reports` | Reports |
| `support` | Support Tickets |
| `auditLogs` | Audit Logs |
| `assets` | Usool — Asset Management (base feature) |
| `warranties` | Usool — Warranties (sub-feature) |
| `maintenance` | Usool — Asset Maintenance Records (sub-feature) |
| `assetCheckouts` | Usool — Asset Checkout / Check-in (sub-feature) |
| `assetNotes` | Usool — Asset Notes (sub-feature) |
| `inventory` | Raseed — Inventory + Purchases |
| `pos` | Haraka (base feature; specific Haraka sub-modules — POS/services/orders/retainers/appointments — are additionally gated per-org by `activeHarakaModules`, not by a feature flag) |
| `banna` | Customization (Banna) |
| `loyalty` | Loyalty |

> There is no `checkouts` key (it's `assetCheckouts`) and no `requests` feature — the Requests module doesn't exist in the codebase (no DB table, no routes, no permission module).

### Subscription Status

| Status | Behavior |
|--------|----------|
| `ACTIVE` | Full access to enabled features |
| `GRACE` | Post-expiry grace period (`graceStartedAt` set); access continues short-term before moving to `READ_ONLY`/`EXPIRED` |
| `READ_ONLY` | Reduced access — read-only, part of the billing lifecycle added after initial launch |
| `EXPIRED` | Login blocked (non-super-admin); renewal required |
| `SUSPENDED` | Same as expired; manually set by superadmin |
| `CANCELLED` | Deliberate churn via superadmin cancel action (`cancelledAt`/`cancelReason` set), distinct from passive `EXPIRED` |

A cron job (`app/api/cron/subscription-status/route.ts`) transitions subscriptions through this lifecycle (e.g. `ACTIVE` → `GRACE` → `READ_ONLY`/`EXPIRED`) and applies any `pendingPackageId` downgrade scheduled for `pendingChangeEffectiveAt`.

---

## Org Subscription Page

**Route**: `/{locale}/{orgSlug}/subscription`
**Access**: Users with `settingsSubscription.view` permission (org_owner and admin by default), enforced via `useAdminGuard('settingsSubscription.view')`.

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
1. **UI** — nav items, buttons, and pages are hidden/disabled if the feature flag is off (`useModuleGuard`).
2. **API** — routes call a `requireFeature` check that returns/throws a 403 if the feature is not enabled for the org. Two equivalent implementations exist: `requireFeature(orgId, featureKey)` in `lib/services/base.service.ts`, and `requireFeature(tenant, featureKey)` / `requireFeatureForOrg(organizationId, featureKey)` in `lib/permissions/require-feature.ts` (used by routes that don't go through `resolveTenant()`, e.g. audit logs).

Suspended/expired orgs are blocked at session creation for non-super-admin users.

---

## Payment Logs

```
PaymentLog
  id, organizationId, subscriptionId
  amount, currency
  method: 'CARD' | 'BANK_TRANSFER' | 'MANUAL' | 'OTHER'  ← uppercase, not lowercase
  reference? (invoice/transaction reference)
  notes?
  paidAt
  createdAt/By, updatedAt/By
```
