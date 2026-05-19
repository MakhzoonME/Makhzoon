# Makhzoon — Future Architecture & Expansion Roadmap

> **Purpose:** This document is the authoritative reference for planned architectural expansions to the Makhzoon platform. It covers three major areas: (1) environment separation, (2) POS module, and (3) offline support. It is written for Claude Code to use as implementation context when building or preparing any of these features. Do not treat anything in this document as already implemented unless explicitly confirmed.

---

## Document Status

| Area | Status | Notes |
|---|---|---|
| Environment Separation | 🔡 Planned | Must be done before any POS work begins |
| POS Module (online) | 🔵 Future | Implement after environments are stable |
| Offline POS Support | 🔵 Future | Implement after online POS is stable |

---

## 1. Environment Separation

### Goal
Run three fully isolated environments: `development`, `staging`, and `production`. No environment shares Firebase projects, Firestore data, or Auth users with another.

### Firebase Projects
Three separate Firebase projects must exist:
- `makhzoon-dev` – local development and engineer testing
- `makhzoon-staging` – pre-release QA, mirrors production setup
- `makhzoon-production` – live, customer-facing

Each project has its own Firestore database, Firebase Auth configuration, and API credentials. The same Firestore security rules are deployed to all three.

### Vercel Environment Mapping
| Vercel Scope | Git Branch | Firebase Project |
|---|---|---|
| Production | `main` | `makhzoon-production` |
| Preview | `staging` | `makhzoon-staging` |
| Development | localhost | `makhzoon-dev` |

Environment variables are scoped per Vercel environment in the Vercel dashboard. No real secrets live in the repository.

### Required Environment Variable Additions
Add to all `.env.*.example` files and to Vercel's environment variable configuration:

```env
# Identifies the running environment explicitly.
# Do NOT rely on NODE_ENV for this – Vercel sets NODE_ENV=production
# for both Preview and Production deployments.
NEXT_PUBLIC_APP_ENV=development   # or staging | production
```

Use `NEXT_PUBLIC_APP_ENV` in code for:
- Sentry release environment tagging
- Any conditional behavior that differs per environment
- Debug tooling that should never appear in production

### .env File Discipline
| File | Purpose | Contains Real Secrets? |
|---|---|---|
| `.env.local` | Local dev (gitignored) | Yes – dev Firebase credentials only |
| `.env.local.example` | Template for onboarding engineers | No – placeholder values |
| `.env.development.example` | Documents dev variable set | No – placeholder values |
| `.env.staging.example` | Documents staging variable set | No – placeholder values |
| `.env.production.example` | Documents production variable set | No – placeholder values |

### Sentry Update Required
When `NEXT_PUBLIC_APP_ENV` is added, update Sentry initialization in `app/layout.tsx` (or wherever Sentry is initialized) to pass `environment: process.env.NEXT_PUBLIC_APP_ENV` so errors are tagged and filterable per environment in the Sentry dashboard.

### Implementation Checklist
- [ ] Create `makhzoon-dev` Firebase project (if not already separate)
- [ ] Create `makhzoon-staging` Firebase project
- [ ] Configure Firebase Auth (email/password enabled) in both new projects
- [ ] Add `NEXT_PUBLIC_APP_ENV` to all `.env.*.example` files
- [ ] Configure `NEXT_PUBLIC_APP_ENV` in Vercel per scope (dev/staging/production)
- [ ] Update all `FIREBASE_*` and `NEXT_PUBLIC_FIREBASE_*` variables in Vercel per scope
- [ ] Create `staging` branch in git repo and configure Vercel Preview to deploy it
- [ ] Update Sentry initialization to use `NEXT_PUBLIC_APP_ENV` as environment tag
- [ ] Confirm Firestore security rules are deployed to all three Firebase projects identically

---

## 2. POS (Point of Sale) Module

### Overview
POS is a new first-class module within Makhzoon, gated by a feature flag (`features.pos`). It allows organizations to process sales transactions at physical terminals, with real-time inventory deduction, receipt generation, and shift management. It is designed to eventually support offline operation (see Section 3).

### Design Principles
- Transactions must be **atomic**: a sale writes the transaction record AND decrements inventory in a single Firestore batch – never separately
- Every transaction must carry a **client-generated idempotency key** (`offlineId`) from day one, even before offline support is built – this is the single most important decision to get right upfront
- The POS terminal UI is a **separate layout** from the rest of the app – no sidebar, full-screen, touch/keyboard optimized
- Financial records are **immutable** – transactions are never deleted, only voided or refunded (which create new records)
- All POS actions are **audit logged** using the existing `writeAuditLog()` pattern

### Feature Flag
Add `pos` as a new `FeatureKey` in the feature system:

```typescript
// types/subscription.types.ts (or wherever FeatureKey is defined)
export type FeatureKey =
  | 'dashboard'
  | 'assets'
  | 'inventory'
  | 'warranties'
  | 'requests'
  | 'reports'
  | 'support'
  | 'audit_logs'
  | 'maintenance'
  | 'checkouts'
  | 'notes'
  | 'pos';  // NEW
```

Add `pos: false` as the default in any place that initializes a features object (default subscription creation, package defaults, etc.).

Add `maxDailyTransactions` and `maxMonthlyTransactions` to the `limits` object in the `packages` Firestore schema to enable tiered POS pricing.

### New Firestore Collections

#### `posSessions`
One document per cashier shift at a terminal.
```typescript
interface PosSession {
  id: string;
  organizationId: string;
  locationId: string;
  cashierId: string;         // user UID
  cashierName: string;
  openedAt: Date;
  closedAt: Date | null;
  status: 'open' | 'closed';
  openingFloat: number;      // cash in drawer at session start
  closingFloat: number | null;
  expectedFloat: number | null;  // calculated from transactions
  discrepancy: number | null;
  createdAt: Date;
  updatedAt: Date;
}
```

#### `posTransactions`
One document per completed sale, refund, or void.
```typescript
interface PosTransaction {
  id: string;
  organizationId: string;
  sessionId: string;
  locationId: string;
  cashierId: string;
  cashierName: string;
  items: PosLineItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  payments: PosPayment[];
  status: 'completed' | 'refunded' | 'voided';
  receiptNumber: string;       // human-readable, org-scoped sequential
  offlineId: string;           // client-generated UUID – ALWAYS present, even online
  syncedAt: Date | null;       // null = created offline, not yet confirmed
  parentTransactionId: string | null;  // for refunds/voids, points to original
  createdAt: Date;
  updatedAt: Date;
}

interface PosLineItem {
  inventoryItemId: string;
  inventoryItemName: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  lineTotal: number;
}

interface PosPayment {
  method: 'cash' | 'card' | 'other';
  amount: number;
  reference: string | null;   // card auth code, cheque number, etc.
}
```

#### `posConfig`
One document per organization. Analogous to `organizationConfigs`.
```typescript
interface PosConfig {
  organizationId: string;
  taxRates: Array<{ id: string; name: string; rate: number }>;
  defaultTaxRateId: string | null;
  receiptHeader: string | null;
  receiptFooter: string | null;
  allowDiscounts: boolean;
  maxDiscountPercent: number;
  requireManagerOverride: boolean;  // for voids and refunds
  currency: string;                 // ISO 4217 (e.g. 'USD', 'SAR')
  currencySymbol: string;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}
```

#### `posReceiptCounters`
One document per organization for atomic sequential receipt numbering.
```typescript
interface PosReceiptCounter {
  organizationId: string;
  lastReceiptNumber: number;
}
```
Use a Firestore transaction to increment this counter atomically when creating a new sale receipt number.

### Changes to Existing Collections

#### `inventory` items – new fields
```typescript
// Add to existing InventoryItem type
posEnabled: boolean;        // whether this item appears in POS catalog
barcode: string | null;     // for barcode scanner lookup
taxRateId: string | null;   // references posConfig.taxRates[].id
posPrice: number | null;    // selling price (separate from unitCost)
```

#### `packages` – new limit fields
```typescript
// Add to existing package limits
limits: {
  maxAssets: number;
  maxUsers: number;
  maxWarranties: number;
  maxRequests: number;
  maxDailyTransactions: number;    // NEW – 0 means unlimited
  maxMonthlyTransactions: number;  // NEW – 0 means unlimited
}
```

### RBAC Changes

Do NOT add a new named role. Instead, extend the existing granular permission system with a `pos` module. A cashier is a `staff` user with `pos.*` permissions enabled.

```typescript
// Extend MODULE_PERMISSIONS_CONFIG (wherever it's defined)
pos: {
  open_session: boolean;
  close_session: boolean;
  process_sale: boolean;
  apply_discount: boolean;
  issue_refund: boolean;
  void_transaction: boolean;
  view_reports: boolean;
}
```

Add a "Cashier preset" to the permission editor UI – a one-click option that enables the standard cashier permission set (`open_session`, `close_session`, `process_sale`) without the manager-level permissions (`issue_refund`, `void_transaction`, `view_reports`).

### New API Routes

All routes require `features.pos === true` check in addition to standard session verification.

```
# Session management
POST   /api/pos/sessions
       Body: { locationId, openingFloat }
       Creates a new session. Fails if cashier already has an open session.

PATCH  /api/pos/sessions/[sessionId]/close
       Body: { closingFloat, notes? }
       Closes session, calculates discrepancy.

GET    /api/pos/sessions/[sessionId]
       Returns session details with transaction summary.

GET    /api/pos/sessions
       List sessions for org. Query params: locationId, cashierId, status, date range.

# Transactions
POST   /api/pos/transactions
       Body: { sessionId, items, payments, discountAmount?, offlineId }
       ATOMIC: writes posTransaction + inventoryTransaction records + decrements
       quantityOnHand for each line item in a single Firestore batch.
       Idempotency: if offlineId already exists for this org, return existing transaction.
       Also calls writeAuditLog() with action POS_TRANSACTION_CREATED.

POST   /api/pos/transactions/[txId]/refund
       Body: { items, reason, offlineId }
       Creates a new posTransaction with status 'refunded', parentTransactionId set.
       Restores inventory quantities. Requires pos.issue_refund permission.

POST   /api/pos/transactions/[txId]/void
       Body: { reason, offlineId }
       Creates a new posTransaction with status 'voided'. Restores inventory.
       Requires pos.void_transaction permission OR pos.require_manager_override check.

GET    /api/pos/transactions
       List transactions. Query params: sessionId, locationId, status, date range.

GET    /api/pos/transactions/[txId]
       Single transaction detail.

# Catalog
GET    /api/pos/items
       Returns posEnabled inventory items. Supports search by name, SKU.
       Optimized: returns only fields needed for POS display (name, sku, posPrice, taxRateId, quantityOnHand).

GET    /api/pos/items/barcode/[code]
       Barcode lookup. Returns matching posEnabled item or 404.

# Configuration
GET    /api/pos/config
       Returns org's posConfig. Creates default config if none exists.

PATCH  /api/pos/config
       Updates posConfig. Admin only.

# Reports
GET    /api/pos/reports/summary
       Daily/shift totals. Query params: sessionId?, locationId?, date range.

GET    /api/pos/reports/transactions
       Paginated transaction history with totals. For admin reporting view.
```

### New UI Routes and Layouts

```
/[orgSlug]/pos/                        – POS terminal (full-screen layout, no sidebar)
/[orgSlug]/pos/sessions/               – Session management for admins
/[orgSlug]/pos/sessions/[sessionId]/   – Session detail + transaction list
/[orgSlug]/pos/reports/                – POS reporting dashboard
/[orgSlug]/pos/config/                 – POS configuration (tax rates, receipt, discounts)
```

The POS terminal at `/[orgSlug]/pos/` uses a **separate layout** file (`app/[orgSlug]/pos/layout.tsx`) – full screen, no sidebar, no standard header. It has its own minimal header showing org name, cashier name, session status, and connectivity indicator.

The non-terminal POS routes (`/sessions`, `/reports`, `/config`) use the standard org sidebar layout.

Add a "POS" entry to the sidebar navigation, feature-gated by `features.pos`. It should only appear when the subscription includes the `pos` feature.

### Audit Log Actions to Add
```
POS_SESSION_OPENED
POS_SESSION_CLOSED
POS_TRANSACTION_CREATED
POS_TRANSACTION_REFUNDED
POS_TRANSACTION_VOIDED
POS_CONFIG_UPDATED
```

### Implementation Order for POS (Online First)
1. Add `pos` FeatureKey to types and default configs
2. Add new fields to `inventory` types and Firestore schema
3. Create `posConfig`, `posSessions`, `posTransactions`, `posReceiptCounters` Firestore helpers in `lib/firestore/`
4. Create POS API routes in order: config – items catalog – sessions – transactions
5. Create POS terminal layout (`app/[orgSlug]/pos/layout.tsx`)
6. Build POS terminal UI (cart, item search, payment flow)
7. Build session management UI
8. Build POS reports UI
9. Build POS config UI
10. Add sidebar entry (feature-gated)
11. Add permission editor POS section + Cashier preset

---

## 3. Offline POS Support

> **Prerequisite:** The online POS must be fully functional and stable in staging before offline support is added.

### Goal
The POS terminal must continue processing sales when internet connectivity is lost. The cashier workflow – scan/search item, add to cart, process payment, print receipt – must work uninterrupted. Everything else (reports, config, session management) can degrade gracefully to a "no connectivity" message.

### Technology Stack

| Technology | Library | Purpose |
|---|---|---|
| Service Worker | Workbox (via `next-pwa`) | Cache POS shell, intercept requests, background sync |
| Local database | Dexie.js | IndexedDB wrapper for storing offline transactions and product catalog |
| Connectivity detection | `/api/ping` polling (30s interval) | Reliable online/offline detection (do not rely solely on `navigator.onLine`) |
| Sync trigger | `navigator.onLine` event + ping polling | Trigger sync when connectivity returns |

Do NOT use `localStorage` for any offline data. It is synchronous, size-limited, and not suitable for structured data.

### Dexie Schema (IndexedDB)
```typescript
// lib/pos/offline-db.ts
import Dexie, { Table } from 'dexie';

interface PendingTransaction {
  id?: number;           // auto-increment local ID
  offlineId: string;     // client-generated UUID – the idempotency key
  organizationId: string;
  sessionId: string;
  payload: object;       // full transaction payload matching POST /api/pos/transactions body
  status: 'pending' | 'synced' | 'failed';
  attempts: number;
  lastAttemptAt: Date | null;
  createdAt: Date;
}

interface LocalInventoryItem {
  itemId: string;        // primary key
  organizationId: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  posPrice: number;
  taxRateId: string | null;
  quantityOnHand: number;  // local estimate – refreshed on sync
  updatedAt: Date;
}

interface SyncQueueEntry {
  id?: number;
  type: 'transaction' | 'session_event';
  payload: object;
  attempts: number;
  createdAt: Date;
}

class MakhzoonPosDB extends Dexie {
  pendingTransactions!: Table<PendingTransaction>;
  localInventory!: Table<LocalInventoryItem>;
  syncQueue!: Table<SyncQueueEntry>;

  constructor() {
    super('makhzoon-pos');
    this.version(1).stores({
      pendingTransactions: '++id, offlineId, organizationId, status, createdAt',
      localInventory: 'itemId, organizationId, barcode',
      syncQueue: '++id, type, createdAt',
    });
  }
}

export const posDb = new MakhzoonPosDB();
```

### What Gets Cached

**On session open (while online):**
- All `posEnabled` inventory items for the org – `localInventory` table
- Org's `posConfig` – `localStorage` (config is small, non-transactional, read-only at runtime)

**Refreshed periodically (every 5 minutes while online):**
- `localInventory` items (to pick up price changes, new items, quantity updates)

**Service Worker caches (via Workbox):**
- POS terminal shell: HTML, JS, CSS for `/[orgSlug]/pos/` route
- Static assets (fonts, icons)
- Does NOT cache API responses – data comes from IndexedDB when offline

### Offline Transaction Flow
1. Cashier adds items to cart – reads from `localInventory` (IndexedDB)
2. Cashier processes payment
3. Client generates `offlineId` = `crypto.randomUUID()`
4. Transaction is written to `pendingTransactions` table in IndexedDB with status `pending`
5. Local `quantityOnHand` is decremented in `localInventory` for each line item
6. Receipt is rendered using local data with offline receipt number format: `OFF-{sessionId}-{counter}`
7. Transaction complete from cashier's perspective – UI returns to idle state

### Connectivity Detection
```typescript
// lib/pos/connectivity.ts
// Poll every 30 seconds. Do not rely solely on navigator.onLine.
let isOnline = navigator.onLine;

async function checkConnectivity(): Promise<boolean> {
  try {
    const res = await fetch('/api/ping', { method: 'HEAD', cache: 'no-store' });
    isOnline = res.ok;
  } catch {
    isOnline = false;
  }
  return isOnline;
}
```

Add `GET /api/ping` – a minimal route that returns `200 OK` with no body. Used only for connectivity checking.

### Sync Engine
Triggered when connectivity is detected (either `navigator.onLine` event or ping success):

```
Sync Algorithm:
1. Read all pendingTransactions where status = 'pending', ordered by createdAt ASC
2. For each transaction:
   a. POST /api/pos/transactions with full payload including offlineId
   b. Server checks: does a posTransaction with this offlineId exist for this org?
      - YES – return existing transaction (idempotency – do not double-process)
      - NO  – process transaction normally, return new transaction
   c. On 200/201 – mark local record as 'synced', store server-assigned id
   d. On 409 conflict (inventory issue) – mark as 'synced' with conflict flag, notify UI
   e. On 401 – stop sync, redirect to login with session-expired flag
   f. On other error – increment attempts, retry on next sync cycle (max 5 attempts)
3. After all transactions processed – refresh localInventory from server
4. Emit sync complete event to UI
```

### Conflict Handling

**Conflict Type A – Inventory depleted server-side:**
Item X had 3 units. Cashier sold 3 offline. When syncing, server's `quantityOnHand` is already 0 (another terminal or online transaction consumed the stock).

Resolution: The server processes the transaction but sets `inventoryConflict: true` on the response. Inventory is allowed to go negative in this edge case – a manager resolves via an inventory adjustment. The financial transaction is preserved. The sync result includes a conflict report shown to the manager, not the cashier.

**Conflict Type B – Duplicate transaction (network drop mid-response):**
Sync POST reached the server and was processed, but the client didn't receive the response. On retry, the same `offlineId` is sent again.

Resolution: Server's idempotency check catches this. Returns the existing transaction with a `200` status. Client marks local record as synced. No duplicate sale created.

**Conflict Type C – Expired session:**
Cashier was offline for >5 days (unlikely but possible). Session cookie is expired.

Resolution: Sync attempt returns `401`. Sync engine stops, saves current queue state, redirects to login with `sessionStorage.setItem('pos_sync_pending', 'true')`. After re-login, POS resumes and triggers sync automatically.

### Server-Side Idempotency (Critical)
The `POST /api/pos/transactions` route must:
```
1. Extract offlineId from request body
2. Query posTransactions where offlineId == value AND organizationId == orgId
3. If found – return existing transaction with status 200 (no re-processing)
4. If not found – proceed with normal transaction creation
```
This check must happen before any inventory mutation. It must be inside the Firestore transaction/batch to be safe.

### UX States for Cashier

The POS terminal header shows one of three persistent indicators:

| State | Indicator | Message |
|---|---|---|
| Online | 🟢 Green dot | (no message – normal state) |
| Offline | 🟡 Amber dot | "Working offline – transactions will sync when reconnected" |
| Syncing | 🔵 Blue dot + spinner | "Syncing [N] transactions..." |
| Sync conflict | 🔴 Red badge | "X transactions need review" (manager attention) |

Cashiers are never blocked from processing sales due to offline state.

A "Sync Now" button is always visible to cashiers and can trigger manual sync at any time. This is the primary mechanism for environments where Background Sync API is unavailable (Safari, iOS).

### Safari / iPad Compatibility
The Background Sync API is not available in Safari. The offline strategy must work without it:
- Use ping polling (30s) as primary sync trigger
- Use `visibilitychange` event (tab focus) as secondary trigger – attempt sync every time cashier returns to the POS tab
- Show the persistent "X pending transactions" badge as the primary offline indicator
- "Sync Now" button is the manual escape hatch

Do NOT rely on Background Sync as the only sync mechanism.

### New API Routes for Offline Support
```
GET  /api/ping                          – Connectivity check. Returns 200 OK, no body.

POST /api/pos/transactions/sync         – Batch sync endpoint (optional optimization).
     Body: { transactions: PosTransactionPayload[] }
     Processes multiple offline transactions in sequence, returns results per transaction.
     Avoids N individual round trips when syncing a large offline queue.
```

### Implementation Order for Offline Support
1. Add `GET /api/ping` route
2. Install and configure `next-pwa` (Workbox) – cache POS shell only
3. Install `dexie` package
4. Create `lib/pos/offline-db.ts` with Dexie schema
5. Create `lib/pos/connectivity.ts` with polling logic
6. Create `lib/pos/sync-engine.ts` with sync algorithm
7. Update `POST /api/pos/transactions` with idempotency check (if not already present)
8. Update POS terminal UI to read from IndexedDB when offline
9. Update POS terminal UI to write to IndexedDB when offline
10. Add connectivity state indicator to POS terminal header
11. Add "Sync Now" button to POS terminal
12. Add sync conflict review UI for managers
13. Test: simulate offline (DevTools – Network – Offline), process 5 sales, go back online, verify sync

---

## 4. Cross-Cutting Concerns

### Audit Logging Pattern (Existing – Do Not Change)
All POS mutations must call the existing `writeAuditLog()` from `lib/audit/logger.ts`. No exceptions. The pattern is already established – follow it exactly as other modules do.

### Permission Checking Pattern (Existing – Do Not Change)
All POS API routes must use the existing `verifySessionCookie()` from `lib/firebase/auth-helpers.ts` and check the user's POS permissions using the existing permission resolution logic. Do not create a parallel auth system for POS.

### Localization (Existing – Must Apply to POS)
All POS UI strings must use the existing `useT()` hook. No hardcoded English strings. Add POS translation keys to `/locales` as each UI surface is built.

### Dark Mode (Existing – Must Apply to POS)
The POS terminal layout must respect the existing theme system (`theme.store.ts`, CSS variables). The terminal is a different layout, but it uses the same CSS variable tokens.

### Firestore Multi-Tenant Isolation (Existing – Apply to All POS Collections)
Every POS Firestore query must filter by `organizationId`. No exceptions. This is the existing pattern across all collections – POS follows it exactly.

---

## 5. Dependencies and Prerequisites Summary

```
Environment Separation
  └─ Must complete before any POS development begins

POS Module (Online)
  └─ Requires: Environment Separation complete
  └─ Requires: pos FeatureKey added to subscription system
  └─ Requires: inventory items updated with posEnabled, barcode, posPrice fields
  └─ offlineId field on posTransactions must be present from day one

Offline POS Support
  └─ Requires: Online POS stable in staging
  └─ Requires: offlineId idempotency on POST /api/pos/transactions
  └─ Requires: next-pwa and dexie installed
```

---

## 6. What This Document Is Not

- This document does not describe the native mobile app – that decision is deferred
- This document does not describe payment processor integration (Stripe, etc.) – payment method tracking exists but actual processing is out of scope
- This document does not describe hardware integration (cash drawers, thermal printers, barcode scanners) beyond the barcode lookup API endpoint – hardware pairing is a future concern
- This document does not describe SMS notifications – the SMS stub in the codebase remains out of scope
- This document does not describe SSO enablement – the commented-out OIDC code remains disabled until separately decided
