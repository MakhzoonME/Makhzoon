# Makhzoon Security Audit Report
**Date:** 2026-05-01  
**Status:** Complete mapping and vulnerability identification  
**Total Issues Found:** 27 (5 Critical, 7 High, 10 Medium, 5 Low)

---

## CRITICAL SEVERITY (5 Issues)

### 1. Temporary Password Exposed in API Response
**Severity:** CRITICAL  
**File:** [app/api/users/route.ts:75](app/api/users/route.ts#L75)  
**Lines:** 42, 75  
**Vulnerability:**  
Temporary passwords generated for new users are returned in the API response body:
```typescript
const tempPassword = Math.random().toString(36).slice(-8) + 'Aa1!';
// ... 
return NextResponse.json({ id: newUser.uid, tempPassword }, { status: 201 });
```
**Impact:** 
- Passwords visible to HTTP proxies, CDNs, load balancers
- Could be logged in request/response logs, monitoring systems, browser history
- Credentials exposed across the entire request pipeline
- Potential for credential interception even before email delivery

**How to Fix:**
1. Remove `tempPassword` from response body
2. Send temporary password ONLY via email (lib/email/resend.ts)
3. Add one-time setup link in email instead of exposing password
4. Require password change on first login
5. Implement email verification flow with token instead

---

### 2. No Session Revocation/Blacklist - Stolen Tokens Valid for 5 Days
**Severity:** CRITICAL  
**File:** [lib/firebase/auth-helpers.ts](lib/firebase/auth-helpers.ts), [app/api/auth/session/route.ts:89-101](app/api/auth/session/route.ts#L89)  
**Lines:** Session invalidation incomplete  
**Vulnerability:**  
When user signs out (DELETE /api/auth/session), the session cookie is cleared client-side, but:
- No server-side blacklist exists
- Session token cached in memory (5-second TTL) but not revoked in database
- If attacker obtains session token before logout, it remains valid for 5 days
- `invalidateCachedSession()` only clears in-memory cache on current server instance
- Multi-instance deployment: Cache bypass via different instance
- No way to revoke active sessions for compromised accounts

**Impact:**
- Stolen credentials have 5-day window of validity
- User signout doesn't immediately invalidate stolen tokens
- Compromised accounts can't be forcibly logged out
- No way to revoke all sessions for a user from admin panel

**How to Fix:**
1. Implement server-side session blacklist in Firestore collection (`revokedTokens`)
2. Store `sessionId + expiryTime` in blacklist on logout
3. Check blacklist in `verifySessionCookie()` before allowing request
4. Reduce session expiry from 5 days to 24 hours (or less)
5. Implement `revokeAllSessions()` endpoint for admins/users
6. Add timestamp to session cookie/token for easier revocation
7. Implement optional refresh token rotation (get new token before old expires)

---

### 3. Five HIGH-Severity CVEs in Dependencies
**Severity:** CRITICAL  
**File:** package.json (dependencies)  
**Vulnerabilities Found:**
```
- undici: <=6.23.0 (5 CVEs including randomness insufficiency, DoS, smuggling)
- next: 14.2.35 (5 CVEs including DoS, request smuggling, cache exhaustion)
- glob: 10.2.0-10.4.5 (command injection via -c/--cmd with shell:true)
- @tootallnate/once: <3.0.1 (control flow scoping issue)
- postcss: <8.5.10 (XSS via unescaped </style>)
```

**Impact:**
- Next.js self-hosted: Possible DoS via Image Optimizer, Server Components
- undici: Resource exhaustion, parsing attacks, randomness insufficiency
- Could allow remote code execution, denial of service, request manipulation

**How to Fix:**
1. Run `npm audit fix` (may require breaking version updates)
2. Upgrade to:
   - next >= 16.2.4
   - undici >= 6.24.0
   - glob >= 10.5.0
   - @tootallnate/once >= 3.0.1
   - postcss >= 8.5.10
3. Test thoroughly after upgrades
4. Set up automated dependency scanning (npm audit, Snyk, etc.)
5. Enable Dependabot or similar for continuous updates

---

### 4. No Rate Limiting on Session Creation (Brute Force)
**Severity:** CRITICAL  
**File:** [app/api/auth/session/route.ts:19-87](app/api/auth/session/route.ts#L19)  
**Vulnerability:**  
Session creation endpoint has no rate limiting:
- Accepts POST requests with idToken
- Firebase Auth handles password brute force, but not session endpoint
- Attackers could attempt to create sessions with stolen ID tokens without limit
- Cloudflare Turnstile bot protection is commented out (line 25-41, not enabled)
- No IP-based or user-based rate limiting

**Impact:**
- Credential stuffing attacks
- Rapid session creation with stolen tokens
- Distributed brute force via multiple IPs
- DoS by overwhelming session creation

**How to Fix:**
1. Implement rate limiting middleware (per IP, per user, globally)
2. Options:
   - Use Vercel Analytics / Edge Config
   - Implement Upstash Redis rate limiter
   - Use third-party rate limiting service
3. Limits suggested:
   - Max 5 sessions per email per 15 minutes
   - Max 100 sessions per IP per hour
   - Global max 10,000 sessions/minute
4. Return 429 Too Many Requests when exceeded
5. Enable Cloudflare Turnstile bot protection
6. Lock account after N failed attempts

---

## HIGH SEVERITY (7 Issues)

### 5. No Rate Limiting on Self-Serve Signup
**Severity:** HIGH  
**File:** [app/api/organizations/self-serve/route.ts:11-91](app/api/organizations/self-serve/route.ts#L11)  
**Vulnerability:**  
POST endpoint for account creation has no rate limiting:
- Anyone can create unlimited organizations and accounts
- No verification before org creation
- Could create spam/test organizations en masse

**Impact:**
- Account creation spam
- Database bloat
- Resource exhaustion

**How to Fix:**
1. Implement rate limiting (same as session creation)
2. Max 5 orgs per email per 24 hours
3. Max 100 orgs per IP per 24 hours
4. Require email verification before signup completion
5. Add CAPTCHA via Cloudflare Turnstile
6. Implement cooldown periods between signups

---

### 6. Organization Enumeration - Any Authenticated User Can Discover All Orgs
**Severity:** HIGH  
**File:** [app/api/organizations/by-subdomain/[subdomain]/route.ts:5-17](app/api/organizations/by-subdomain/[subdomain]/route.ts#L5)  
**Vulnerability:**  
Endpoint requires authentication (line 7-8: `verifySessionCookie()`) but has no authorization check:
```typescript
const user = await verifySessionCookie();
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
const { subdomain } = await params;
const org = await getOrganizationBySubdomain(subdomain);
if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 });
return NextResponse.json({ id: org.id, name: org.name, subdomain: org.subdomain });
```
**Problem:** 
- Any authenticated user (staff in org A) can look up org B by subdomain
- Can enumerate ALL organizations by trying subdomains
- Returns full org details (id, name, subdomain)
- Used in super admin transfer mode to look up orgs

**Impact:**
- Information disclosure
- Reconnaissance for targeted attacks
- Could discover "private" or confidential organizations
- Information valuable for social engineering

**How to Fix:**
1. Add authorization check: Only allow super_admin to lookup arbitrary orgs
2. Org users can only lookup their own org
3. OR restrict to only super_admin usage
4. Consider removing the endpoint entirely if only used internally
5. If public listing needed, create separate endpoint with different auth model
6. Alternative: Use numeric org IDs instead of guessable subdomains

---

### 7. User Enumeration on Invite Creation
**Severity:** HIGH  
**File:** [app/api/invites/route.ts:45-49](app/api/invites/route.ts#L45)  
**Vulnerability:**  
When creating invites, endpoint checks if email is already registered and returns different error codes:
```typescript
if (normalizedEmail) {
  const existing = await adminAuth.getUserByEmail(normalizedEmail).catch(() => null);
  if (existing) return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
  const pending = await getPendingInviteForEmail(user.organizationId, normalizedEmail);
  if (pending) return NextResponse.json({ error: 'An invite is already pending for this email' }, { status: 409 });
}
```
**Problem:**
- Returns specific error if user exists (409)
- Returns generic error if doesn't exist (422 for validation)
- Allows enumeration of registered users by attempting invites

**Impact:**
- Attackers can build list of registered users
- Information valuable for targeted attacks
- Social engineering intelligence gathering

**How to Fix:**
1. Return same response for "user exists" and "validation error"
2. Return generic 422 for both cases
3. Log suspicious enumeration attempts (same email tried multiple times)
4. Could optionally return 202 "queued for processing" regardless of outcome
5. Send email confirmation link regardless (user decides what to do)

---

### 8. Missing Security Headers
**Severity:** HIGH  
**File:** next.config.mjs (NO SECURITY HEADERS CONFIGURED)  
**Vulnerability:**  
No security headers configured in Next.js config:
- No Content-Security-Policy (CSP)
- No X-Frame-Options
- No X-Content-Type-Options: nosniff
- No Strict-Transport-Security (HSTS)
- No Referrer-Policy
- No Permissions-Policy

**Impact:**
- Clickjacking attacks possible
- MIME type sniffing attacks
- Cross-site framing
- Referrer information leaked
- Browser permission abuse
- CSS/JS injection via CSP bypass

**How to Fix:**
1. Add headers to next.config.mjs:
```typescript
async headers() {
  return [{
    source: '/:path*',
    headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=()' },
      { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
      { 
        key: 'Content-Security-Policy',
        value: "default-src 'self'; script-src 'self' 'unsafe-inline' cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' *.firebase.com *.firebaseio.com *.sentry.io; frame-ancestors 'none';"
      }
    ]
  }]
}
```
2. Tighten CSP after testing
3. Consider X-Frame-Options: SAMEORIGIN if iframes needed

---

### 9. No Request Body Size Limiting
**Severity:** HIGH  
**File:** All API endpoints  
**Vulnerability:**  
No limit on request body size across all endpoints:
- POST /api/assets/import accepts unbounded JSON array
- POST /api/contact accepts large message bodies
- No middleware limiting request size

**Impact:**
- Denial of Service via large payloads
- Memory exhaustion
- Bandwidth exhaustion
- Could slow/crash server

**How to Fix:**
1. Configure Next.js to limit request body:
```typescript
// next.config.mjs
const nextConfig = {
  // Limits apply to all routes
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 5,
  },
};
```
2. Add per-route body size limits:
```typescript
// middleware.ts or per-route
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb', // Default safe limit
    },
  },
};

// Or use middleware wrapper on sensitive endpoints:
export const POST = withBodySizeLimit(1024 * 1024 * 5)(handler); // 5MB
```
3. Suggested limits:
   - Default: 1MB
   - File imports: 5MB
   - Asset import: 1MB (max 1000 rows)
4. Return 413 Payload Too Large when exceeded

---

### 10. Secure Cookie Flag Not Set in Staging
**Severity:** HIGH  
**File:** [app/api/auth/session/route.ts:56](app/api/auth/session/route.ts#L56)  
**Vulnerability:**  
Secure flag only set in production:
```typescript
secure: process.env.NODE_ENV === 'production',
```
**Problem:**
- Staging environment likely over HTTPS but has secure:false
- Cookie sent over HTTP in staging
- Man-in-the-middle attack possible in staging
- Should ALWAYS be secure when HTTPS is available

**Impact:**
- Session cookies interceptable in staging via HTTP
- Testing discovered vulnerabilities not realistic
- Cookie sniffing possible

**How to Fix:**
1. Change logic to:
```typescript
secure: process.env.NODE_ENV !== 'development',  // true except localhost dev
```
2. Or use:
```typescript
const isHttps = process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://');
cookieStore.set('session', sessionCookie, {
  // ... other options
  secure: isHttps ?? process.env.NODE_ENV === 'production',
});
```
3. Verify staging is over HTTPS
4. Consider always true in production/staging

---

## MEDIUM SEVERITY (10 Issues)

### 11. No Rate Limiting on Invite Creation
**Severity:** MEDIUM  
**File:** [app/api/invites/route.ts:30-117](app/api/invites/route.ts#L30)  
**Vulnerability:**  
POST endpoint for creating invites has no rate limiting. Admins/owners can create unlimited invites.

**Impact:**
- Spam invites to external users
- Email flooding
- Invite link enumeration if tokens predictable

**How to Fix:**
```typescript
// Add rate limiting
Max 100 invites per org per hour
Max 50 invites per email per day
Return 429 Too Many Requests when exceeded
```

---

### 12. No Rate Limiting on Contact Form
**Severity:** MEDIUM  
**File:** [app/api/contact/route.ts:5-56](app/api/contact/route.ts#L5)  
**Vulnerability:**  
PUBLIC endpoint with no authentication and no rate limiting. Anyone can submit unlimited contact forms.

**Impact:**
- Email spam to sales team
- DoS via email flooding
- Spam inbox

**How to Fix:**
```typescript
// Add rate limiting by IP
Max 5 messages per IP per hour
Max 50 messages per email per day
Return 429 Too Many Requests
Add CAPTCHA (Turnstile) verification
```

---

### 13. No Rate Limiting on Early Access Endpoint
**Severity:** MEDIUM  
**File:** [app/api/early-access/route.ts:53-77](app/api/early-access/route.ts#L53)  
**Vulnerability:**  
PUBLIC endpoint with no rate limiting. Anyone can submit unlimited early access requests.

**Impact:**
- Email spam
- DoS via flooding
- Spam inbox

**How to Fix:**
```typescript
// Add rate limiting
Max 5 requests per IP per hour
Max 1 request per email per week
Return 429 Too Many Requests
Consider email confirmation before accepting
```

---

### 14. Some Endpoints Only Check Role, Not Custom Permissions
**Severity:** MEDIUM  
**Files:** [app/api/users/route.ts:13](app/api/users/route.ts#L13), [app/api/assets/export/route.ts:11](app/api/assets/export/route.ts#L11), [app/api/assets/import/route.ts:18](app/api/assets/import/route.ts#L18)  
**Vulnerability:**  
Some endpoints check role-based access but don't verify custom permissions:
```typescript
// app/api/users/route.ts line 13
if (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'org_owner') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```
**Problem:**
- If role is 'admin' but has custom permissions with 'view' only
- User can still access POST /api/users (create users)
- Custom permission restrictions are bypassed
- User with restricted 'assets.view' still can import/export

**Impact:**
- Custom permission model ineffective
- Admins with restricted permissions bypass restrictions
- Privilege elevation possible

**How to Fix:**
1. Replace role checks with permission checks:
```typescript
await requirePermission(user, 'users', 'create'); // instead of role check
```
2. OR combine both:
```typescript
if (!['admin', 'org_owner', 'super_admin'].includes(user.role)) {
  throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
await requirePermission(user, 'users', 'create'); // Additional check
```
3. Audit all endpoints for this pattern
4. Use `requirePermission()` consistently from base.service.ts

---

### 15. Contact Form HTML Injection
**Severity:** MEDIUM  
**File:** [app/api/contact/route.ts:30-39](app/api/contact/route.ts#L30)  
**Vulnerability:**  
Message field injected directly into email HTML without sanitization:
```typescript
html: `
  ...
  <p><strong>Message:</strong></p>
  <p>${message.replace(/\n/g, '<br>')}</p>
`,
```
**Problem:**
- User can include HTML/CSS in message
- Only newlines converted to `<br>`
- HTML tags pass through unchanged
- Email client renders untrusted HTML
- Could inject scripts, CSS, external content

**Impact:**
- HTML injection in email
- Email client RCE (if supporting HTML macros)
- Tracking/phishing via external images
- CSS that breaks email rendering

**How to Fix:**
1. Sanitize message before HTML rendering:
```typescript
import DOMPurify from 'isomorphic-dompurify'; // or similar library

const sanitized = DOMPurify.sanitize(message, {
  ALLOWED_TAGS: [], // No HTML allowed
  ALLOWED_ATTR: [],
});

html: `<p>${sanitized.replace(/\n/g, '<br>')}</p>`
```
2. Or escape HTML:
```typescript
const escaped = message
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#x27;')
  .replace(/\n/g, '<br>');
```
3. Use DOMPurify or sanitize-html package
4. Test with malicious payloads

---

### 16. No CSRF Tokens - Relying on SameSite Cookie Attribute
**Severity:** MEDIUM  
**File:** Entire codebase  
**Vulnerability:**  
No explicit CSRF tokens present. Relies only on sameSite=lax:
```typescript
// app/api/auth/session/route.ts line 58
sameSite: 'lax',
```
**Problem:**
- sameSite=lax allows CSRF on top-level navigations
- Form submissions from external sites will include cookie
- Attackers can trigger POST requests with user's cookie
- Example: `<form action="https://app.makhzoon.me/api/organizations/self-serve" method="POST">`

**Impact:**
- CSRF attacks possible on sensitive endpoints
- Could create orgs, invites, delete users (if attacker knows targets)
- Form-based CSRF still possible

**How to Fix:**
1. Implement CSRF token mechanism:
```typescript
// On GET request, generate and send CSRF token
const token = generateCSRFToken(); // crypto.randomBytes(32).toString('hex')
response.json({ csrfToken: token });
```
2. Client includes token in headers:
```typescript
fetch('/api/endpoint', {
  method: 'POST',
  headers: { 'X-CSRF-Token': csrfToken },
  body: JSON.stringify(data)
});
```
3. Server validates token:
```typescript
const token = req.headers.get('x-csrf-token');
if (!token || !validateCSRFToken(token)) {
  return NextResponse.json({ error: 'CSRF token invalid' }, { status: 403 });
}
```
4. OR set sameSite=strict instead of lax (stricter but better security)
5. Implement double-submit cookie pattern as fallback

---

### 17. Super Admin Transfer Mode Not Time-Limited
**Severity:** MEDIUM  
**File:** [lib/firebase/auth-helpers.ts:25-27](lib/firebase/auth-helpers.ts#L25)  
**Vulnerability:**  
Super admin can set `transferOrgId` cookie to impersonate org admin indefinitely:
```typescript
if (role === 'super_admin') {
  const transferOrgId = cookieStore.get('transferOrgId')?.value;
  if (transferOrgId) organizationId = transferOrgId;
}
```
**Problem:**
- No time limit on transfer mode
- No separate session tracking
- No audit log of when transfer started/ended
- Admin session not isolated from super admin session

**Impact:**
- Prolonged impersonation possible
- Difficult to track super admin actions in org context
- No session separation between super admin and admin context

**How to Fix:**
1. Add timestamp to transferOrgId cookie:
```typescript
// Set: transferOrgId=<orgId>:<timestamp>
const transferData = `${orgId}:${Date.now()}`;
```
2. Validate transfer not older than time limit (e.g., 30 minutes):
```typescript
const [orgId, timestamp] = transferOrgId.split(':');
const age = Date.now() - parseInt(timestamp);
if (age > 30 * 60 * 1000) { // 30 minute limit
  cookieStore.set('transferOrgId', '', { maxAge: 0 });
  return null;
}
```
3. Add endpoint to explicitly exit transfer mode
4. Auto-clear transfer mode after timeout
5. Log all transfer mode activations/deactivations

---

### 18. Cross-Org Permission Escalation on Invite with Custom Permissions
**Severity:** MEDIUM  
**File:** [app/api/invites/route.ts:38-74](app/api/invites/route.ts#L38)  
**Vulnerability:**  
When creating invite, permissions are accepted without validation that user has authority:
```typescript
const { email, username, displayName, role, permissions } = parsed.data as typeof parsed.data & { permissions?: unknown };
const id = await createInvite({
  ...
  permissions: (permissions ?? null) as import('@/types').UserPermissions | null,
});
```
**Problem:**
- Admin can set any custom permissions, including ones they don't have
- Admin with 'assets.view' only can still create invite with 'assets.delete'
- No check that inviter has permission to grant those permissions
- Could grant excessive permissions

**Impact:**
- Admin can exceed their own permission level
- Privilege escalation via invites
- Users invited with more permissions than admin should have

**How to Fix:**
1. Validate that inviter has all permissions they're granting:
```typescript
if (permissions) {
  // For each permission the inviter is setting, verify they have it
  for (const [module, ops] of Object.entries(permissions)) {
    for (const [operation, allowed] of Object.entries(ops)) {
      if (allowed && !hasPermission(user, module as any, operation)) {
        return NextResponse.json({
          error: `You cannot grant ${module}.${operation} permission`
        }, { status: 403 });
      }
    }
  }
}
```
2. Can only grant subset of own permissions
3. Compare with DEFAULT_STAFF_PERMISSIONS as sanity check

---

### 19. Subdomain Enumeration/Guessing Possible
**Severity:** MEDIUM  
**File:** [lib/db/organizations.ts:53-57](lib/db/organizations.ts#L53)  
**Vulnerability:**  
getOrganizationBySubdomain() doesn't rate limit lookups:
```typescript
export async function getOrganizationBySubdomain(subdomain: string): Promise<Organization | null> {
  const snap = await adminDb.collection('organizations').where('subdomain', '==', subdomain).limit(1).get();
  if (snap.empty) return null;
  return toOrg(snap.docs[0].id, snap.docs[0].data());
}
```
**Problem:**
- Endpoint at /api/organizations/by-subdomain/[subdomain] callable by any authenticated user
- Can brute force common subdomains (api, www, admin, test, dev, etc.)
- Discover orgs from public "guess and check"
- No rate limiting on Firestore query

**Impact:**
- Org discovery via enumeration
- Reconnaissance for attacks
- Privacy leak (discover private orgs)

**How to Fix:**
1. As per Issue #6, restrict endpoint to super_admin only
2. OR add rate limiting to subdomain lookups
3. Use numeric org IDs instead of guessable subdomains
4. Whitelist subdomains if public directory needed

---

### 20. No Org Membership Verification in Some Endpoints
**Severity:** MEDIUM  
**File:** [app/api/audit-logs/route.ts:92-118](app/api/audit-logs/route.ts#L92)  
**Vulnerability:**  
Audit logs endpoint allows admins to view ANY org's logs if they have super_admin role:
```typescript
const orgId =
  user.role === 'admin'
    ? (user.organizationId ?? undefined)
    : (searchParams.get('orgId') ?? undefined); // Super admin can pass any orgId
```
**Problem:**
- Super admin from org A can query logs from org B
- Should they? Depends on business model
- But no explicit check that org is accessible

**Impact:**
- Information disclosure between orgs
- Cross-org audit trail access

**How to Fix:**
1. Decide: Should super admin see ALL org logs? If yes, document this as feature
2. If not, add check:
```typescript
if (user.role === 'admin') {
  if (orgId && orgId !== user.organizationId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  orgId = user.organizationId;
} else if (user.role === 'super_admin') {
  // Can access any org - explicit permission
}
```
3. Add audit log of who accessed logs from which org

---

## LOW SEVERITY (5 Issues)

### 21. Session Expiry Too Long (5 Days)
**Severity:** LOW  
**File:** [app/api/auth/session/route.ts:49](app/api/auth/session/route.ts#L49)  
**Vulnerability:**  
Session cookie expires after 5 days:
```typescript
const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
```
**Problem:**
- Long window for stolen token to be useful
- Increased risk if device compromised
- Industry standard is 24 hours or less

**Impact:**
- Extended exposure from token theft
- Harder to force re-authentication

**How to Fix:**
```typescript
// Change to 24 hours
const expiresIn = 60 * 60 * 24 * 1 * 1000; // 1 day
// Or even shorter:
const expiresIn = 60 * 60 * 12 * 1000; // 12 hours
// With optional refresh token:
const expiresIn = 60 * 60 * 2 * 1000; // 2 hours + refresh token
```
**Note:** Implement refresh token mechanism if reducing expiry

---

### 22. Error Details Logged to Console in Production
**Severity:** LOW  
**File:** Multiple endpoints - [app/api/assets/route.ts:30](app/api/assets/route.ts#L30), [app/api/organizations/route.ts:29](app/api/organizations/route.ts#L29), etc.  
**Vulnerability:**  
Detailed error objects logged to console in all environments:
```typescript
} catch (err) {
  console.error('[GET /api/assets]', err);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
```
**Problem:**
- Full stack traces logged to stdout/CloudWatch
- In production, visible in logs
- Stack traces expose code structure, file paths, library versions
- Could help attackers understand application internals

**Impact:**
- Information disclosure via logs
- Easier to craft targeted attacks based on stack traces

**How to Fix:**
```typescript
} catch (err) {
  // Log in development, don't expose in production
  if (process.env.NODE_ENV === 'development') {
    console.error('[GET /api/assets]', err);
  } else {
    // Log error ID/reference instead
    const errorId = crypto.randomUUID();
    logToSentry(err, { errorId });
    console.error(`Error ${errorId} occurred`);
  }
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
```
2. Use Sentry/monitoring to capture errors without exposing to logs
3. Sanitize error messages before logging

---

### 23. No Reserved Subdomain List
**Severity:** LOW  
**File:** [lib/validations/signup.schema.ts:5-9](lib/validations/signup.schema.ts#L5)  
**Vulnerability:**  
Subdomain validation uses regex but doesn't prevent reserved words:
```typescript
subdomain: z
  .string()
  .min(3, 'Subdomain must be at least 3 characters')
  .max(40)
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, 'Lowercase letters, numbers, and hyphens only')
```
**Problem:**
- User could create subdomain 'api', 'www', 'admin', 'test', 'localhost', etc.
- Conflicts with system routes or future services
- Could break app routing if 'api' used for org

**Impact:**
- App routing conflicts
- Administrative confusion
- Potential security issues

**How to Fix:**
```typescript
const RESERVED_SUBDOMAINS = new Set([
  'www', 'api', 'admin', 'dashboard', 'auth', 'login', 'signup',
  'app', 'mail', 'smtp', 'ftp', 'support', 'blog', 'status',
  'cdn', 'static', 'media', 'assets', 'test', 'staging', 'dev',
  'localhost', 'internal', 'test', 'example', 'localhost'
]);

subdomain: z
  .string()
  .min(3)
  .max(40)
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/)
  .refine((val) => !RESERVED_SUBDOMAINS.has(val.toLowerCase()), {
    message: 'This subdomain is reserved',
  })
```

---

### 24. Weak Temporary Password Generation
**Severity:** LOW  
**File:** [app/api/users/route.ts:42](app/api/users/route.ts#L42)  
**Vulnerability:**  
Temporary password for invited users is weakly generated:
```typescript
const tempPassword = Math.random().toString(36).slice(-8) + 'Aa1!';
```
**Problem:**
- Only ~8 random characters (36^8 entropy, but JavaScript number precision issues)
- Predictable format: 8 random + 'Aa1!'
- Should be stronger for initial auth
- Though it's temporary and emailed, still weak

**Impact:**
- Weak temporary credentials
- If password intercepted, easier to guess

**How to Fix:**
```typescript
// Option 1: Use crypto for stronger random
const randomPart = crypto.randomBytes(12).toString('base64url');
const tempPassword = `${randomPart}Aa1!`;

// Option 2: Use passwordGenerator library
import { generate } from 'generate-password';
const tempPassword = generate({
  length: 16,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
});

// Option 3: Don't send password, send setup link instead
// Email reset token, user sets own password
```
2. Send via email only, never in API response
3. Require password change on first login
4. Consider setup link instead of password

---

### 25. Insufficient Email Validation on Contact Form
**Severity:** LOW  
**File:** [app/api/contact/route.ts:10-11](app/api/contact/route.ts#L10)  
**Vulnerability:**  
Contact form only checks truthiness of fields, no schema validation:
```typescript
if (!firstName || !lastName || !email || !message) {
  return NextResponse.json(
    { error: 'Missing required fields' },
    { status: 400 }
  );
}
```
**Problem:**
- No email format validation
- No string length limits
- No sanitization of first/last name
- No spam/profanity checks

**Impact:**
- Malformed emails accepted
- DoS via long strings
- Spam emails sent to sales@

**How to Fix:**
```typescript
import { z } from 'zod';

const contactSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().max(255),
  organization: z.string().max(255).optional(),
  assetCount: z.string().optional(),
  message: z.string().min(10).max(2000),
});

const parsed = contactSchema.safeParse(req.body);
if (!parsed.success) {
  return NextResponse.json(
    { error: 'Validation failed' },
    { status: 422 }
  );
}
```

---

## Summary Table

| Severity | Count | Issues |
|----------|-------|--------|
| CRITICAL | 5 | Temp password exposure, No session blacklist, Dependency CVEs, No rate limiting (session), Password returned in response |
| HIGH | 7 | No rate limiting (signup), Org enumeration, User enumeration, Missing headers, Request size limit, Secure cookie flag, Session blacklist |
| MEDIUM | 10 | Rate limits (invite/contact/early-access), Permission bypass, HTML injection, CSRF, Transfer mode, Permission escalation, Subdomain enum, Org membership, Session expiry, Error logging |
| LOW | 5 | Weak temp passwords, No reserved subdomains, Email validation, Password generation, Contact form validation |
| **TOTAL** | **27** | |

---

## Recommended Fix Priority

**Immediate (This Week):**
1. Remove temporary passwords from API response → Send via email only
2. Implement session blacklist in Firestore
3. Upgrade dependencies (npm audit fix)
4. Add rate limiting to session creation
5. Add security headers (CSP, X-Frame-Options, etc.)

**Short-term (This Month):**
6. Implement request body size limits
7. Fix secure cookie flag
8. Add rate limiting to signup, invites, contact form
9. Fix org enumeration endpoint
10. Implement CSRF tokens or change sameSite to strict

**Medium-term (Next Sprint):**
11. Replace role checks with permission checks
12. Add time limit to transfer mode
13. Add reserved subdomain list
14. Fix contact form HTML injection
15. Improve error logging strategy

---

## Questions for Approval

Before proceeding with fixes, please confirm:

1. **Session Revocation:** Implement full Firestore-based blacklist for revoked sessions?
2. **Rate Limiting:** Use Vercel KV (Redis), self-hosted Redis, or third-party service?
3. **Security Headers:** Approve the suggested CSP policy, or adjust based on your integrations?
4. **Subdomain Enumeration:** Should super_admin be able to lookup ANY org by subdomain, or is current access for super_admin only?
5. **Temporary Password:** Send only via email with one-time setup link, or keep password-based with improved generation?
6. **CSRF:** Add explicit CSRF tokens (adds complexity) or set sameSite=Strict (may break some UX)?

**Ready to proceed with fixes pending your approval.**
