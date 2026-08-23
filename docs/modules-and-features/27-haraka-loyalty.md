# Loyalty (نقاط الولاء)

**Parent module**: none — standalone, org-level add-on (not nested under Haraka/Usool/Raseed/Banna) — Feature key: `loyalty`
**Permission keys**: `loyalty.view` (read-only; the module exposes no separate create/update permission — writes are gated purely by `requireFeature`/`requireAddOn`, not by user-permission checks)
**Brand color**: none defined — nav entry uses no distinct module color

---

## Overview

Loyalty is a generic points-and-tiers program hung off `pos_customers`. It is independent of Haraka: any org (retail or service-based) can enable it, and any module can award points by calling one shared entry point.

Key characteristics:
- One `loyalty_programs` config row per organization: `enabled`, `pointsPerCurrency`, and an ordered `tiers` array (min-points thresholds).
- Enrollment is implicit — a `LoyaltyMember` is auto-created the first time points would be awarded to a customer (`getOrEnrollMember`, upsert-like via `enroll`), or explicitly via `POST /api/loyalty/members`.
- Each member gets a random 12-digit numeric `card_number` (barcode-style) generated at enrollment.
- Points are tracked as an append-only ledger (`loyalty_transactions`, `delta` positive/negative) plus a cached `points_balance` and `tier` on the member row, recalculated on every ledger write.
- **No redemption path is implemented.** The schema comment and `reason` column anticipate `'redemption'` and negative deltas, but no service method, API route, or UI exists to spend points — only `awardPoints` (always positive, reason `'sale'`) is wired up.
- **Only one caller awards points**: `HarakaServiceJobsService` calls `loyaltyService.awardPoints(...)` on service-job completion (`lib/modules/haraka/service-jobs/service-jobs.service.ts:194,241`). POS orders/sales do **not** call it — despite the settings page copy ("Customers earn points automatically on completed, paid sales") and the DB comment referencing `pos_orders` as an example source module. This looks like an unfinished integration, not a documented limitation.
- The settings UI itself flags membership cards / Apple/Google Wallet passes as "next up" — not yet built.

---

## Data Models

### LoyaltyProgram (loyalty_programs — one row per org, PK = organization_id)
```
organizationId
enabled              ← master on/off switch; awardPoints no-ops silently when false
pointsPerCurrency    ← numeric(10,4), points earned per 1 unit of org currency spent
tiers                ← jsonb array, e.g. [{tier:'bronze',minPoints:0},{tier:'gold',minPoints:2000}]
updatedAt, updatedBy
```

### LoyaltyMember (loyalty_members)
```
id, organizationId
customerId           ← FK pos_customers, UNIQUE per (org, customer)
cardNumber           ← 12-digit numeric, UNIQUE per org — barcode value
tier                 ← defaults 'bronze', recalculated after every points delta
pointsBalance        ← cached total, floored at 0
enrolledAt, updatedAt
```

### LoyaltyTransaction (loyalty_transactions — append-only ledger)
```
id, organizationId, memberId
delta                ← +earned / -redeemed (only positive deltas are actually produced today)
reason               ← e.g. 'sale' (only value in current code; 'redemption'/'manual_adjustment' are anticipated, not implemented)
sourceModule?        ← provenance only, never a behavioral branch — e.g. 'haraka_service_jobs'
sourceRecordId?      ← e.g. the service job id
createdAt, createdBy?
```

---

## Points & Tier Logic

- `awardPoints(tenant, customerId, amount, sourceModule, sourceRecordId)`:
  - No-ops if `customerId` is null, `amount <= 0`, or the org's program is disabled.
  - Auto-enrolls the customer if not already a member.
  - `points = Math.floor(amount * pointsPerCurrency)`; no-ops (returns member unchanged) if that rounds to 0.
  - Inserts a ledger row, then recomputes `pointsBalance = max(0, balance + delta)` and re-derives `tier` by taking the highest-`minPoints` tier the new balance still qualifies for (tiers sorted descending, first match wins).
- Tier/balance updates are two sequential Supabase calls (insert then update) — not a single transaction/RPC, so a crash between them could leave the ledger and cached balance briefly inconsistent.

---

## Key Files

| Layer | Path |
|---|---|
| DB migration | `supabase/migrations/0060_loyalty.sql` |
| Types | `types/loyalty.types.ts` — `LoyaltyProgram`, `LoyaltyMember`, `LoyaltyTransaction`, `LoyaltyTierThreshold` |
| Repository | `lib/modules/loyalty/loyalty.repository.ts` |
| Service | `lib/modules/loyalty/loyalty.service.ts` |
| Schemas | `lib/modules/loyalty/schemas.ts` |
| API program | `app/api/loyalty/program/route.ts` (GET/PATCH) |
| API members | `app/api/loyalty/members/route.ts` (POST — enroll/get) |
| API transactions | `app/api/loyalty/members/[memberId]/transactions/route.ts` (GET) |
| Hooks | `hooks/loyalty/useLoyalty.ts` — `useLoyaltyProgram`, `useUpdateLoyaltyProgram`, `useEnrollLoyaltyMember`, `useLoyaltyMemberTransactions` |
| Settings page | `app/[locale]/[orgSlug]/[space]/loyalty/page.tsx` |
| Nav entry | `lib/nav/index.ts:144` |
| Only awardPoints caller | `lib/modules/haraka/service-jobs/service-jobs.service.ts:194,241` |

---

## Permissions

`LoyaltyPermissions` (`types/user-permissions.types.ts:193`) has a single field:

| Key | Gates |
|---|---|
| `loyalty.view` | Nav visibility (`useModuleGuard`) and gates the settings page render |

All API routes (`program`, `members`, `members/[memberId]/transactions`) are gated only by `requireFeature(tenant, 'loyalty')` and `requireAddOn(tenant, 'loyalty')` — no per-route permission-key check (e.g. no `loyalty.manage`/`loyalty.create` distinction; the settings page's own writes rely on the same view-gated route access).

---

## Subscription Gating

- `FeatureKey` `'loyalty'` (`types/package.types.ts`) — org-level feature flag toggled per package/subscription, checked via `requireFeature`.
- Add-on gating via `requireAddOn(tenant, 'loyalty')` (`lib/permissions/require-module.ts:93`): allowed if the org has no `packageId`, has purchased the `loyalty` add-on (`activeAddOns.loyalty`), is on a legacy (non-pricing-model) package, or the package's `allowances.loyaltyIncluded` is true. Otherwise throws `ADDON_NOT_ACTIVE`.
- `PackageAllowances.loyaltyIncluded: boolean` and `PackageLimits.loyalty?: number` both exist in `types/package.types.ts`, reflecting Loyalty as a sellable add-on module in the pricing model.
