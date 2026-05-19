# QA Plan: Supabase Migration + Cloudflare Pages Deployment

## Task MZ-005 | Assignee: @qa

---

## 1. Supabase Migration

### 1.1 Schema Validation
- Run all 6 migrations against a fresh Supabase project; verify no errors
- Confirm `supabase/migrations/0001_init.sql` creates all 8 core tables
- Confirm `0002_rls.sql` enables RLS on all tables and policies apply correctly
- Confirm `0003_auth.sql` (revoked_sessions, purge_expired_sessions)
- Confirm `0004_modules.sql` (warranties, requests, asset_notes, maintenance_records, asset_checkouts, audit_logs)
- Confirm `0005_modules.sql` (support_tickets + messages, payment_logs, inventory_audits + items, superadmin_users, backend_logs, contact_sales, early_access)
- Confirm `0006_haraka.sql` (POS tables, purchases, tax_rates, counters, fawtara columns)
- Verify all foreign key constraints, indexes, triggers, and enum types exist
- Run: `npx supabase db dump --schema public > /tmp/schema-verify.sql` then grep for all expected objects

### 1.2 Data Integrity
- Verify that `auth.users` ↔ `public.users` FK (on delete cascade) works
- Test `orgnization_id` FK references on every child table
- Test all `updated_at` triggers fire correctly on UPDATE
- Verify no orphaned rows can be created (RI constraints)
- Confirm `auth.uid()` resolves correctly in RLS policies

### 1.3 Query Compatibility
- Verify all existing `lib/db/*` queries work against Supabase (not Firestore)
- Check RLS predicate paths — ensure `public.app_role()`, `public.app_org()`, `public.is_platform_admin()`, `public.is_org_manager()`, `public.belongs_to_org()` all return correct values
- Test edge case: unauthenticated user (no session) — RLS should block all
- Test edge case: user with `staff` role can only SELECT, not INSERT/UPDATE/DELETE
- Test edge case: super_admin can cross-tenant read
- Test edge case: revoked session is properly rejected

### 1.4 Auth Migration
- Verify Supabase SSR cookie flow: login → set cookies → subsequent requests authenticated
- Verify `verifySessionCookie()` in `auth-helpers.ts` returns correct `AuthUser`
- Verify `verifyIdToken()` for bearer token auth
- Test session refresh (token expiry)
- Test session revocation flow (deny-list via `revoked_sessions` table)
- Verify `proxy.ts` cookie check — **KNOWN ISSUE: still checks `'session'` cookie instead of Supabase SSR cookies** (see DevOps MZ-004 findings)
- Test superadmin transferOrgId cookie flow
- Test password reset flow (password_reset_tokens table)
- Test invite flow (publicly accessible invite pages)

---

## 2. Cloudflare Pages / Workers

### 2.1 Build Pipeline
- Run `npm run build` → must pass TypeScript check (currently blocked by MZ-004 issue #1)
- Run `npm run cf:build` → must complete without error
- Run `npm run cf:preview` → must spin up local preview
- Verify `.open-next/worker.js` is generated after build
- Verify `.open-next/assets/` contains all static assets
- Verify worker bundle size is within Cloudflare limits (100MB)

### 2.2 Edge Compatibility
- Test that `next/headers` (cookies()) works at the edge
- Test that `@supabase/ssr` cookie management works in Cloudflare Workers runtime
- Verify `server-only` package works correctly
- Verify `Buffer` usage in `auth-helpers.ts` works with `nodejs_compat` flag
- Test that environment variables are available at the edge (`NEXT_PUBLIC_*` should be inlined at build time)
- Verify `node:path`, `node:url` usage in `next.config.mjs` is compatible
- Test that `jose` library works at the edge (used for OIDC tokens)
- Verify that `path/to/sql.js` (Resend, Twilio, etc.) don't pull in Node.js APIs that break at the edge

### 2.3 Environment Variables
- Verify ALL required env vars are set in Cloudflare dashboard per environment:
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
  - `CRON_SECRET`
  - `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_APP_ENV`
- Verify `.env.example` is updated with Supabase vars (currently missing — see MZ-004)
- Verify all `.env.*.example` files document Supabase variables
- Verify no secrets leaked in build output or source maps

### 2.4 Domain / DNS
- Verify `app.makhzoon.me` → Cloudflare Workers route
- Verify `dev.makhzoon.me` → dev worker
- Verify `stg.makhzoon.me` → staging worker
- Verify `makhzoon.me` → marketing site (Vercel)
- Verify SSL/TLS configuration
- Verify CNAME/AAAA records are correct
- Verify `wrangler.toml` route bindings match domains

---

## 3. Regression Testing — 5 Modules

### 3.1 Usool (Assets)
- Asset CRUD: create, read, update, delete asset
- Asset filtering by category, status, org
- Asset checkout / check-in flow
- Asset notes CRUD
- Maintenance records CRUD
- Warranty assignment and alert flow
- RLS: staff read-only, admin full access, cross-tenant isolation

### 3.2 Raseed (Purchases / Inventory)
- Inventory item CRUD with stock tracking
- Inventory transaction ledger (in/out/adjustment)
- Purchase order creation with line items (jsonb)
- Stock status auto-calculation (ok/low/out)
- Supplier management
- RLS: staff read-only + create requests, admin full access

### 3.3 Haraka (POS)
- POS session open/close with float management
- POS transaction creation with line items (jsonb)
- Multiple payment methods per transaction (jsonb)
- Receipt generation and numbering
- Fawtara (ZATCA) integration
- Tax rate CRUD
- Customer CRUD
- Offline transaction sync
- Refund / void flow
- RLS: org staff read-write, manager all

### 3.4 Maal (Financial / Subscriptions)
- Subscription CRUD per organization
- Package management by superadmin
- Payment log CRUD
- Subscription status transitions (active/expired/cancelled)
- Usage tracking and limits enforcement
- RLS: platform managers full, org managers read

### 3.5 Banna (Maintenance / Repairs)
- Maintenance record CRUD
- Asset history tracking
- Assignment tracking
- RLS: staff read-only, admin full access

---

## 4. Localization (RTL / LTR)

- Verify Arabic (`ar`) locale renders all text right-to-left
- Verify English (`en`) locale renders left-to-right
- Test locale detection from Accept-Language header
- Test locale cookie (`makhzoon-locale`) persistence
- Test URL-based locale prefix (`/ar/...`, `/en/...`)
- Verify `proxy.ts` locale redirect logic works correctly
- Test that date/number formatting respects locale
- Test that all user-facing strings are externalized (not hardcoded)

---

## 5. Performance Testing

- Run Lighthouse audit on major pages (login, dashboard, assets list, POS)
- Verify TTFB < 200ms for edge-served pages
- Verify static assets are cached at the edge (Cloudflare CDN)
- Test with 50+ concurrent users per org
- Verify Supabase connection pooling is configured correctly
- Verify query N+1 patterns are not present in module repositories
- Check bundle size for each page in Next.js build output

---

## 6. Security Testing

- Verify RLS policies prevent cross-tenant data access
- Verify session revocation works immediately
- Verify CSP headers are present and correct (next.config.mjs)
- Verify HSTS headers are present
- Verify CORS headers on API routes
- Test SQL injection via dynamic query inputs
- Test that service role key is never exposed client-side
- Verify Turnstile (bot protection) works on login/signup
- Verify Rate limiting on auth endpoints
- Check for any remaining Firestore credentials in .env files

---

## 7. Rollback Plan Verification

- Verify that reverting to Firebase/Firestore is possible:
  - Firebase client SDK and config still in `.env.example` files
  - Firestore service files still exist in `lib/firestore/`
  - Old session cookie format is still understood (if present)
- Verify Cloudflare rollback:
  - `wrangler rollback` command works
  - Previous deployments are listed
- Verify that a database rollback means:
  - Supabase project can be deleted
  - Firestore project can be re-enabled
  - Migration scripts are idempotent (re-runnable with `if not exists`)

---

## Known Issues (from DevOps MZ-004)

1. **P1 — TypeScript error in `app/api/audit-logs/route.ts:21`**: `row as Record<string, unknown>` fails because Papa Parse `data` can be `ParserError`. Fix: cast via `unknown` first.
2. **P1 — `proxy.ts` checks `'session'` cookie**: With Supabase SSR, the session cookie name is different (`sb-*-auth-token`). The middleware won't detect authenticated sessions. This is a critical auth routing bug.
3. **P2 — Supabase env vars missing from all `.env.example` files**: Developers can't set up new environments without guessing the required variables.
4. **P3 — `wrangler.toml` compatibility_date is `2025-05-05`**: Should be updated to current date.
5. **P3 — OpenNext Windows warning**: Build works but OpenNext warns about Windows compatibility. Recommend using WSL for production builds.

---

## Test Execution

| Phase | Tests | By |
|-------|-------|----|
| 1 | Schema validation + Migration replay | @qa + @database |
| 2 | Auth flow + Session handling | @backend + @qa |
| 3 | Module regression (Usool, Raseed, Haraka, Maal, Banna) | @backend + @frontend + @qa |
| 4 | Cloudflare build + deploy | @devops + @qa |
| 5 | Localization (RTL/LTR) | @frontend + @qa |
| 6 | Performance + Security | @qa + @devops |
| 7 | Rollback verification | @devops + @architect |
