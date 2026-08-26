# Report 2 — Architecture, Security & Performance

**Project:** Makhzoon
**Phase:** 1 — Baseline analysis (read-only)
**Date:** 2026-07-24
**Method:** Static inspection of routes, `lib/`, `supabase/migrations/`, `wrangler.toml`, `next.config.mjs`, `middleware.ts`. No changes made.

---

## PART A — Architecture

### A.1 Actual structure vs. the (external) Technical Architecture Spec

**Reality (verified):** Cloudflare Workers (via `@opennextjs/cloudflare`) + Supabase (Postgres + Auth + RLS), Next.js **16** App Router, TypeScript, Tailwind + Radix. Deployment is Worker-based (`wrangler.toml` → `.open-next/worker.js`), **not** Cloudflare *Pages Functions*.

**Documented drift (explicitly flagged, per brief):**

| Source | Claims | Reality | Where |
|---|---|---|---|
| Brief "known facts" | Next.js **14** | Next.js **16.2.7** | `package.json` |
| Brief "known facts" | Cloudflare **Pages** | Cloudflare **Workers** (OpenNext); Pages only for static assets binding | `wrangler.toml` |
| Brief "known constraint" | `runtime='edge'` on every dynamic route | **0** routes use it; not required under OpenNext `nodejs_compat` | `app/**`, `wrangler.toml:28` |
| Brief env list | `stage.makhzoon.me` | `stg.makhzoon.me` (+ `rcpt-*` receipt hosts) | `wrangler.toml:57` |
| Brief scope | "no third-party integrations / no custom fields / no automated billing" | Google Drive, ZATCA e-invoicing, card terminals **exist**; `banna` **is** custom fields; POS/subscription exist | `lib/drive`, `lib/modules/haraka/*`, `lib/modules/banna` |
| **`docs/MAKHZOON_FUTURE_ARCHITECTURE.md`** | **Firebase projects, Firestore, Firebase Auth** | Supabase/Cloudflare | 🔴 **In-repo doc is fully Firebase-era — the clearest stale-doc offender** |
| `docs/archive/SECURITY_*.md` | Firebase/Amplify | Supabase/Cloudflare | Already flagged by `docs/AUDIT_ACTION_PLAN_2026-07-05.md` (S8) |
| `docs/PROJECT_STATUS.md` | Partly current, partly stale (e.g. "Vitest configured but unused", "Tests: none") | 80 passing tests exist | Self-flagged (C6) |

> **Important nuance:** the specific docs the brief names — "Technical Architecture Spec", "DB Schema", "Implementation Blueprint" — are **not present in the repo** (they appear to be external/Google-Docs artefacts). The in-repo docs are mostly *already* migrated to Supabase/Cloudflare reality (`docs/Context.md`, `docs/ENVIRONMENTS.md`, `docs/modules-and-features/*`). The one in-repo doc still carrying full Firebase drift is **`docs/MAKHZOON_FUTURE_ARCHITECTURE.md`**.

**Route/module map (actual):**
```
app/[locale]/
  (auth)/         login · signup · reset-password
  (marketing)/    home · product · pricing · customers · security · about · contact
  [orgSlug]/
    [space]/      usool(assets) · raseed(inventory) · haraka(POS) · warranties ·
                  requests · support · banna · audit-logs · reports · dashboard
    settings/     organization · spaces · users · lists · tax-rates · receipt ·
                  invoice · jo-fotara · card-terminal · cash-drawer · warranty-cert · …
    subscription · users · notifications · profile
  superadmin/     dashboard · organizations · packages · leads · team · lists ·
                  audit-logs · backend-logs · support · messages · sync · configuration
  asset/ · invites/            (public/token views)
app/api/          166 route handlers (assets, inventory, haraka/*, warranties, requests,
                  organizations/*, superadmin/*, auth/*, invites/*, notifications, cron, …)
app/{r,inv,w,delivery,service-job-invoice}/   public shareable receipt/invoice/warranty/delivery pages
lib/
  supabase/  platform/(tenancy,permissions,audit,events,limits)  modules/(per-feature)
  db/  services/  permissions/  email/  drive/  rate-limit.ts  csrf.ts  …
workers/cron/     separate Cloudflare cron Worker (warranty-alerts weekly, subscription-status daily)
supabase/migrations/  0001–0046 (+ combined.sql snapshot)
```

Layering (see Report 1 §3.1): **three overlapping data layers** (`lib/db` + `lib/services` legacy vs `lib/modules` new). The `lib/platform/*` layer (tenancy, permissions, audit, events, limits) is the clean, current core.

### A.2 Multi-tenancy — how orgId isolation actually works

**Both RLS *and* application-layer filtering — defence in depth, with app-layer as the primary enforcer.**

1. **Request → tenant context.** Every guarded route calls `resolveTenant()` (`lib/platform/tenancy/resolve-tenant.ts`), which:
   - Verifies the session (`verifySessionCookie()`), deriving `organizationId` **from the authoritative `public.users` row / JWT app_metadata — never from client input**.
   - Resolves the active space from the `x-space-slug` header, **validated against the user's `space_members`** (403 if not accessible).
2. **Primary data path uses the service-role client** (`supabaseAdmin`, `lib/supabase/admin.ts`), which **bypasses RLS by design**. Isolation on this path is enforced by **manual `.eq('organization_id', tenant.organizationId)`** in repositories (e.g. `assets.repository.ts:93`).
3. **RLS is the safety net.** Enabled on **all 66 tables** (verified: `enable row level security` count == `create table` count). Policies use `SECURITY DEFINER` helpers `is_platform_admin()`, `is_org_manager(org)`, `belongs_to_org(org)` (`supabase/migrations/0002_rls.sql`, `0027_haraka_rls_and_pin_hash.sql`, …). These govern any code path using the per-user anon/SSR client.

**Consequence (key architectural fact):** because the app mostly uses the RLS-bypassing service-role client, **RLS does *not* protect against a repository that forgets its org filter** — the manual filter is load-bearing. This is well-documented in `0002_rls.sql` itself. See Security §B.3.

### A.3 Super Admin transfer mode

**Present and functional.** The platform-admin family (`super_admin`, `makhzoon_admin`, `makhzoon_support`) can impersonate a tenant:
- `verifySessionCookie()` reads a `transferOrgId` cookie and, for superadmin roles, overrides `organizationId` with it (`lib/supabase/auth-helpers.ts:150-153`).
- Enter/exit endpoints: `app/api/organizations/transfer/route.ts`, `.../transfer/exit/route.ts`, `app/api/organizations/[orgId]/transfer/route.ts`; supporting `lib/platform/tenancy/transfer.ts` and a Zustand `transfer` store.
- `resolveTenant()` grants platform admins `allSpaces` and skips the `space_members` check (they have no membership rows).

---

## PART B — Security

Overall posture is **strong and deliberately layered** (rate limiting, CSRF origin checks, session revocation, strict CSP/HSTS, audit logging, server-side feature gates). Findings below are mostly *latent/defence-in-depth*, not open holes.

### B.1 Server-side orgId enforcement — confirmed, no client trust
- `organizationId` always originates from the verified session (`resolveTenant`/`verifySessionCookie`), never from request body/query on tenant routes.
- Path-supplied `orgId` routes validate ownership: e.g. `app/api/organizations/[orgId]/usage/route.ts:11-13` returns 403 when `!superadmin && user.organizationId !== orgId`. **No IDOR** found on the routes inspected.
- **Guard coverage:** 150 / 166 API routes carry a session/tenant guard (107 `resolveTenant`, 43 `verifySessionCookie`); the 16 without are legitimately public or token-authenticated (`delivery/[token]`, `invites/[token]`, `public/assets/...`, `ping`, `version`, `packages/public`, `check-subdomain`, `auth/*password-reset`, `push-subscriptions/vapid-key`, `card-payment-result`).

### B.2 Role validation on writes — confirmed, double-layered
- Routes call `requireFeature` + `requirePermission` (`lib/permissions/*`); services **re-check** via `hasPermission` (`lib/platform/permissions`) — e.g. `AssetsService.create` checks permission *and* the subscription feature flag *and* a resource limit before writing. 92 routes contain explicit permission/feature checks; the rest delegate to a service that does.
- Roles + granular staff permissions map cleanly; enforcement is server-side (see Report 5).

### B.3 RLS vs application-layer — the gap to watch
- **Strength:** RLS on 100% of tables; app-layer filtering on the service-role path; both present.
- **Gap (latent):** On the service-role path, org isolation relies entirely on the query carrying the filter. Enforcement style is **inconsistent** — inline `.eq(org)` (good) vs read-then-check vs **no guard at all**. Concrete instance: `lib/modules/assets/repositories/assets.repository.ts` `update()` (line 187) and `delete()` (line 210) filter by **`id` only**. RLS will *not* catch this (service role bypasses it). It is **currently not exploitable** because the live item route (`app/api/assets/[assetId]/route.ts`) uses the *legacy* service, which pre-checks `asset.organizationId === user.organizationId` (`lib/services/assets.service.ts:141-144`). But any future route wired to the new repo could introduce a cross-tenant write. **Report; fix in Phase 2** (add `.eq('organization_id', tenant.organizationId)` to those methods).

### B.4 Secrets handling — confirmed clean
- `wrangler.toml` contains **only public values**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon keys are public by design), app URLs, and the **non-secret** Google Drive *client email* + *folder id* (identifiers, correctly annotated).
- Real secrets are documented as `wrangler secret put` only and read via `process.env` at runtime: `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `CRON_SECRET`, `GOOGLE_DRIVE_PRIVATE_KEY`, `FAWTARA_SECRET_ENC_KEY` (`wrangler.toml:13-18`).
- `next.config.mjs` deliberately has **no `env` block** to avoid inlining server secrets into the client bundle (comment at `next.config.mjs:12-16`). `lib/supabase/admin.ts` is `import 'server-only'`.
- **No secret material committed** in tracked config. (`.env.local` exists locally and is gitignored.) ✅

### B.5 Session / token handling under the Worker runtime
- `verifySessionCookie()` calls `getSession()` then `getUser()` (validates JWT against the auth server, catches banned/deleted), checks a **session-revocation deny-list** (`revoked_sessions`), then re-reads authoritative role/org/permissions from `public.users`.
- Short-lived **in-memory** caches (session 5s, permissions 10s — `lib/supabase/session-cache.ts`). These are **per-isolate** on Workers, so hit-rate is limited and a revoked session/role change is visible after ≤5s within a given isolate — acceptable, but not a global cache.
- Cookies documented as `httpOnly` + `secure` (prod) + `sameSite: 'strict'` (`docs/PROJECT_STATUS.md`); `@supabase/ssr` manages refresh via cookies (edge-safe without explicit `persistSession` flags on the SSR client — see Report 5).

### B.6 Other security notes (report-only)
- **`CRON_SECRET` compare is not constant-time** (self-tracked as TD-4). Low risk (long random bearer), but flagged.
- **`card-payment-result` webhook** (`app/api/haraka/card-payment-result/route.ts`) has no session guard — verify it authenticates the terminal callback (signature/shared secret) before trusting payment status. **Recommend a focused review** in Phase 2.
- **Partial-write on signup/invite** (no DB transaction across auth-user + `public.users` + subscription) → possible orphaned auth user (Report 5).
- **`email_confirm: true`** on all created users bypasses email verification (`lib/supabase/auth-admin.ts:25`) — intentional for the current stage, but means email ownership is unverified.

---

## PART C — Performance

### C.1 Indexes for documented filter patterns — largely present
59 indexes across migrations. **Composite indexes exist for the documented multi-tenant filter patterns:**
- `assets_org_status_idx (organization_id, status)`, `assets_org_category_idx (organization_id, category)` — matches the assets list filters.
- `haraka_orders_org_status_idx`, `haraka_service_jobs_org_status_idx`/`_org_type_idx`, `haraka_retainers_org_status_idx` — POS list filters.
- `audit_logs_org_ts_idx (organization_id, timestamp desc)` — audit pagination.
- `inv_tx_item_idx (item_id, performed_at desc)`, `inventory_items_org_category_idx`, `inventory_items_org_barcode_idx`.
- Migration `0028_performance_indexes.sql` back-filled single-column `organization_id` indexes on ~18 previously-unindexed tables + 3 FK indexes — the product of a prior performance audit.

**Minor gaps:** assets queries also filter by `space_id`, but composite indexes are `(org, status)` / `(org, category)` — there is no `(org, space_id, status)`. At current data volumes the org-prefixed indexes are adequate; revisit at scale.

### C.2 Pagination for lists > 50 items — present, offset-based
- Lists use `.range(from, from+pageSize-1)` with a default `pageSize` (assets default 10; `assets.repository.ts:88`) and an **exact `count` (`head:true`) query per request** for total/pages.
- **Offset (not cursor)** pagination — the team self-flags this (TD-5) as costly on deep pages / large tables. See Report 4.
- **Exception — exports:** `assets/export` uses `pageSize: 1000` (single page, hard cap → truncation). Not true pagination; a scalability defect (Report 1 §1, Report 4).

### C.3 Full-table scans / unfiltered queries
- No unfiltered tenant queries observed on the guarded paths — all repository reads start from `organization_id`.
- **Soft scans:** `AssetsRepository.getCategories()` selects the `category` column for **all** org assets and de-dupes in app memory (`assets.repository.ts:131-145`) — O(n) in asset count, unbounded. Fine now; a `distinct`/materialised approach scales better.
- The `count: 'exact'` on every list call is a second query each page; on very large tables `exact` count is itself a scan (mitigated by indexes). Consider `estimated`/`planned` counts at scale.

### C.4 Edge/runtime performance notes
- **Durable, edge-aware rate limiting** (`lib/rate-limit.ts` + `increment_rate_limit()` RPC, migration `0036`) with an in-memory Map only as fast-path/fallback — a good pattern that explicitly accounts for ephemeral isolates. The same discipline is **not** applied to POS counters (still in-memory-adjacent RMW) — an inconsistency worth closing (Report 4).
- Per-request session resolution can do 2–4 sequential admin queries on a cold cache (getUser + superadmin_users + users + permissions). Mitigated by the 5s cache; still a cold-path latency contributor.

---

## Summary verdict

| Dimension | Verdict |
|---|---|
| Architecture | Mature, modular, correctly migrated to Supabase/Cloudflare. Debt = 3 overlapping data layers + one fully-stale in-repo doc (`MAKHZOON_FUTURE_ARCHITECTURE.md`). |
| Multi-tenancy | Defence-in-depth (RLS on all tables + app-layer filtering). App-layer is load-bearing on the service-role path. |
| Security | Strong. No open cross-tenant hole found; latent gaps: unguarded new-repo `update/delete`, non-constant-time cron compare, payment webhook to review, no signup transaction. Secrets handling clean. |
| Performance | Solid indexing + bounded lists + durable rate limiting. Watch items: offset pagination at scale, 1000-row export cap, non-atomic POS counters. |
