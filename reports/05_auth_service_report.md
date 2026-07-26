# Report 5 — User Service & Authentication (Providers)

**Project:** Makhzoon
**Phase:** 1 — Baseline analysis (read-only)
**Date:** 2026-07-24
**Method:** Static inspection of `lib/supabase/*`, `lib/platform/tenancy/*`, auth/invite/signup routes, `middleware.ts`, `wrangler.toml`. Auth *provider enablement* is configured in the Supabase dashboard per project and is **not** in the repo — where that matters it is called out as "verify in console." No changes made.

---

## 1. Supabase Auth configuration — providers

**User-facing authentication is email/password only.**
- Login uses `supabase.auth.signInWithPassword(...)` (`app/[locale]/(auth)/login/page.tsx:427,451`).
- Server-side provisioning uses `supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, … })` (`lib/supabase/auth-admin.ts:22-33`).
- **No social/OAuth user login exists.** A codebase search for `signInWithOAuth` returns nothing for user auth. The OAuth references that *do* exist are unrelated **service integrations** — Google Drive (service-account JWT→token, `lib/drive/client.ts`), Square/SumUp card terminals (`lib/modules/haraka/card-terminal/providers/*`), and the stubbed Fawtara client (`lib/modules/haraka/fawtara/client.ts`). These are machine-to-machine, not end-user sign-in.

**Username accounts:** staff without a real email can be invited by *username*; the system creates a **synthetic address** `<username>@makhzoon.local` (`lib/supabase/auth-helpers.ts` comment; `invites/[token]/accept/route.ts:62`). Implication: those accounts **cannot receive email** (no self-service email password reset — must be reset by an admin).

**Does it match intent?** Email/password-only matches a B2B invite-driven product. Two caveats:
- **Provider enablement is not verifiable from the repo** — there is no `supabase/config.toml`. Whether e.g. anonymous sign-ins or unintended external providers are toggled **must be checked in each project's Supabase dashboard** (dev / staging / prod). Recommend confirming only Email is enabled and "Confirm email" policy is intentional (see §5).
- **`email_confirm: true`** means every created account is pre-confirmed → **email ownership is never verified** (§5).

---

## 2. Edge-compatibility of the Supabase client

**Satisfied where it applies — with a nuance the brief's blanket rule misses.**

| Client | File | `persistSession`/`autoRefreshToken` | Notes |
|---|---|---|---|
| Service-role (raw `@supabase/supabase-js`) | `lib/supabase/admin.ts:38-40` | ✅ **`autoRefreshToken: false, persistSession: false`** explicitly set | Correct — this is the client the brief's constraint targets. |
| Server SSR (`createServerClient`, `@supabase/ssr`) | `lib/supabase/server.ts` | Managed via cookies | `@supabase/ssr` is purpose-built for SSR/edge; it does not persist a background session or run a refresh timer the way the classic client does, so the flags are not applicable in the same way. Edge-safe by design. |
| Browser (`createBrowserClient`, `@supabase/ssr`) | `lib/supabase/client.ts` | Managed via cookies | Uses a **dynamic `import()`** to dodge a Turbopack bug that otherwise breaks the client chunk (documented at `client.ts:6-10`) — an edge/build-tool nuance worth knowing. |

**Verdict:** the "persistSession:false / autoRefreshToken:false" requirement is met on the raw admin client (the one that needs it); the SSR clients achieve edge-compatibility through `@supabase/ssr`'s cookie-based model. No misconfiguration found.

---

## 3. Session handling consistency across dev / staging / production

**Consistent by construction.**
- Three **separate Supabase projects**, one per environment, wired through `wrangler.toml` vars:
  - dev → `ltujtoabnewoypittoku.supabase.co`
  - staging → `ncjzozvzjtyycdlwohtr.supabase.co`
  - production → `ebupajukvyhparjkhlhr.supabase.co`
- The **same code path** (`verifySessionCookie` → cache → revocation → authoritative re-read) runs in all three; there is no per-env branching in the auth logic.
- **Local-only divergence:** `localAuthBypass()` (`auth-helpers.ts:29-55`) short-circuits auth **only** when `NODE_ENV === 'development'` **and** `LOCAL_AUTH_BYPASS_USER_ID` is set (from gitignored `.env.local`). All cloud environments run `NODE_ENV=production`, so the bypass is inert there. This is correctly fenced, but note it exists.
- `middleware.ts` applies the same host→env and session-cookie gate for `app.`, `dev.`, and `stg.` hosts uniformly (`middleware.ts:9`).

---

## 4. Role / claims mapping — reliable and server-enforced

**Mapping is correct and resilient to stale JWT claims.**
- At creation, `role` and `organization_id` are written to **JWT `app_metadata`** (`auth-admin.ts:27-31`).
- On every resolution, `verifySessionCookie()` treats the **database as authoritative**, re-reading `role`/`organization_id`/`permissions` from `public.users` (org roles) or `superadmin_users` (platform roles) — so **role/org changes take effect without re-login** (`auth-helpers.ts:126-200`). JWT claims are only a hint.
- **Role set:** `super_admin`, `makhzoon_admin`, `makhzoon_support` (platform) and `org_owner`, `admin`, `staff` (org) — a superset of the brief's "Super Admin / Org Admin / Staff". Staff additionally carry granular per-module/per-space permissions.
- **Safe default:** if a role can't be determined, it defaults to `staff` (`auth-helpers.ts:147`) — least-privilege.
- **Server-side enforcement is double-layered:** route handlers call `requirePermission`/`requireFeature`; services re-check via `hasPermission` (Report 2 §B.2). Client role state (Zustand) is never trusted for authorization.
- **Transfer mode:** for platform-admin roles, a `transferOrgId` cookie overrides `organizationId`, enabling tenant impersonation (`auth-helpers.ts:150-153`).

---

## 5. Auth bugs, edge cases & invite-flow gaps

### 5.1 The open question — does the first Admin invite fire automatically? **No.**
- **Superadmin-created orgs:** `app/api/superadmin/organizations/route.ts` creates the org and **does not send any invite** (verified — no `sendEmail`/`createInvite` calls). Inviting the first admin is a **separate, manual** action via `app/api/superadmin/invite/route.ts` (superadmin picks org + email + role → token, 7-day expiry, email + QR fallback).
- **Self-serve orgs:** `app/api/organizations/self-serve/route.ts` creates the `org_owner` **directly with a chosen password** — no invite is needed because the signer *is* the first admin.
- **Conclusion:** there is **no path where a first-admin invite fires automatically** on org creation. If the onboarding wizard is expected to auto-invite, that behaviour is **not implemented** — the wizard would need to call the invite endpoint explicitly. (Report only.)

### 5.2 Email verification is bypassed
`email_confirm: true` on all created users → **email ownership is never proven**. Self-serve signup will happily create an account for any well-formed address (subject to rate limiting + an "email already exists" check). Deliberate for the current stage, but a phishing/typo/impersonation vector to close before GA.

### 5.3 Non-transactional account creation → orphan risk
Both `self-serve` and `invites/[token]/accept` create the auth identity, then `public.users`, then (self-serve) a subscription — **without a DB transaction**. If a later step fails:
- Self-serve rolls back the auth user only if **org creation** fails (`self-serve/route.ts:62-65`); a failure in `createUser`/`createSubscription` **after** that leaves an orphaned org/user.
- Invite-accept has **no rollback** — a `createUser` failure after `createAuthUser` leaves an auth identity with **no `public.users` row**; that user can authenticate but `resolveTenant` then throws `No organization context` (400). Broken-account state, not a breach.

### 5.4 Invite email delivery is best-effort
The invite row is created **before** the email send; if Resend fails, the invite still exists and the endpoint returns `messageSent:false` plus `acceptUrl` + a QR code (`superadmin/invite/route.ts:105-123`). Good manual fallback — **but the UI must surface `messageSent:false`**, or an invite can appear "sent" while no email went out.

### 5.5 Session cache vs revocation timing
- **Revocation is prompt:** `verifySessionCookie` checks the `revoked_sessions` deny-list **before** consulting the 5s session cache (`auth-helpers.ts:97`), so a revoked/killed session is rejected immediately.
- **Role *downgrades* lag:** a demotion or permission removal propagates only when the 5s session / 10s permission cache entry expires, and only per-isolate. Bounded (≤10s) and acceptable, but worth knowing for "revoke access now" expectations.
- Deactivation is thorough: ~100-year ban + global sign-out + revocation (`auth-admin.ts:66-83`).

### 5.6 Minor
- `decodeJwt()` reads claims **without** signature verification — safe here because it runs only *after* `getUser()` has verified the token (documented at `auth-helpers.ts:57`), but easy to misuse if copied elsewhere.
- A bearer-token path (`verifyIdToken`, `auth-helpers.ts:224`) exists in parallel to the cookie path; confirm which routes rely on it and that it enforces the same authoritative re-read (it currently reads role/org from JWT claims only, **not** from `public.users`) — a potential inconsistency if used for authorization.

---

## Summary verdict

| Area | Verdict |
|---|---|
| Providers | Email/password only (+ synthetic-email usernames); no OAuth user login. Matches intent; **verify dashboard provider toggles per env**. |
| Edge compat | Correct — flags set on the raw admin client; SSR clients edge-safe via `@supabase/ssr`. |
| Cross-env consistency | Consistent (3 projects, one code path); local dev bypass correctly fenced to `NODE_ENV=development`. |
| Role/claims | Reliable, DB-authoritative, server-enforced, least-privilege default. |
| Gaps to address (Phase 2) | No auto first-admin invite; unverified emails; non-transactional signup/invite (orphan risk); invite-email best-effort UX; `verifyIdToken` reads claims-only. |
