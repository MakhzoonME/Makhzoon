# Security — Makhzoon

**Stack:** Next.js 16 (App Router) · Supabase (Postgres + Auth + RLS) ·
Cloudflare Workers (`@opennextjs/cloudflare`).
**Last updated:** 2026-07-09 (Phase 1 of `AUDIT_ACTION_PLAN_2026-07-05.md`).

> The pre-2026-07 `SECURITY_*.md` reports described the retired
> **Firebase/Amplify** architecture and are archived under `docs/archive/`.
> This file is the single current source of truth.

---

## Authentication

- Supabase Auth (email/password + magic link + invite). Sessions via
  `@supabase/ssr` httpOnly cookies with auto-refresh.
- `verifySessionCookie()` (`lib/supabase/auth-helpers.ts`) is the authoritative
  resolver: validates the Supabase JWT, rejects revoked sessions, and re-reads
  `role`/`organization_id`/`permissions` from `public.users` so role and org
  changes take effect without re-auth.
- **Session revocation** (`lib/supabase/session-revocation.ts`): Supabase only
  revokes refresh tokens on sign-out, so a still-valid access token is added to
  a `revoked_sessions` deny-list (keyed by JWT `session_id`), self-expiring via
  a pg_cron TTL job (migration `0003_auth.sql`). This preserves
  "logout invalidates immediately."
- Short-lived server cache (`session-cache.ts`, 5–10s TTL) keeps auth-server /
  DB load low without materially delaying permission changes.
- **Local auth bypass** (`LOCAL_AUTH_BYPASS_USER_ID`) works only under
  `next dev`; cloud envs run `NODE_ENV=production` so it is inert there.

## Authorization — three independent layers

1. **RLS** — every one of the 63 application tables has Row-Level Security
   enforcing org/space isolation (verified by `npm run audit:security`, check 7).
2. **Role + permission guards** — `requirePermission()` (org roles) and
   `hasSuperAdminPermission()` (platform roles). Two permission systems:
   `UserPermissions` (org members) and `SuperAdminPermissions` (platform team).
3. **Subscription feature flags** — `requireFeature(tenant, key)` /
   `requireFeatureForOrg()` (`lib/permissions/require-feature.ts`) enforce the
   org's subscription server-side; a missing/false key blocks the module for
   everyone (feature OFF beats role/permission). Wired into all 82 module API
   routes. Keys: `docs/modules-and-features/12-subscription.md`.

### The `supabaseAdmin` rule

`lib/supabase/admin.ts` is the service-role client — it **bypasses RLS**. Every
query made through it MUST manually scope with `.eq('organization_id', …)`
(and space where applicable). It is guarded by `import 'server-only'`
(audit-script check 6). This is a one-missed-`.eq()`-from-cross-tenant-leak
class of code; the T2.1 test foundation adds contract tests asserting the
scoping. Legitimate cross-tenant uses: superadmin tooling, invite acceptance,
cron jobs, public-token routes.

## Rate limiting

Durable, Postgres-backed (`lib/rate-limit.ts` + migration `0036`,
`increment_rate_limit()`). The previous in-memory `Map` was per-isolate and
ephemeral on Workers, so production limits were ineffective. A local Map is
retained only as a fast-path rejection and as a fail-open fallback if the DB is
unreachable. Applied to auth (login/signup/password-reset), the public delivery
and asset-QR endpoints, and per-tenant on expensive authenticated routes.

## Public (unauthenticated) endpoints

| Endpoint | Exposure | Controls |
|---|---|---|
| `/r/[orgSlug]/[txId]` (receipt) | receipt view | id in URL, minimal fields |
| `/w/[orgSlug]/[certId]` (warranty cert) | cert view | id in URL |
| `/delivery/[token]` + `/api/delivery/[token]/*` | driver view/status/payment | 192-bit token, **14-day expiry + revocation (410 Gone)**, per-IP rate limit, zod on bodies, no `organization_id` in response |
| `/api/public/assets/[orgSlug]/[space]/[assetId]` | QR guest view | minimal non-sensitive fields, per-IP rate limit |
| `/api/haraka/card-payment-result` | PSP webhook | HMAC-SHA256 signature verification |
| `/api/cron/*` | scheduled jobs | `CRON_SECRET` bearer via constant-time compare (`lib/cron-auth.ts`) |
| `/api/push-subscriptions/vapid-key` | VAPID public key | public by definition |
| `/api/version` | deployed build ID | non-sensitive (git SHA), `no-store` — powers the client update-available banner |

## CSRF / origin

`lib/csrf.ts` `checkOrigin()` — explicit first-party origin allowlist
(app/dev/stg + rcpt-* hosts), no wildcard-subdomain trust; requests with no
`Origin` header (non-browser) pass; localhost allowed only in dev. CORS header
(`next.config.mjs`) is pinned to `NEXT_PUBLIC_APP_URL`, never `*`.

## Secrets at rest

Fawtara and card-terminal provider credentials are envelope-encrypted with
AES-256-GCM (`lib/platform/crypto/secret-cipher.ts`, `enc:v1:` prefix, per-record
nonce). Master key from `FAWTARA_SECRET_ENC_KEY`. No secrets committed;
`wrangler secret put` per env. Public config lives in `wrangler.toml`
`[env.*.vars]` (anon keys only — safe by Supabase design).

## HTTP security headers (`next.config.mjs`)

HSTS (preload), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`
allowing `camera=(self)` (POS barcode scanner, same-origin only) and denying
mic/geo, CSP restricting to `'self'` + required externals
(no `'unsafe-inline'` scripts in prod).

## Middleware posture

`middleware.ts` is a **soft gate** — it checks only for the presence of a
Supabase auth cookie to redirect unauthenticated users, because Edge can't run
the full session validation. The **hard gate** is every API route and server
component self-verifying via `verifySessionCookie()`. Invariant: never add a
page or route that relies on the middleware alone for auth.

## Known open items

- **S2 — staging shares the production Supabase project.** Split runbook in
  `docs/ENVIRONMENTS.md`; requires operator action (new project + secrets).
- Production `npm audit`: 2 moderate (postcss transitive under `next`, needs a
  breaking bump). No high/critical in runtime paths.
- Migrations `0036`/`0037` must be applied per env (`supabase db push`).

## Verifying

```bash
npm run audit:security     # 7 automated checks — must be 0 fail
npm test                   # security unit tests (rate-limit, require-feature,
                           # csrf-cron, delivery-token, secret-cipher)
npm run lint && npx tsc --noEmit
```
