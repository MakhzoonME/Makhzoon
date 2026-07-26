# Report 6 — Bug List & Bug Estimation

**Project:** Makhzoon
**Date:** 2026-07-24
**Branch:** `DevBranch` (HEAD `7c21924`)
**Prepared by:** automated analysis + test execution + browser check (read-only; no code changed)

---

## 1. Testing performed (evidence base)

| Activity | Result |
|---|---|
| **Automation suite** — `npx vitest run` | ✅ **80 / 80 passed** (12 files, 2.0s). Includes the tenant-scoping + API-auth-guard **contract tests** and permission/rate-limit/csrf tests. **No failing tests → no bugs surfaced by the unit suite.** |
| **Browser test — deployed dev, unauthenticated** (`https://dev.makhzoon.me`) | ✅ Gate + public surfaces healthy. Cloudflare Access (Zero-Trust) fronts the whole env — a positive control. Marketing + login pages render; `/api/version` 200, static assets cached (304); no 500s/CSP errors. |
| **Browser test — deployed dev, AUTHENTICATED** (as `Owner16`, org `org16`) | ✅ **Completed.** Walked Dashboard, Usool, Requests, Users/Invite, Reports, Warranties, Haraka POS. **App is runtime-stable: no 500s, no console errors, all API calls 200.** Surfaced **BUG-12/13** (below) and confirmed/extended BUG-02. |
| **Browser test — local dev** (`http://localhost:3000`) | 🔴 **All routes return HTTP 500** — including trivial `/api/ping` and `/api/version`. The whole local server is down (env/build state). See BUG-11. |

**Consequence for this report:** the unit suite is green and the deployed dev app was exercised interactively as an org owner. The runtime pass found the app **stable with no crashes or console errors**, but surfaced a **metric-consistency defect (BUG-12)** and confirmed **BUG-02** live. Items still marked **“needs runtime confirmation”** require a specific mutation (sending an invite, making a POS sale) that I did not perform without explicit approval.

> **Not tested (needs a mutation you approve):** BUG-01 concurrency (requires two simultaneous POS sales), BUG-04 payment webhook (requires a card callback), BUG-06 invite-failure UI (requires a failing email send), CSV export truncation (a file download). Say the word and I’ll drive any of these on the dev environment.

---

## 2. Bug list (defects)

Severity: 🔴 Critical · 🟠 High · 🟡 Medium · 🟢 Low
Confidence: **Confirmed** (verified in code) · **Needs runtime confirmation**

| ID | Sev | Bug | Evidence | Impact | Confidence |
|---|---|---|---|---|---|
| **BUG-01** | 🔴 | **Non-atomic POS counters & stock ledgers** (read-modify-write, no lock/transaction). Two concurrent registers can mint **duplicate receipt/invoice numbers**; concurrent stock ops can **drift quantities**. | `lib/modules/haraka/transactions/transactions.repository.ts:108-134` (dev comment: “harden via an RPC for concurrent registers”); also `fawtara/invoice-numbering.ts`, `inventory.repository.ts:452`, `purchases.repository.ts:257`, `stock-audit.repository.ts:187`, `sessions.repository.ts:96` | Money-path correctness; surfaces under real multi-register concurrency (the PRD scale target). Hard to reverse. | Confirmed |
| **BUG-02** | 🟠 | **1,000-row cap on assets.** `assets/export` truncates CSV at 1,000 rows; **live confirmation:** the Usool list page also issues `GET /api/assets?pageSize=1000` on load — it pulls the whole asset set to the browser for client-side counts/filtering, so **>1,000 assets breaks the list view too**, not just export (also a client-side payload bottleneck). | `app/api/assets/export/route.ts:17`; observed request `GET /api/assets?pageSize=1000` on `usool/list` | Data loss on export + broken counts/filtering >1,000; breaks the “1,000+ assets/org” target. | **Confirmed (static + live)** |
| **BUG-03** | 🟠 | **Latent cross-tenant write.** New `AssetsRepository.update()/delete()` filter by `id` only — **no `organization_id` guard** — on the service-role client (which bypasses RLS). Not reachable via the current asset route (it uses the legacy org-checked service), but any future wiring to the new repo = cross-tenant write. | `lib/modules/assets/repositories/assets.repository.ts:187,210` | Tenant-isolation breach if the method is reused. RLS will **not** catch it. | Confirmed (latent) |
| **BUG-04** | 🟠 | **Payment webhook auth unverified.** `card-payment-result` has no session/tenant guard; must authenticate the terminal callback (signature/shared secret) before trusting payment status. | `app/api/haraka/card-payment-result/route.ts` | If unauthenticated, a forged callback could mark orders paid. | **Needs runtime confirmation** |
| **BUG-05** | 🟡 | **Non-transactional account creation → orphaned auth user.** Signup / invite-accept create the auth identity, then `public.users`, then subscription with no transaction or full rollback. A mid-sequence failure leaves an auth user that can log in but has no org context (400 on every request). | `app/api/organizations/self-serve/route.ts:41-100`, `app/api/invites/[token]/accept/route.ts:45-91` | Broken, unrecoverable accounts; support burden. | Confirmed |
| **BUG-06** | 🟡 | **Invite “sent” status can be misleading.** The invite row is created before the email send; on Resend failure the API returns `messageSent:false` + a QR/URL fallback, but if the UI doesn’t surface `messageSent:false`, an invite looks sent while no email went out. | `app/api/superadmin/invite/route.ts:105-123` | Users never receive invites; silent onboarding failure. | **Needs runtime confirmation** (UI) |
| **BUG-07** | 🟡 | **`verifyIdToken` trusts JWT claims for role/org** (does not re-read authoritative `public.users`, unlike `verifySessionCookie`). If any authz path uses it, a stale/elevated claim is trusted. | `lib/supabase/auth-helpers.ts:224-240` | Potential stale-privilege authorization. | Confirmed (impact depends on usage) |
| **BUG-08** | 🟡 | **Email ownership never verified** (`email_confirm: true` on all created users). Self-serve can register any address. | `lib/supabase/auth-admin.ts:25` | Impersonation/typo accounts; deliverability. Deliberate for the stage, but a pre-GA gap. | Confirmed |
| **BUG-09** | 🟢 | **`CRON_SECRET` compared non-constant-time** (timing side-channel; self-tracked TD-4). | `lib/cron-auth.ts` / `lib/csrf.ts` `checkCronSecret` | Low (long random bearer), but trivially fixable with `timingSafeEqual`. | Confirmed |
| **BUG-10** | 🟢 | **Stale `.next` breaks the project’s own `verify` script.** `tsc --noEmit` errors on generated types referencing removed `haraka/reception*` routes; `npm run verify` fails until `.next` is rebuilt/cleared. | Observed: 7 `tsc` errors, all in `.next/types/validator.ts` (source is clean) | CI/verify friction; masks real type checks. | Confirmed |
| **BUG-11** | 🟢 | **Local dev server returns 500 on every route** (incl. `/api/ping`), blocking local testing. Global failure ⇒ environment/build issue (missing env vars or the stale `.next`), **not** a shipped-code defect. *(Deployed dev is healthy — `/api/version` 200 — so this is local-only.)* | `curl`/browser: `/`, `/en`, `/en/login`, `/api/ping`, `/api/version` → all 500 | Blocks local browser/QA testing. | Confirmed (environment) |
| **BUG-12** | 🟠 | **“Total assets” disagrees across screens** for the same org+space (Default). **Dashboard = 10** (6 active) · **Usool register = 12** (11 active / 1 retired) · **Reports = 20** (19 active / 1 retired). Reports/POS are labelled org-wide while Usool is space-scoped, which explains Reports=20 vs Usool=12 — but the **Dashboard’s 10 reconciles with neither**, indicating a genuine miscount, not just scoping. Warranty (3 expiring) and request (3 pending) counts *were* consistent, so the defect is asset-count-specific. | Live screens (org16/Default): dashboard vs `usool/list` vs `reports` | KPI/reporting trust; users see three different totals. | **Confirmed** (found in browser) |
| **BUG-13** | 🟢 | **Inconsistent labelling in the add-member flow**: the button reads **“Create User”**, the dialog title **“Invite Team Member”**, and the action **“Send Invite”** — three names for one flow. | `/en/org16/users` → open dialog | Minor UX confusion. | Confirmed |

---

## 3. Bug estimation

**Basis:** rough engineering estimates for **one mid-level developer familiar with this stack**, including implementation + unit test + PR review. Ranges are ±50%; items needing a product decision are noted. 1 day = ~6 focused hours.

| ID | Sev | Fix approach | Est. effort | Complexity / risk |
|---|---|---|---|---|
| BUG-01 | 🔴 | Move each counter/ledger to an atomic Postgres RPC or `SELECT … FOR UPDATE` (reuse the `increment_rate_limit()` pattern from migration `0036`). ~5 counters. | **2–3 days** | High — money path; needs concurrency tests. |
| BUG-02 | 🟠 | Stream/loop full result set (or server-side CSV) instead of a 1,000 cap. | **0.5 day** | Low. |
| BUG-03 | 🟠 | Add `.eq('organization_id', tenant.organizationId)` to update/delete; audit all `lib/modules/*` repos for the same pattern. | **0.5 day** | Low–Med (audit breadth). |
| BUG-04 | 🟠 | Verify/implement callback authentication (signature or shared secret); add a test. | **0.5 day** | Med — investigation first. |
| BUG-05 | 🟡 | Wrap provisioning in a DB transaction/RPC, or add compensating cleanup on failure. | **0.5–1 day** | Med. |
| BUG-06 | 🟡 | Surface `messageSent:false` in the invite UI (badge + “resend/copy link”). | **0.25–0.5 day** | Low. |
| BUG-07 | 🟡 | Re-read role/org from `public.users` in `verifyIdToken`, or restrict its use to non-authz paths. | **0.25–0.5 day** | Low–Med. |
| BUG-08 | 🟡 | Introduce an email-verification / confirm-email flow (product decision on gating). | **1–2 days** | Med — product + UX. |
| BUG-09 | 🟢 | Swap to `crypto.timingSafeEqual`. | **~0.25 day** | Trivial. |
| BUG-10 | 🟢 | Clear `.next` in CI before `tsc`; add a `predev`/`verify` clean step. | **~0.25 day** | Trivial. |
| BUG-11 | 🟢 | Diagnose local env (check required `NEXT_PUBLIC_*`/service keys, rebuild `.next`). | **~0.25 day** | Trivial (environment). |
| BUG-12 | 🟠 | Define one canonical asset-count service (agree space vs org scope + status rules); reuse it in Dashboard, Usool, and Reports; add a test asserting they agree. | **0.5–1 day** | Med — must nail down intended semantics first. |
| BUG-13 | 🟢 | Align the labels ("Invite Team Member" throughout, or "Add member"). | **~0.1 day** | Trivial. |

### Roll-up

| Severity | Count | Estimated effort |
|---|---|---|
| 🔴 Critical | 1 | 2–3 days |
| 🟠 High | 4 | 2–3 days |
| 🟡 Medium | 4 | 2–4 days |
| 🟢 Low | 4 | ~0.85 day |
| **Total (defects)** | **13** | **≈ 7–10.5 developer-days** |

---

## 4. Tech-debt / quality backlog (not “bugs”, estimated separately)

These are design/quality items from Reports 1–4 — they affect maintainability and scale, not current correctness. Listed so the estimate above isn’t confused with a full remediation budget.

| ID | Item | Est. effort |
|---|---|---|
| TD-A | Consolidate the **3 overlapping data layers** (`lib/db` + `lib/services` legacy vs `lib/modules`) to one per module | **Multi-week** |
| TD-B | Remove `typescript.ignoreBuildErrors:true` (after BUG-10) so type errors fail the build | 0.25 day |
| TD-C | Delete dead Firebase code `functions/src/lib/*` + committed junk (`acc`, `finally`, `PublicCompositeTypeNameOrOptions`, `DefaultSchemaTableNameOrOptions`); decide on `prototype/`, `superadmin/sync` | 0.5 day |
| TD-D | Cursor/keyset pagination + drop `count:'exact'` on large lists (assets, inventory, audit-logs) | 2–4 days |
| TD-E | SQL-side reporting aggregation (replace in-JS bucketing) | 1–2 days |
| TD-F | Materialise `quantity_on_hand` so stock-status/quantity sort & filter in SQL | 1 day |
| TD-G | Client bundle audit (framer-motion, logrocket, posthog, clarity) for first-load/cold-start | 1 day |
| TD-H | Resolve ~57 remaining lint warnings (hydrate set-state-in-effect) | 0.5–1 day |
| TD-I | Finish ZATCA/Fawtara e-invoicing (stubbed; blocked on credentials) | 2–4 days (credential-dependent) |
| TD-J | Update stale docs — esp. `MAKHZOON_FUTURE_ARCHITECTURE.md` (still Firebase) | 0.5 day |

**Tech-debt subtotal:** roughly **3–4 developer-weeks** beyond the defect fixes (dominated by TD-A).

---

## 5. Recommended fix order

1. **BUG-04** (verify first — potential unauthenticated payment callback) → **BUG-01** (money-path correctness) → **BUG-03** (tenant isolation). *Highest risk.*
2. **BUG-02** (data-loss export + broken list >1,000), **BUG-12** (reconcile asset KPIs across Dashboard/Usool/Reports), **BUG-05/06** (onboarding reliability).
3. **BUG-07/08** (auth hardening — some are product decisions).
4. **BUG-09/10/11** (quick wins; do alongside — ~¾ day total).
5. Tech-debt per Phase-2 planning, starting with **BUG-10 → TD-B** and **TD-C** (fast hygiene), then **TD-A** (the big structural payoff).

*Estimates are planning-grade, not commitments. Re-run this list against an authenticated environment (once BUG-11 or the Access login is resolved) to add any UI/runtime defects not visible to static analysis — several items above are marked “needs runtime confirmation.”*
