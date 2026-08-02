# Report 3 — Test System Capabilities & Threshold

**Project:** Makhzoon
**Phase:** 1 — Baseline analysis (read-only)
**Date:** 2026-07-24
**Method disclosure (read this):** This report combines (a) **static code inspection** of the flows and (b) **one non-mutating execution** of the automated test suite (`npx vitest run`). I did **not** perform live end-to-end walkthroughs against a running deployment, and I did **not** load-test. Where a capability is asserted "working", it means *the code path is complete and internally consistent* and, where noted, *covered by a passing automated test* — **not** that it was manually exercised against dev/stg. This distinction is called out per row.

---

## 1. Test method summary

| Method | Used? | Detail |
|---|---|---|
| Automated unit/contract tests | ✅ Yes (executed) | `vitest run` → **80 passed / 80**, 12 files, 2.24s. |
| Static walkthrough of code paths | ✅ Yes | Traced routes → services → repositories → DB for each capability below. |
| Manual end-to-end UI walkthrough | ❌ No | Not performed in this phase (no live session driven). |
| Scripted/integration HTTP tests | ❌ No such tests exist | No supertest/Playwright/API-integration harness in repo. |
| Load / soak testing | ❌ No | No k6/Artillery/Locust config; assessed by design analysis only. |

**Existing automated coverage (what the 80 tests actually cover):**
```
tests/platform/  api-guards.contract · tenant-scoping.contract · permissions ·
                 rate-limit · require-feature · csrf-cron · secret-cipher
tests/haraka/    pricing · delivery-token · camera-scanner
tests/inventory/ stock-status
tests/compliance/scaffolding
```
The suite is **weighted toward platform security invariants** (auth guards, tenant scoping, permission/feature gating, rate limiting, secret encryption) — the highest-value things to lock down — plus a few module unit tests (POS pricing math, delivery-token lifecycle, barcode camera, stock-status logic).

**Coverage gaps (no automated tests):** auth/login round-trip, asset/warranty/request **HTTP CRUD**, request approval workflow, export generation, audit-log emission, subscription enforcement end-to-end, notifications, and the entire haraka order/service-job/transaction money path beyond pricing. Manual scenarios are catalogued (not automated) in `docs/TEST_CASES.md`, `Makhzoon_QA_Test_Cases.xlsx`, and `docs/UI_*_TEST*.md`.

---

## 2. Capability status (functional completeness by inspection)

| Capability | Code-path status | Automated test? | Notes |
|---|---|---|---|
| **Auth / login** | ✅ Complete | Indirect (guards, scoping, csrf-cron) — no login E2E | Email/password via Supabase; `verifySessionCookie` validates JWT + revocation + authoritative role/org. Robust by inspection; not walked through live. |
| **Asset CRUD** | ✅ Complete | ❌ | Create via new `AssetsService`; read/update/delete via legacy service (org-checked). Two code paths (Report 1 §3.1). |
| **Warranty CRUD** | ✅ Complete | ❌ | `app/api/warranties/*` + `lib/modules/warranties`. Export endpoint present. |
| **Request submit / approve / reject** | ✅ Complete | ❌ | `app/api/requests/*` (+ `[requestId]/approve|reject`). Approval flow present; not exercised live. |
| **Exports** | ⚠️ Complete but flawed | ❌ | CSV works; **`assets/export` truncates at 1000 rows** (`app/api/assets/export/route.ts:17`). Audit-log export paginates. Inconsistent across modules. |
| **Audit logging** | ✅ Complete | ❌ | Queued writes on mutations (`lib/audit/logger.ts`); superadmin `backend-logs`. |
| **Subscription read / enforcement** | ✅ Complete | Partial (`require-feature` unit test) | `resolveTenant` loads subscription; `requireFeature`/`checkResourceLimit` gate features + limits; suspended orgs blocked; daily `subscription-status` cron. Feature-gate logic is unit-tested; full enforcement not E2E-tested. |
| **Multi-tenant isolation** | ✅ Complete | ✅ `tenant-scoping.contract` | Contract test asserts scoping — good. |
| **Rate limiting** | ✅ Complete | ✅ `rate-limit` | Durable + fallback, tested incl. fail-open path. |
| **ZATCA / Fawtara e-invoicing** | 🟡 Stubbed | ❌ | Client is placeholder pending credentials (`fawtara/client.ts:5`). Not functional end-to-end. |

**Bottom line:** the core PRD flows are **code-complete and coherent**, and the security substrate under them is **automatically tested and passing**. What's missing is *behavioural* test evidence (E2E/integration) for the business flows themselves.

---

## 3. Threshold testing against PRD targets

> No live measurement was taken this phase. The assessments below are **design-based** (query shape + index availability + runtime model), clearly labelled as such. They should be confirmed with real timing in Phase 2.

### 3.1 Asset list load < 1s — **Likely PASS by design (unverified live)**
- The list query is a single indexed `select … .match({organization_id[, space_id, status, category]}) .order(sortCol) .range(...)` bounded to a small page (default 10), backed by composite indexes `assets_org_status_idx` / `assets_org_category_idx`. At page size ≤ 50 this is a sub-100ms DB operation on a properly-indexed table.
- **Caveats that could break the target:** (a) a second `count: 'exact'` query runs per page (extra round trip; exact count cost grows with table size); (b) Worker cold start + `resolveTenant`'s 2–4 uncached auth queries add latency on cold requests; (c) `ilike '%search%'` free-text filters are **not** index-assisted and will scan within the org partition. Realistic p50 well under 1s; **cold-start p99 is the risk**, not steady-state.

### 3.2 API response < 500ms — **Likely PASS steady-state; cold path at risk (unverified)**
- Typical handler = 1 auth resolution (cached 5s) + 1–2 scoped, indexed queries + audit enqueue. Steady-state should sit comfortably under 500ms.
- **At-risk cases:** cold isolate (auth cache miss → several sequential Supabase round trips), free-text search, exports (see below), and any endpoint doing per-row follow-up reads (see Report 4 N+1 notes).

### 3.3 Scalability toward 500+ orgs / 1,000+ assets per org — **Query/index design holds; two concrete blockers**
- **Holds:** every hot table is `organization_id`-indexed (0028) with composite `(org, status/category/…)` indexes for filtered lists; RLS + service-role path both scope by org; pagination bounds result sets. 500 orgs is trivial for Postgres; 1,000 assets/org is small per-partition. **The core read design scales.**
- **Blocker 1 — export truncation:** `assets/export` caps at **1,000 rows**, i.e. it *silently fails the "1,000+ assets/org" target for exports specifically* (an org at/over 1,000 assets gets an incomplete file). Must be fixed before claiming the scalability target.
- **Blocker 2 — non-atomic POS counters:** receipt/invoice/stock counters use non-transactional read-modify-write (Report 4 §1). Under concurrent registers at scale this risks duplicate receipt numbers / stock drift — a *correctness* scaling limit, not a throughput one.
- **Watch items at scale:** offset pagination deep-page cost (TD-5), `count:'exact'` per list, per-isolate caches yielding low hit-rates as traffic spreads across many Workers.

---

## 4. Honesty ledger — tested vs assumed

| Claim | Basis |
|---|---|
| "80 tests pass" | **Observed** — I ran `vitest run`. |
| "Source typechecks clean" | **Inferred** — `tsc` errors are all in a stale `.next` artifact, not source (Report 1 §5). |
| "Core CRUD flows are complete" | **Inferred from code**, not exercised live. |
| "< 1s / < 500ms targets likely met" | **Design estimate**, no live timing captured. |
| "Scales to 500 orgs / 1,000 assets" | **Design assessment** with two named blockers; not load-tested. |
| "Subscription enforcement works" | Feature-gate logic **unit-tested**; full path **not** E2E-tested. |

**Recommended Phase-2 verification (not done here):** add HTTP integration tests for the six business flows above; capture real p50/p99 timings on dev for asset-list and a representative write; seed a 1,000-asset org and measure list + export; concurrency-test receipt allocation. *(No backup/DR testing performed — out of scope, flagged.)*
