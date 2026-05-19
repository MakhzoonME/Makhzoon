# Makhzoon — Project Status

**Last updated**: 2026-05-09
**Maintained by**: development team
**Purpose**: living document capturing the current state of the codebase, technology stack, build/test/security posture, and known follow-ups. Updated after every major modernization or audit.

---

## Snapshot

| Dimension | Status | Detail |
|---|---|---|
| **Build** | ✅ Healthy | `npm run build` — 8.4s, 36 static pages generated |
| **Type check** | ✅ 0 errors | `npx tsc --noEmit` — clean |
| **Lint** | ✅ 0 errors | 1 known library warning (`react-hook-form` `watch()`) |
| **Production CVEs** | ✅ 0 high/critical | 10 low/moderate, all non-exploitable in current usage |
| **Tests** | ⚠ None | `vitest` configured, `TEST_CASES.md` describes scenarios, zero `*.test.ts` files written |
| **Deployment** | ✅ Live | AWS Amplify Hosting (Gen 1), `main` branch auto-deploys |
| **Last security review** | ✅ 2026-05-09 | See `SECURITY_REVIEW_2026-05-09.md`. 0 high/critical findings. |

---

## Technology stack

### Runtime
- **Framework**: Next.js **16.2.6** (App Router, Turbopack)
- **React**: 18.3.1
- **TypeScript**: 5.9.3
- **Node**: 24.x (dev); deployed Lambda runs Amplify-managed Node version

### Backend / data
- **Firebase**: client SDK **12.13.0**, Admin SDK **12.7.0**
  - Firestore for primary data store
  - Firebase Auth for authentication
  - Firebase Storage for file uploads
- **Email**: Resend (`@resend/node`)
- **Error tracking**: Sentry (`@sentry/nextjs`)

### UI
- **Tailwind CSS** 3.4.1
- **Radix UI** primitives (dialog, dropdown, popover, select, etc.)
- **Framer Motion** for animations
- **Lucide React** for icons
- **react-hook-form** + **zod** for forms

### State / data fetching
- **Zustand** for client state (theme, auth, UI, transfer mode)
- **TanStack Query** (`@tanstack/react-query`) for server state
- **React 18 native primitives** — `useSyncExternalStore` for client capability detection

### Tooling
- **ESLint** 9.39.4 with flat config (`eslint.config.mjs`) using `eslint-config-next/core-web-vitals` + `/typescript`
- **Prettier** 3.8.3
- **Vitest** 1.6.1 (configured but unused)

---

## Architecture overview

### Multi-tenancy
- Tenant identified by URL path segment: `/{locale}/{orgSlug}/...`
- Server-side resolution via `lib/platform/tenancy/resolve-tenant.ts`
- Every API route handler verifies tenant + role via `verifySessionCookie()` + `resolveTenant()`
- Cross-tenant access blocked at handler level; super_admin can act as tenant admin via `transferOrgId` cookie

### Authentication
- Firebase Auth (email/password, SSO via `app/api/auth/sso/*`)
- Session cookie issued server-side from idToken (24-hour expiry)
- Server-side session-revocation list (`revokedSessions` Firestore collection with TTL)
- Cookie flags: `httpOnly`, `secure` (prod), `sameSite: 'strict'`, `path: '/'`

### Authorization
- Role-based: `super_admin`, `makhzoon_admin`, `makhzoon_support`, `org_owner`, `admin`, `staff`
- Permission-based for `staff` (granular per-module access)
- Subscription-feature gates for tenant-level features (read from `subscription.features`)

### Routing
- `proxy.ts` (Next.js 16 convention; was `middleware.ts`) — locale redirect + soft session gate
- `app/[locale]/...` for all user-facing routes
- `app/api/...` for server endpoints (60+ routes across assets, inventory, warranties, requests, organizations, users, support, audit-logs, superadmin, cron, auth)

### Folder structure
```
app/                  Next.js App Router pages and API routes
components/           UI components (layout, shared, ui, features-specific)
hooks/                React hooks (org, ui, users, etc.)
lib/
  ├─ firebase/        Admin SDK, client SDK, auth-helpers, session-cache
  ├─ platform/        Tenancy resolution, permissions, audit, events
  ├─ modules/         Module-scoped business logic (assets, inventory, ...)
  ├─ db/              Firestore data access
  ├─ email/           Resend integration + email templates
  ├─ rate-limit.ts    Rate limiting primitives
  ├─ csrf.ts          Origin checking
  └─ utils/           Shared utilities
store/                Zustand stores
types/                TypeScript type definitions
locales/              i18n strings (en, ar)
```

---

## Build and deployment

### Local development
```powershell
npm install
npm run dev          # Starts Next.js dev server on :3000
npm run build        # Production build
npm run lint         # ESLint
```

### Environment files
- `.env.local` — local development secrets (gitignored)
- `.env.example`, `.env.development.example`, `.env.production.example`, `.env.staging.example` — templates
- `.env.production.local` — written by `scripts/write-server-env.mjs` at build time during Amplify preBuild (legacy workaround)

### Amplify deployment

`amplify.yml`:
```yaml
frontend:
  phases:
    preBuild:
      commands:
        - npm ci --cache .npm --prefer-offline
        - node scripts/write-server-env.mjs
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
```

**Critical Amplify Gen 1 quirk**: non-`NEXT_PUBLIC_` env vars are NOT forwarded to the SSR Lambda runtime. We work around this by inlining server secrets at build time via Next.js's `env` config in `next.config.mjs`. Long-term remediation: migrate to Amplify Hosting Gen 2 (supports runtime env vars natively).

### Required environment variables

**Public (browser-baked)**:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_APP_URL` (used for CORS allow-origin)
- `NEXT_PUBLIC_APP_ENV`

**Server-only (inlined into build)**:
- `FIREBASE_SERVICE_ACCOUNT_BASE64` (preferred — base64 of service account JSON) **OR**
- `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` (fallback)
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- `CRON_SECRET` (for `/api/cron/*` Bearer token auth)
- Optional: `SENTRY_ORG`, `SENTRY_PROJECT`, `CLOUDFLARE_TURNSTILE_SECRET_KEY`

The `NEXT_PUBLIC_FIREBASE_PROJECT_ID` and the project encoded in the service account **must be the same Firebase project**, otherwise idToken verification fails with `auth/invalid-credential`.

---

## Security posture

### Recent audits
- **2026-05-01** — Full security audit: 16 findings (5 critical, 7 high, 4 lower) all fixed. See `SECURITY_AUDIT_REPORT.md` and `SECURITY_IMPLEMENTATION_COMPLETE.md`.
- **2026-05-09** — Differential review of changes since baseline. 0 high/critical, 2 medium (M1 fixed in same session), 2 low. See `SECURITY_REVIEW_2026-05-09.md`.

### Defense-in-depth controls
- Rate limiting on all auth, signup, password-reset, contact, and early-access endpoints (per IP and per email/token where applicable)
- CSRF origin checking on state-changing public endpoints
- Server-side session revocation list with Firestore TTL
- Constant-time-ish comparisons for sensitive credentials (CRON_SECRET still uses `!==` — flagged as L2 for future fix)
- Strict CSP, HSTS preload, X-Frame-Options DENY
- `httpOnly` + `secure` + `sameSite: 'strict'` cookies
- Audit log on all mutation routes (`auditLog.queue` / `queueAuditLog`)
- Subscription-status gating (suspended orgs blocked at session creation for non-super-admin)
- Server-only enforcement on Firebase Admin SDK module (`import 'server-only'`)

---

## Known follow-ups (technical debt)

| ID | Item | Priority | Effort |
|---|---|---|---|
| TD-1 | Add tests — `vitest` is configured, `TEST_CASES.md` describes scenarios, zero `*.test.ts` files exist. Would also resolve remaining low/moderate dev-only CVEs in vitest/vite/hono chain. | High | Multi-week |
| TD-2 | Codebase-wide `dark:bg-gray-X` / `dark:border-gray-X` sweep — many components use the inverted-gray-scale anti-pattern that was just fixed in `AppHeader.tsx`. Replace with semantic surface tokens (`bg-surface-card`, `border-border`). | Medium | ~2-4 hours |
| TD-3 | `app/[locale]/superadmin/backend-logs/page.tsx` — uses `useEffect(() => fetchLogs(), [fetchLogs])` with manual loading/data state. Migrate to `useQuery` to match the rest of the codebase and remove the `eslint-disable`. | Medium | ~30 min |
| TD-4 | `app/[locale]/superadmin/organizations/[orgId]/subscription/page.tsx` — uses `useEffect` to hydrate form state from fetched subscription. Refactor to a child component with `key={sub.id}` so `useState` initializers run with loaded data. | Low | ~1 hour |
| TD-5 | Migrate to Amplify Hosting Gen 2 — eliminates the build-artifact-secrets concern (security finding L1). | Strategic | Multi-week |
| TD-6 | `CRON_SECRET` constant-time comparison via `crypto.timingSafeEqual` (security finding L2). | Low | ~10 min |
| TD-7 | Document `proxy.ts` as a soft-gate (security finding M2) and consider edge-callable session validator. | Low | ~5 min for comment, multi-week for full fix |
| TD-8 | Remove `scripts/write-server-env.mjs` once on Amplify Gen 2 — workaround no longer needed. | Low | ~5 min |
| TD-9 | Decide if `.eslintrc.json` patterns elsewhere need migration (e.g., editor configs). | Low | ~30 min |
| TD-10 | Update / remove `package.json.tier1.bak` and `package-lock.json.tier1.bak` backup files once Tier 2/3 work is verified stable in production. | Low | ~1 min |

---

## How to deploy

1. Make changes locally; verify with `npm run build && npm run lint && npx tsc --noEmit`
2. Commit and push to `main` (or merge an approved PR)
3. AWS Amplify auto-builds and deploys
4. Watch CloudWatch logs for the SSR Lambda after first request — confirm:
   ```
   [firebase-admin] init { source: 'base64-json', projectId: 'office-asset-system', hasClientEmail: true, hasPrivateKey: true }
   ```
5. Smoke-test login flow

---

## Document index

- `README.md` — project overview, getting started
- `CLAUDE.md` — Ruflo / Claude Code coordination configuration
- `Context.md` — domain and product context
- `MAKHZOON_FUTURE_ARCHITECTURE.md` — long-term architectural direction
- `design_system.md` — UI/UX system reference
- `TEST_CASES.md` — test scenarios (not yet implemented)
- `RATE_LIMITING_ERROR_MESSAGES.md` — rate limit messaging reference
- `SECURITY.md` — security policy / disclosure
- `SECURITY_AUDIT_REPORT.md` — 2026-05 full audit
- `SECURITY_FIXES_APPLIED.md` — 2026-05 fix log
- `SECURITY_HARDENING_SUMMARY.md` — hardening summary
- `SECURITY_IMPLEMENTATION_COMPLETE.md` — completion record for 2026-05 audit
- `SECURITY_REVIEW_2026-05-09.md` — differential review (this update cycle)
- `SESSION_SUMMARY_2026-05-09.md` — work log for the modernization session
- `PROJECT_STATUS.md` — this document
