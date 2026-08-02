# Report 1 — Dev Status Report (Tech Debt)

**Project:** Makhzoon
**Phase:** 1 — Baseline analysis (read-only)
**Date:** 2026-07-24
**Branch analysed:** `DevBranch` (HEAD `7c21924`)
**Method:** Static code/config inspection + non-mutating tool runs (`vitest run`, `tsc --noEmit`). No code, config, schema, or data was modified.

---

## 0. Executive summary

The codebase is **substantially more mature and much broader in scope** than the PRD summarised in the Phase-1 brief. What the brief calls "the PRD" (roles, org management, asset management, request system, warranty management, exports, audit) is essentially **fully implemented**, but it represents only a *subset* of the shipped product. The app is a multi-module, multi-tenant, bilingual (en/ar) SaaS that also includes a full **POS / service-management suite (haraka)**, an **inventory system (raseed)**, **custom fields (banna)**, **notifications + web push**, **support tickets**, **multi-branch spaces**, and **subscription/packaging** — none of which are "missing features"; they are extra surface area the brief's PRD does not mention.

Code hygiene is genuinely good: **0 `TODO`/`FIXME`, 0 `@ts-ignore`**, a passing test suite, comprehensive per-module documentation, and a clean removal of the previous Firebase/Vercel stack. The real debt is **structural**: three overlapping data-access layers, a couple of genuinely stubbed integrations, some committed junk/dead files, and a stale build artifact that breaks the project's own `verify` script.

> ⚠️ **Stack drift vs. the brief.** Several "known facts" in the brief are themselves stale — see §4 and Report 2. Most importantly: this is **Next.js 16**, not 14, and dynamic routes **do not** use `export const runtime = 'edge'` (nor should they under the current OpenNext adapter).

---

## 1. Feature inventory — PRD items (Done / Partial / Missing)

| PRD capability | Status | Evidence / notes |
|---|---|---|
| **Roles** | ✅ Done | 6 roles: `super_admin`, `makhzoon_admin`, `makhzoon_support`, `org_owner`, `admin`, `staff`, plus granular per-module/per-space permissions for staff (`lib/supabase/auth-helpers.ts`, `types/user-permissions.types.ts`). Richer than the brief's "Super Admin / Org Admin / Staff". |
| **Org management** | ✅ Done | Self-serve signup (`app/api/organizations/self-serve/route.ts`) + superadmin CRUD (`app/api/superadmin/organizations/*`), transfer/impersonation mode, subscription + packages, per-org config lists, currency (migration `0046`). |
| **Asset management (usool)** | ✅ Done | Full CRUD + list + CSV import (`usool/import`), audits, checkouts, maintenance records, notes, QR codes, public asset view (`app/[locale]/asset/...`). |
| **Request system** | ✅ Done | Submit / list / approve / reject (`app/api/requests/*`, `lib/modules/requests`). |
| **Warranty management** | ✅ Done | Warranties CRUD + export (`app/api/warranties/*`). A separate warranty-**certificate** feature exists under haraka POS. |
| **Exports** | ⚠️ Partial | CSV via `papaparse`. **`assets/export` is hard-capped at `pageSize: 1000`** (`app/api/assets/export/route.ts:17`) → silent truncation for larger orgs. Export implementations are inconsistent across modules (assets caps; audit-logs paginates; warranties differs). A Google Drive export path also exists (`lib/drive`). |
| **Logging / audit** | ✅ Done | Audit log written on mutations (queued via `lib/audit/logger.ts`), export endpoint, plus superadmin `backend-logs`. Broad coverage across modules. |

### Features present but **beyond** the brief's PRD (not "missing" — extra scope)
Inventory/raseed (purchases, stock audits, barcode lookup) · Haraka POS (orders, service-jobs, retainers, sessions, transactions with refund/void, delivery agents, card terminal, cash drawer, tax rates, invoicing) · Banna custom fields · Notifications + web push (VAPID) · Support tickets · Spaces (multi-branch) · Subscription/packages/pricing tiers · i18n en/ar with RTL.

### Genuinely partial / stubbed
| Item | Status | Evidence |
|---|---|---|
| **JO-Fotara / Fawtara ZATCA e-invoicing** | 🟡 Stubbed | `lib/modules/haraka/fawtara/client.ts:5` — *"auth header format are placeholders — replaced once we have credentials."* Routes (`app/api/jo-fotara/*`) and encryption key wiring exist, but the client is not production-wired. |
| **Compliance module** | 🟡 Scaffold | `lib/compliance/country-config/index.ts:68` — *"Spec still evolving — placeholder only."* `lib/compliance/queues` and `storage` are interface-only abstractions. |

---

## 2. TODOs, stubs, commented-out code, placeholder logic

- **`TODO`/`FIXME`/`HACK` markers:** **0** across `app/ lib/ components/ hooks/ store/ types/`. (An initial count of 346 was a false positive — the substring `toDo` inside `au·toDo·wnload`.)
- **`@ts-ignore` / `@ts-nocheck` / `@ts-expect-error`:** **0**.
- **`eslint-disable`:** 60 total; **13** are the documented `no-explicit-any` suppression tied to the deliberately-permissive Supabase typing (see `lib/supabase/admin.ts:13`). The rest are localised and mostly benign.
- **Placeholder logic:** only the two stubbed integrations above (Fawtara, compliance). No "coming soon" screens or `throw 'Not implemented'` stubs in shipped modules.
- **`console.*`:** ~275 occurrences in `app/`+`lib/`, overwhelmingly `console.error(...)` inside `catch` blocks (acceptable structured-ish logging that surfaces in Cloudflare observability). A minority look like debug leftovers and could be routed through `lib/logger.ts` for consistency.

**Assessment:** unusually clean for a project this size. The absence of `TODO`/`@ts-ignore` suggests debt is tracked in docs (`docs/*_TODO.md`, `docs/BACKLOG.md`, `docs/AUDIT_ACTION_PLAN_2026-07-05.md`) rather than scattered in code.

---

## 3. Tech debt (structural)

### 3.1 Three overlapping data-access layers — **the single biggest structural debt**
| Layer | Files | Style | Example |
|---|---|---|---|
| `lib/db/*` | 26 | Legacy typed query helpers | `lib/db/assets.ts` |
| `lib/services/*` | 7 | Legacy **function-based** services (call `lib/db`) | `lib/services/assets.service.ts` |
| `lib/modules/*` | 91 | New **class-based** service + repository | `lib/modules/assets/{services,repositories}` |

Different routes wire to different layers **for the same resource**:
- `app/api/assets/route.ts` (collection) → **new** `AssetsService` (`lib/modules/assets`).
- `app/api/assets/[assetId]/route.ts` (item) → **legacy** `lib/services/assets.service.ts`.

This means asset read/write logic is **duplicated** across two implementations with different validation/audit code paths. It is the most likely source of future inconsistency bugs and should be consolidated (pick one layer per module).

### 3.2 `next.config.mjs` sets `typescript: { ignoreBuildErrors: true }`
Production builds will **not** fail on TypeScript errors (`next.config.mjs:8`). Type safety is only enforced by the separate `npx tsc --noEmit` step, which — see §5 — currently fails on a stale artifact. Net effect: type regressions can ship.

### 3.3 Inconsistent org-scoping idioms in repositories
Org isolation on the service-role (RLS-bypassing) path is enforced three different ways: inline `.eq('organization_id', …)` in the query (good — `assets.repository.ts` `getAll`), read-then-check in app code (`getById`), or **delegated entirely to the caller** with no guard (`AssetsRepository.update()/delete()` filter by `id` only — `lib/modules/assets/repositories/assets.repository.ts:187,210`). The last pattern is a latent cross-tenant-write risk; see Report 2 §Security.

### 3.4 Error handling
Route handlers use a consistent `try/catch` that returns a thrown `NextResponse` or a generic 500 — solid and uniform. Gaps are narrow: signup / invite-accept perform multiple writes (auth user → `public.users` → subscription) **without a transaction**, so a mid-sequence failure can orphan an auth user (`self-serve/route.ts`, `invites/[token]/accept/route.ts`). See Report 5.

### 3.5 Concurrency (former Firestore transactions → non-transactional RMW)
Several counters/ledgers were ported from Firestore multi-doc transactions to **non-atomic read-modify-write** on Postgres, acknowledged in code: receipt numbering (`transactions.repository.ts:108`), invoice numbering, inventory stock ledger, single-open-session invariant. Correctness risk under concurrent registers. Detailed in Report 4.

---

## 4. Edge runtime compliance

**Finding: the brief's constraint is stale for this stack.**

- `export const runtime = 'edge'` appears on **0 of 166** API routes and **0** pages — there are **zero** `runtime` declarations anywhere in `app/`.
- This is **correct** for the current adapter. The app deploys via **`@opennextjs/cloudflare`** (`package.json`, `open-next.config.ts`, `wrangler.toml:26 main = ".open-next/worker.js"`) with `compatibility_flags = ["nodejs_compat"]` (`wrangler.toml:28`). OpenNext runs the whole Next app in a single Worker under Node-compat; per-route `runtime='edge'` is **not required** and would be counterproductive.
- The `runtime='edge'`-on-every-route rule belongs to the **older `@cloudflare/next-on-pages`** approach, which this repo has migrated away from. The team's own `docs/PROJECT_STATUS.md` confirms the OpenNext model.

**Action for the brief's owners:** update the "known constraint" — it no longer applies. There is nothing to fix in the code.

---

## 5. Build / typecheck / lint / test health (observed)

| Check | Result | Notes |
|---|---|---|
| **Unit/contract tests** (`vitest run`) | ✅ **80 passed / 80** (12 files, 2.24s) | I ran this. One stderr line is an intentional fail-open test. |
| **Typecheck** (`tsc --noEmit`) | ⚠️ **7 errors — all in a stale artifact** | Every error is in generated `.next/types/validator.ts`, referencing **removed** routes `haraka/reception/*` and `haraka/reception-tickets/*` (feature added in migration `0038`, dropped in `0042`). **Source is clean**; a fresh `next build` regenerates these types. |
| **`npm run verify`** | 🔴 Would currently fail | `verify` runs `tsc --noEmit`; the stale `.next` makes it fail until `.next` is rebuilt/cleared. Worth flagging to the team. |
| **Lint history** | ⚠️ Recently repaired | Per `docs/PROJECT_STATUS.md`: lint was silently broken (script referenced a deleted file) until 2026-07-09, when 146 latent errors (incl. ~100 React hook-order bugs) were fixed; **57 warnings remain**. |

---

## 6. Dependency audit

**Runtime stack (from `package.json`):** Next.js **16.2.7** (App Router, Turbopack), React **18.3.1**, TypeScript 5.9.3, `@opennextjs/cloudflare` 1.19.11, `wrangler` 4.20, `@supabase/supabase-js` 2.106 + `@supabase/ssr` 0.7, Tailwind 3.4.1, Radix UI, Zustand 4.5, TanStack Query 5.99, `zod` 3.25, `resend` 4, `jose` 6, `bcryptjs` 3, `web-push` 3.6, `papaparse` 5.5, `qrcode` 1.5.

Observations / risks:
- **Next 16 + React 18 pairing.** Next 16 typically ships against **React 19**; this repo pins React 18.3.1. It builds and runs, but this is a combination worth explicitly validating before a major upgrade — a latent compatibility footgun, not a current breakage.
- **`next: "^16.2.7"` vs brief's "Next.js 14".** Pure doc drift (flag, don't change).
- **No OpenNext/Cloudflare blockers observed.** The adapter is current (1.19.x), `nodejs_compat` is enabled, and there is no `edge`-runtime or Node-API usage fighting the Worker runtime.
- **CVEs:** `docs/PROJECT_STATUS.md` reports 0 high/critical and 2 moderate (a `postcss` transitive under `next` needing a breaking bump). Not independently re-run here (would require `npm audit`, network-dependent).
- **Analytics/observability SDKs** (`posthog-js`, `logrocket`, `@microsoft/clarity`) add client bundle weight — see Report 4 (bundle/cold-start).

---

## 7. Leftover / dead / orphaned code & config

| Item | Location | Verdict |
|---|---|---|
| **Firebase Cloud Functions code** | `functions/src/lib/dev-admin.ts`, `functions/src/lib/mirror-doc.ts` | 🔴 **Dead.** Both `import 'firebase-admin/*'` (a package **no longer in `package.json`**). A Firestore prod→dev doc-mirroring trigger orphaned by the Supabase migration. Tracked in git; safe to delete (Phase 2). |
| **Static HTML prototypes** | `prototype/` (63 tracked files) | 🟡 Design mockups, not part of the Next build. Harmless clutter / reference material. |
| **Committed junk files** | root: `acc`, `finally`, `PublicCompositeTypeNameOrOptions`, `DefaultSchemaTableNameOrOptions` | 🟡 Empty (0-byte) files accidentally committed. `/acc` is gitignored yet still tracked. Housekeeping. |
| **Stale build artifact** | `.next/` (types reference removed reception routes) | 🟡 See §5. Should be in `.gitignore` (it is) but exists locally and poisons `tsc`. |
| **Possibly-obsolete sync feature** | `app/api/superadmin/sync/route.ts`, `app/[locale]/superadmin/sync/` | 🟡 Comment: *"(sync-firestore.yml) — obsolete post-migration."* Verify whether still used before removal. |
| **Flutter / mobile exploration** | — | ✅ **None found.** No `.dart`, `pubspec.yaml`, or Gradle files anywhere. Fully absent. |
| **Vercel / Amplify config** | — | ✅ **None.** No `vercel.json` / `amplify.yml`. Config-level migration is complete (crons moved to `workers/cron`). |
| **"Osama's separate branch"** | git remotes | ℹ️ No branch named for a person exists. The only non-standard remote is `origin/claude/angry-swartz-041091` (last commit 2026-05-11) — a stale AI-generated branch, unmerged and apparently abandoned. Nothing conflicting in the working tree. |

---

## 8. Prioritised debt backlog (for Phase 2 planning — **not actioned here**)

| # | Item | Impact | Effort |
|---|---|---|---|
| 1 | Consolidate the 3 data layers (`lib/db` + `lib/services` legacy vs `lib/modules`) to one per module | High (correctness/maintainability) | Multi-day |
| 2 | Add org guard to `AssetsRepository.update()/delete()` (defence-in-depth) | High (security latent) | Low |
| 3 | Fix `assets/export` 1000-row cap (stream/paginate full set) | High (data loss on export) | Low–Med |
| 4 | Make POS counters atomic (RPC / `SELECT … FOR UPDATE`) — receipt/invoice/stock | High (money-path correctness) | Med |
| 5 | Remove `ignoreBuildErrors:true` after clearing the stale `.next` type errors | Med (prevents type regressions) | Low |
| 6 | Delete dead `functions/src`, junk root files, `.next` from disk; decide on `prototype/` & `superadmin/sync` | Low (hygiene) | Low |
| 7 | Wire real ZATCA/Fawtara credentials + finish `lib/compliance` | Med (feature completeness) | Med |
| 8 | Validate Next 16 / React 18 pairing before any dependency bump | Med | Low |

*Backup strategy: none observed in-repo — flagged here per scope; Phase 2 owns it.*
