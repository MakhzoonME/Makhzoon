# Makhzoon — Project Status

**Last updated**: 2026-05-31
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
| **Deployment** | ✅ Live | Cloudflare Workers via `@opennextjs/cloudflare`; `main` → `app.makhzoon.me`, `DevBranch` → `dev.makhzoon.me` |
| **Last security review** | ✅ 2026-05-09 | See `SECURITY_REVIEW_2026-05-09.md`. 0 high/critical findings. |

---

## Technology stack

### Runtime
- **Framework**: Next.js **16.2.6** (App Router, Turbopack)
- **React**: 18.3.1
- **TypeScript**: 5.9.3
- **Runtime**: Cloudflare Workers (via `@opennextjs/cloudflare`)

### Backend / data
- **Supabase**: `@supabase/supabase-js` ^2.106, `@supabase/ssr` ^0.7
  - Postgres for primary data store
  - Supabase Auth for authentication
  - RLS for multi-tenant isolation
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
- URL structure: `/{locale}/{orgSlug}/{spaceSlug}/{module}`
- Tenant identified by `orgSlug`; data further scoped by `spaceSlug` (Spaces)
- Every API route handler verifies session via Supabase server client + RLS enforces org/space isolation
- Super_admin can act as tenant admin via `transferOrgId` cookie

### Authentication
- Supabase Auth (email/password, invite-based)
- Session managed by `@supabase/ssr` (httpOnly cookies, auto-refresh)
- Session revocation tracked in `lib/supabase/session-revocation.ts`
- Cookie flags: `httpOnly`, `secure` (prod), `sameSite: 'strict'`

### Authorization
- Role-based: `super_admin`, `makhzoon_admin`, `makhzoon_support`, `org_owner`, `admin`, `staff`
- Permission-based for `staff` (granular per-module, per-space access via `user_permissions` table)
- Subscription-feature gates enforced in UI and API

### Routing
- `middleware.ts` — locale redirect + soft session gate + domain routing
- `app/[locale]/...` for all user-facing routes
- `app/api/...` for server endpoints

### Folder structure
```
app/                  Next.js App Router pages and API routes
components/           UI components (layout, shared, spaces, ui, features-specific)
hooks/                React hooks (org, ui, users, spaces, etc.)
lib/
  ├─ supabase/        Client, server, admin, auth-helpers, session-cache, session-revocation
  ├─ platform/        Tenancy resolution, permissions, audit, events
  ├─ modules/         Module-scoped business logic (assets, inventory, haraka, ...)
  ├─ db/              Supabase data access (typed query helpers)
  ├─ permissions/     Server-side permission evaluation
  ├─ email/           Resend integration + email templates
  ├─ rate-limit.ts    Rate limiting primitives
  ├─ csrf.ts          Origin checking
  └─ utils/           Shared utilities
store/                Zustand stores (auth, active-space, locale, theme, transfer, ui, pos-cart, printer)
types/                TypeScript type definitions
workers/cron/         Cloudflare Workers cron jobs
supabase/             Migrations + combined schema snapshot
locales/              i18n strings (en, ar)
```

---

## Build and deployment

### Local development
```bash
npm install
npm run dev          # Starts Next.js dev server on :3000
npm run build        # Production build
npm run lint         # ESLint
```

### Cloudflare Workers deployment

```bash
npm run cf:deploy              # Deploy to production (main branch)
wrangler deploy --env dev      # Deploy DevBranch → dev.makhzoon.me
wrangler deploy --env staging  # Deploy STGBranch → stage.makhzoon.me
```

Secrets are set via `wrangler secret put --env <name>` (never committed to `wrangler.toml`).

### Required environment variables

**Public (NEXT_PUBLIC_*)**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_APP_ENV`

**Server secrets (Wrangler)**:
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- `CRON_SECRET`
- `GOOGLE_DRIVE_PRIVATE_KEY`
- `FAWTARA_SECRET_ENC_KEY`
- Optional: `SENTRY_ORG`, `SENTRY_PROJECT`, `CLOUDFLARE_TURNSTILE_SECRET_KEY`

---

## Security posture

### Recent audits
- **2026-05-01** — Full security audit: 16 findings all fixed. See `SECURITY_AUDIT_REPORT.md`.
- **2026-05-09** — Differential review. 0 high/critical. See `SECURITY_REVIEW_2026-05-09.md`.

### Defense-in-depth controls
- Supabase RLS enforces tenant isolation at the database layer
- Rate limiting on all auth, signup, contact, and early-access endpoints (`lib/rate-limit.ts`)
- CSRF origin checking on state-changing public endpoints (`lib/csrf.ts`)
- Server-side session revocation list (`lib/supabase/session-revocation.ts`)
- Strict CSP, HSTS preload, X-Frame-Options DENY
- `httpOnly` + `secure` + `sameSite: 'strict'` cookies
- Audit log on all mutation routes
- Subscription-status gating (suspended orgs blocked)
- `import 'server-only'` guards on Supabase admin client

---

## Known follow-ups (technical debt)

| ID | Item | Priority | Effort |
|---|---|---|---|
| TD-1 | Add tests — `vitest` is configured, `TEST_CASES.md` describes scenarios, zero `*.test.ts` files exist. | High | Multi-week |
| TD-2 | Codebase-wide `dark:bg-gray-X` sweep — replace with semantic surface tokens (`bg-surface-card`, `border-border`). | Medium | ~2-4 hours |
| TD-3 | `app/[locale]/superadmin/backend-logs/page.tsx` — migrate manual `useEffect` data fetching to `useQuery`. | Medium | ~30 min |
| TD-4 | `CRON_SECRET` constant-time comparison via `crypto.timingSafeEqual`. | Low | ~10 min |
| TD-5 | No cursor-based pagination on large list views (assets, inventory, audit-logs). | Medium | Multi-day |

---

## How to deploy

1. Make changes locally; verify with `npm run build && npm run lint && npx tsc --noEmit`
2. Commit and push to target branch (`DevBranch` → dev, `STGBranch` → staging, `main` → production)
3. Run `npm run cf:deploy` (or `wrangler deploy --env <name>` for non-production)
4. Smoke-test login flow on the deployed URL

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
