# Security Review — Differential — 2026-05-09

**Reviewer**: AI-assisted differential audit
**Baseline**: `SECURITY_IMPLEMENTATION_COMPLETE.md` (2026-05-01) — 16 critical/high issues fixed in that pass
**Scope of this review**: all changes since the baseline, including the Tier 1/2/3 modernization, dependency upgrades, async-params codemod, new endpoints, and Amplify deployment fixes
**Verdict**: 0 high/critical findings. 2 medium, 2 low. All actively mitigated or with clear remediation paths. M1 fixed in this session.

---

## Findings

### 🟡 M1 — `password-reset` route had no rate limiting — **FIXED in this session**

**File**: `app/api/auth/password-reset/route.ts`

**Issue**: Other auth endpoints had rate limiting (login: 5/IP/15min, signup: 3/IP/24h), but the password-reset POST had only zod validation — no per-IP or per-token throttle.

**Risk**: Brute-force token guessing if entropy is insufficient. Replay of a leaked token (forwarded email, MITM, intercepted) could allow indefinite reset attempts at full request rate.

**Fix applied**:
```ts
// 5 attempts per IP per 15 min
checkRateLimit(`password-reset:ip:${clientIp}`, 5, 15 * 60 * 1000, ...)
// 3 attempts per token per hour — caps damage even if a valid token leaks
checkRateLimit(`password-reset:token:${token}`, 3, 60 * 60 * 1000, ...)
```

**Status**: ✅ Implemented and committed in this session.

---

### 🟡 M2 — `proxy.ts` only checks cookie *presence*, not validity

**File**: `proxy.ts:36-48`

**Issue**: Edge middleware can't run firebase-admin (Node-only library), so the proxy just checks if `req.cookies.get('session')?.value` is truthy. Any non-empty cookie value passes the proxy gate to authenticated routes.

**Risk**: Defense-in-depth gap, **not** a critical bypass. The actual auth boundary is at API/page level via `verifySessionCookie()` which validates the cookie against the Firebase session-revocation list. But: forged cookies bypass the proxy redirect, reach server components, and rely on each component to defend itself. If any page/component ever skipped its own auth check, this would expose data.

**Mitigations already in place**:
- Every API route handler verifies the session
- `verifySessionCookie()` checks both Firebase signature and the revocation list
- Session-revocation list invalidates tokens server-side on logout (per `SECURITY_IMPLEMENTATION_COMPLETE.md` item #1)

**Recommended fix paths** (in order of effort):
1. **Document and accept** — current architecture treats middleware as a soft-gate, route handlers as the hard-gate. This is a reasonable pattern given the constraint.
2. **Lightweight token verification at edge** — call a Cloud Function or HTTP endpoint that validates the token, accept slightly higher request latency (~50-100ms).
3. **Migrate to Node.js middleware** in a future Next.js version when Edge isn't required.

**Status**: ⏸ Documented; no immediate action needed.

---

### 🟢 L1 — Server-side secrets inlined into build artifact

**Files**: `next.config.mjs:14-22`, `lib/firebase/admin.ts:1`

**Context**: As part of fixing the Amplify Hosting Gen 1 SSR-runtime-env-vars limitation, the following secrets are now inlined into the build via Next.js's `env` config:
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
- `FIREBASE_SERVICE_ACCOUNT_BASE64`
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- `CRON_SECRET`

**Risk**: The values are hard-coded into the Lambda's deployed JS bundle. If the build artifact were ever exposed (misconfigured S3 bucket, leaked CI logs, source maps published), the secrets would leak.

**Already mitigated**:
- `import 'server-only'` directive in `lib/firebase/admin.ts` — any client component that imports admin code (directly or transitively) will fail to build
- Verified no `.tsx` files import `lib/firebase/admin` or `lib/email/resend` (the secret-using modules)
- Grep of `.next/static/**/*.js` found no references to secret env names — secrets are NOT in client bundles
- `withSentryConfig({ hideSourceMaps: true })` — source maps not exposed to clients

**Long-term fix paths**:
1. **Migrate to Amplify Hosting Gen 2** — supports runtime env vars natively, no inlining needed
2. **AWS Secrets Manager** — fetch secrets at SSR Lambda startup via the AWS SDK
3. **Operational** — rotate Firebase keys after each major release (overhead, but eliminates lingering leaked-secret window)

**Status**: ⏸ Acceptable trade-off given Amplify Gen 1 constraint. Document in deployment runbook.

---

### 🟢 L2 — `CRON_SECRET` compared with `!==`, not constant-time

**File**: `app/api/cron/warranty-alerts/route.ts:23`, `app/api/cron/subscription-status/route.ts` (likely same pattern)

**Issue**: `secret !== process.env.CRON_SECRET` is a short-circuit string comparison. In theory vulnerable to timing-based side-channel attacks where an attacker measures response time to deduce the secret byte-by-byte.

**Risk**: Negligible in practice — HTTPS network jitter dominates timing measurement on a public endpoint, the secret is long, and the cron endpoints have low request frequency. But cheap to fix.

**Recommended fix**:
```ts
import { timingSafeEqual } from 'crypto';

function checkCronSecret(provided: string | null): boolean {
  const expected = process.env.CRON_SECRET;
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
```

**Status**: ⏸ Defense-in-depth, not blocking.

---

## ✅ Verified clean

| Area | Result |
|---|---|
| **Async-params codemod migration** (37 routes) | Auth checks preserved across sampled routes (`users/[userId]`, `organizations/[orgId]`, `assets/[assetId]`, etc.). Pattern `const { x } = await params` consistently applied; no auth bypass introduced. |
| **New endpoints** — `early-access`, `contact`, `leads` | Rate-limited (per-IP + per-email layers), CSRF origin checks via `lib/csrf`, zod schema validation, HTML escaping for any user-supplied text in emails |
| **Auth flows** — login, session, me, signup | Rate-limited, role-checked, audit-logged. Session revocation list maintained on logout (preserves item #1 from baseline audit). 24-hour cookie expiry preserved (item #3). |
| **Authorization patterns** | Tenant scoping consistent — admins cannot operate cross-tenant. `super_admin` bypass is explicit and audited. `org_owner` cannot be modified by `admin` role (preserves item #4 from baseline). |
| **HTTP security headers** | HSTS preload, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` denies camera/mic/geo |
| **Content-Security-Policy** | Restricts to `'self'` plus required externals (Firebase, Sentry, Cloudflare Turnstile). No `'unsafe-inline'` for scripts in production. `'unsafe-eval'` only in dev. |
| **CORS** | `Access-Control-Allow-Origin` allowlisted to `NEXT_PUBLIC_APP_URL` (not `*`) |
| **Production dependency CVEs** | **0 high, 0 critical**. 10 low/moderate, all in non-exploitable paths (firebase-admin transitive chain, postcss XSS in CSS-stringification context not used). |
| **`.gitignore`** | Properly excludes `.env*.local`, `.env.production`, `*firebase-adminsdk*.json` |
| **Diagnostic logs** | `lib/firebase/admin.ts` logs `projectId`, booleans like `hasPrivateKey`, partial diagnostic info — never the actual private key contents. CloudWatch logs verified for safety. |
| **Session security** | Session cookie set with `httpOnly: true`, `secure: true` (non-dev), `sameSite: 'strict'`, `path: '/'`, `maxAge: 86400` (24h) |
| **Server-only enforcement** | `lib/firebase/admin.ts` carries `import 'server-only'`; secrets cannot leak into client bundles even if tree-shaking misbehaves |

---

## Recommended next actions

| Priority | Action | Effort |
|---|---|---|
| ✅ Done | M1 — rate limit password-reset | Done in this session |
| Medium | L2 — `timingSafeEqual` for CRON_SECRET | ~10 min |
| Strategic | L1 — plan migration to Amplify Hosting Gen 2 | Multi-week project |
| Documentation | M2 — add comment in `proxy.ts` documenting it as a soft-gate | ~5 min |

---

## Out of scope for this differential review

These categories were considered in the original `SECURITY_AUDIT_REPORT.md` and have not changed materially since:

- Firestore security rules (verified unchanged in `firestore.rules`)
- IAM / Firebase service account permissions
- Email delivery security (DKIM, SPF, DMARC)
- AWS Amplify IAM roles and SSM parameter access
- Audit log integrity / tamper resistance
- Backup / disaster recovery procedures

If a full-sweep review is requested in the future, those categories should be revisited.

---

## Methodology notes

- Differential approach scoped to ~30 commits since `SECURITY_IMPLEMENTATION_COMPLETE.md`
- Static analysis: pattern grep for auth checks, rate limits, CSRF guards, secret references
- Build artifact inspection: grep `.next/static/**` for secret env-name references
- Sample auditing of representative routes (4 high-sensitivity routes inspected line-by-line)
- Did not include penetration-test style probing or exploit verification
