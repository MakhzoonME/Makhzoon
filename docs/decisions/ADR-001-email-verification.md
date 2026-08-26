# ADR-001: Email Verification Strategy

| Field       | Value                              |
|-------------|------------------------------------|
| **Status**  | PROPOSED                           |
| **Authors** | Product Manager (Makhzoon Team)    |
| **Date**    | 2026-07-26                         |
| **Bug Ref** | BUG-08                             |

---

## Context

The self-serve signup flow creates a complete account (Auth user + Organization + User record + Trial subscription) in a single synchronous API call. Critically, the admin user-procreation function in `lib/supabase/auth-admin.ts` sets `email_confirm: true` on every created user:

```typescript
// lib/supabase/auth-admin.ts:25
await supabaseAdmin.auth.admin.createUser({
  email: params.email,
  password: params.password,
  email_confirm: true,  // ← email ownership is never proven
  ...
});
```

The codebase itself acknowledges this is a shortcut — the comment above the function reads:

> *"Greenfield/internal-staging note: created users are email-confirmed so they
> can sign in immediately"*

### Why this matters

- **Anyone can create an account for any well-formed email address.** A user only needs to know (or guess) an email — they do not need access to that inbox.
- **Account squatting:** A bad actor can register `competitor@makhzoon.com` and lock out the real owner.
- **No recovery path:** If the real owner later tries to sign up, they get "An account already exists for this email" (the 409 check in `route.ts` line 34-35) with no way to prove ownership.
- **Compliance risk:** GDPR and similar frameworks expect reasonable identity verification for services handling business data.
- **Pre-GA gap:** This was acceptable during greenfield/internal staging but blocks general availability.

---

## Decision

**How should Makhzoon verify email ownership before general availability?**

---

## Options

### Option A: Keep as-is (no email verification)

**What changes:** Nothing.

| Pros | Cons |
|------|------|
| Zero UX friction on signup | Anyone can create accounts for any email |
| Fastest path to "working" | Account squatting is trivial |
| No email infrastructure needed | Blocks GA / compliance requirements |
| | Real owners locked out permanently |

**Verdict:** Not acceptable for GA. Only viable as an explicit beta-stage trade-off with a hard deadline.

---

### Option B: Supabase built-in email confirmation flow

**What changes:** Remove `email_confirm: true` from `createAuthUser()`. After the API creates the auth identity, Supabase automatically sends a confirmation email. The user must click the link (or enter the token) before their account becomes active.

| Pros | Cons |
|------|------|
| Uses Supabase's native flow — minimal custom code | UX change: signup is now two-step (form → inbox → confirm) |
| Proves inbox ownership before account activation | Expected sign-up drop-off (industry avg: 10-30%) |
| Leverages Supabase's email templates (customizable) | Need to configure Supabase email templates / SMTP |
| Standard pattern users expect | Need to handle edge cases: expired links, resend flow |
| | Org/subscription creation must be deferred until confirmation (adds state machine complexity) |

**Implementation sketch:**

1. `createAuthUser()` → remove `email_confirm: true` (default is `false`)
2. Self-serve route creates the auth user and returns a "check your email" response — does **not** yet create org/user/subscription
3. A new callback route (`/api/auth/callback`) handles Supabase's confirmation redirect
4. On successful confirmation → the callback creates org, user record, and trial subscription
5. Add a "resend confirmation email" endpoint
6. Configure Supabase email template with Makhzoon branding

**Verdict:** Recommended for GA readiness.

---

### Option C: Magic Link / OTP verification

**What changes:** Instead of Supabase's built-in flow, implement a custom magic-link or time-based OTP (one-time password) sent via email.

| Pros | Cons |
|------|------|
| More control over the verification UX | Significantly more custom code to build and maintain |
| Can combine verification with "set password" in one step | Must build and maintain email sending infrastructure |
| OTP works well for mobile-first flows | More complex than Option B for same outcome |
| | Need to handle OTP expiry, rate-limiting, and abuse prevention separately |

**Verdict:** Over-engineered for current stage. Could be revisited if Supabase's native flow proves insufficient.

---

## Recommendation

**Option B — Supabase built-in email confirmation flow — before GA.**

Rationale:
1. It is the industry-standard pattern that users expect
2. It leverages existing Supabase infrastructure with minimal custom code
3. It directly closes the account-squatting and compliance gaps
4. It is the best balance of security, UX, and implementation effort

### Suggested timeline

| Phase | Action |
|-------|--------|
| **Now (beta)** | Keep current behavior, but add a TODO/flag in code linking to this ADR |
| **Pre-GA sprint** | Implement Option B (estimated 2-3 days of backend + frontend work) |
| **Post-GA review** | Evaluate drop-off metrics; consider Option C if conversion is a concern |

---

## Implications

### UX changes
- Self-serve signup becomes a **two-step flow**: fill out the form → receive email → click link → account is created
- Users will see a "Check your email to confirm your account" page instead of being immediately logged in
- Password reset flow (`/api/auth/password-reset`) remains unchanged and continues to work as a secondary path

### Engineering work
- **Backend:** Remove `email_confirm: true`, create a confirmation callback endpoint, implement deferred org/subscription creation (state machine or pending-signup table)
- **Frontend:** Add a "check your email" confirmation page, resend-confirmation UI, and handle the callback redirect
- **Email templates:** Configure Supabase SMTP and create branded confirmation email template
- **Database:** Consider a `pending_signups` table or a `status` column on `organizations` / `users` to track unconfirmed accounts

### Business impact
- **Expected drop-off:** Industry data suggests 10-30% of users abandon sign-up flows that require email confirmation. This is a known trade-off for security.
- **Mitigation:** Make the email very clear and easy to find (check spam prompts, "resend" button). Consider a short grace period (e.g., 15 minutes) where the account is soft-created but inactive.
- **Positive signal:** Email verification signals legitimacy and builds trust with prospective customers evaluating Makhzoon for their business.

### Risk
- If SMTP is misconfigured or rate-limited, users cannot confirm and are stuck. Mitigation: monitoring, alerting on bounce/failure rates, and a manual override path for support.

---

## Open Questions (Stakeholder Input Needed)

1. **Timeline:** Is pre-GA the right milestone for this, or can it slip to post-launch with a hotfix plan?
2. **Grace period:** Should unconfirmed accounts be soft-created (pending) or should the full account not be created until confirmation?
3. **Email provider:** Are we using Supabase's built-in email service, or a custom SMTP provider (SendGrid, Resend, etc.)?
4. **Trial start:** Does the 14-day trial start at signup or at email confirmation? (impacts compliance and UX)
5. **Admin-created users:** Should admin-created users (via the admin panel) also require email verification, or is the current `email_confirm: true` acceptable for admin-initiated provisioning?

---

*This document requires stakeholder review and approval before implementation begins.*
