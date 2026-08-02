# Report 4 — Bottleneck Analysis

**Project:** Makhzoon
**Phase:** 1 — Baseline analysis (read-only)
**Date:** 2026-07-24
**Method:** Static analysis of query shapes, indexes, runtime model, and client bundle composition. No profiling against a live deployment was performed; where a bottleneck is a *design* concern vs a *measured* one, it is labelled. No changes made.

---

## Severity legend
🔴 High (correctness or scale-blocking) · 🟠 Medium (latency/cost at scale) · 🟡 Low (watch item)

---

## 1. 🔴 Non-atomic counters & ledgers (former Firestore transactions → read-modify-write)

The single most important bottleneck is **correctness under concurrency**, not throughput. Multiple counters were ported from Firestore multi-doc transactions to **non-transactional read-modify-write (RMW)** on Postgres, and the code says so:

- **Receipt numbering** — `lib/modules/haraka/transactions/transactions.repository.ts:108`
  > *"Allocate the next per-org receipt number. Was a Firestore transaction; read-modify-write … acceptable for the internal/staging scope (harden via an RPC for concurrent registers)."*
  It reads `last_receipt_number`, computes `+1`, and upserts. **Two concurrent sales from two registers in the same space can read the same value and mint duplicate receipt numbers.**
- **Same pattern** in: invoice numbering (`fawtara/invoice-numbering.ts`), inventory stock ledger append (`inventory.repository.ts:452`), purchase-received stock (`purchases.repository.ts:257`), stock-audit totals (`stock-audit.repository.ts:187`), and the single-open-session invariant (`sessions.repository.ts:96`, "re-check before insert").

**Why it matters:** this is the POS *money path*. Duplicate receipt/invoice numbers and stock drift are user-visible, hard-to-reverse defects that only surface under real concurrency (multi-register orgs) — exactly the "scale" condition the PRD targets.
**Contrast:** the team already solved the identical problem *correctly* for rate limiting via a Postgres RPC (`increment_rate_limit()`, migration `0036`). Applying the same RPC/`SELECT … FOR UPDATE` pattern to these counters closes the gap. **(Report only — do not implement in Phase 1.)**

---

## 2. 🔴 `assets/export` hard-capped at 1,000 rows

`app/api/assets/export/route.ts:17` → `getAssets(orgId, { pageSize: 1000 })`. Any org with >1,000 assets exports a **silently truncated** CSV. This both loses data and directly contradicts the "1,000+ assets/org" scalability target. Should stream/paginate the full set.

---

## 3. 🟠 N+1 / per-row query patterns — mostly avoided (one real, one benign)

I specifically searched for the `map(async … await query)` signature.

- **Inventory quantities — well-designed, NOT an N+1.** The list resolves current quantity for all items via a **single set-based RPC** `inventory_latest_quantities(item_ids)` (`inventory.repository.ts:99`). The per-item `computeQuantity` loop exists only as a **bounded (50/chunk) fallback** when the RPC errors (`:113-121`). This is the correct pattern — call out as a *positive*.
- **Notification / web-push fan-out** (`lib/notifications/notification-queue.ts:100`, `lib/webpush/index.ts:42`) use `map(async …)` over recipients. This is legitimate fan-out (send to N subscribers), not a hot read path; acceptable, though large recipient sets should be chunked/queued.
- **No naive per-row DB reads found in the hot list endpoints inspected.**

---

## 4. 🟠 Derived fields can't be filtered/sorted in SQL → in-app processing

`inventory.repository.ts` `SORT_COLUMN` (`:127`) marks **quantity** and **stock-status** as *derived* ("can't be sorted in SQL"). Consequences:
- Sorting or filtering a list by stock-status/quantity cannot be pushed to the database, so it must be computed and applied **in application memory** — which can require fetching **more than one page** to satisfy a page of results, partially defeating pagination for those views.
- At 1,000+ items with a stock-status filter, this becomes an in-memory scan per request. **Watch item at scale**; a materialised `quantity_on_hand` column kept current (or a computed view) would let SQL do the work.

---

## 5. 🟠 `count: 'exact'` on every list request

Each paginated list issues a **second** query with `{ count: 'exact', head: true }` (e.g. `assets.repository.ts:103-108`) to compute totals/pages. Exact counts on large filtered tables are more expensive than the page fetch itself and add a round trip to every list call. At scale, switch hot lists to estimated/planned counts or cache totals.

---

## 6. 🟠 Offset pagination (TD-5, self-flagged)

Lists use `.range(from, to)` offset pagination. Deep pages (`OFFSET n`) require Postgres to walk and discard `n` rows; cost grows with page depth. `docs/PROJECT_STATUS.md` TD-5 already records "no cursor-based pagination on large list views (assets, inventory, audit-logs)." Fine at current volumes; cursor/keyset pagination recommended for the large lists before heavy load.

---

## 7. 🟠 Reporting aggregation loads full result sets into app memory

`TransactionsRepository.aggregate()` (`transactions.repository.ts:163-169`) does `.from('pos_transactions').select('*')` over a date range, then buckets/sums **in JavaScript**. For a busy org across a wide date window this pulls a large row set into the Worker (memory + transfer + CPU). Prefer SQL-side aggregation (`GROUP BY`, `SUM`) or a pre-aggregated rollup for reports. Also relevant to the Worker CPU-time limit (§10).

---

## 8. 🟡 Free-text search is not index-assisted

List `search` builds `ilike '%term%'` across several columns (`assets.repository.ts:99-101`). Leading-wildcard `ilike` cannot use a b-tree index and scans within the org partition. Acceptable per-org at small volumes; consider `pg_trgm` GIN indexes or full-text search if search becomes hot on large orgs.

---

## 9. 🟡 `getCategories()` full-column scan + app-side de-dup

`AssetsRepository.getCategories()` (`:131-145`) selects the `category` of **all** org assets and de-dupes in memory. O(assets) per call. A `SELECT DISTINCT category` (indexable) or a small cached lookup scales better.

---

## 10. Edge / OpenNext-on-Workers specific bottlenecks

| # | Item | Sev | Detail |
|---|---|---|---|
| 10.1 | **Cold starts** | 🟠 | OpenNext serves the whole Next app from one Worker. First request to a cold isolate pays init + module load. Combined with §10.2 this drives p99 for otherwise-fast endpoints. |
| 10.2 | **`resolveTenant` cold-cache round trips** | 🟠 | On a cache miss, session resolution does 2–4 sequential Supabase admin queries (`getUser` + `superadmin_users` + `users` + permissions). The 5s/10s in-memory cache (`session-cache.ts`) is **per-isolate and ephemeral** on Workers → low cross-request hit-rate, so many requests pay the cold path. |
| 10.3 | **Per-isolate caches generally** | 🟡 | Both the session cache and the rate-limiter's local Map are per-isolate. Rate limiting correctly backs onto a durable Postgres store; the **session cache has no durable tier**, so it mostly helps within a burst on one warm isolate. |
| 10.4 | **Client bundle weight** | 🟠 | `framer-motion`, `logrocket`, `posthog-js`, `@microsoft/clarity`, plus GTM — several heavy client SDKs (see CSP allowlist in `next.config.mjs:49`). Increases JS payload/hydration cost; affects the "asset list < 1s" first-load target. No bundle analysis artifact found in-repo — recommend `@next/bundle-analyzer` in Phase 2. |
| 10.5 | **Worker CPU/limits** | 🟡 | In-Worker aggregation (§7) and large exports (§2) push toward Cloudflare's per-request CPU time and response-size limits. Move heavy compute to SQL. |
| 10.6 | **`count:'exact'` + double round trips** | 🟠 | Each round trip to Supabase from the Worker crosses the network; minimising queries/request matters more on Workers than on a co-located server. |

---

## 11. Client-side bottlenecks

- **Unbounded client-side filtering:** not observed on the primary lists — filtering/pagination are server-side. The exception is the *derived-field* case (§4), which is a server-side in-memory issue, not the browser.
- **State/re-renders:** state is Zustand + TanStack Query (sane). `docs/PROJECT_STATUS.md` notes 57 remaining lint warnings "mostly hydrate-form set-state-in-effect" and a recent fix of ~100 hook-order bugs — a hint that some components had render-cycle issues; worth a targeted React-profiler pass in Phase 2, but no egregious pattern found in static review.

---

## Priority order (for Phase 2 — not actioned now)

1. 🔴 Atomic POS/inventory counters (RPC / row lock) — correctness on the money path.
2. 🔴 Remove the 1,000-row export cap.
3. 🟠 SQL-side aggregation for reports; reduce in-Worker memory/CPU.
4. 🟠 Cursor pagination + drop `count:'exact'` on the large lists.
5. 🟠 Reduce cold-path auth round trips (single combined query / durable session tier) + bundle-size audit.
6. 🟡 Derived stock-status/quantity → materialised column; `pg_trgm` for search; `DISTINCT` categories.
