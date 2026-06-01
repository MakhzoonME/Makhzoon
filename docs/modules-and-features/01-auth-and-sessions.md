# Authentication & Sessions

---

## Overview

Authentication is handled by **Supabase Auth** with `@supabase/ssr` managing session cookies server-side. There is no client-side token exchange — Supabase's SSR helpers set and refresh httpOnly session cookies automatically.

---

## Roles

| Role | Scope | Description |
|------|-------|-------------|
| `super_admin` | Platform | Full platform access; manages all orgs |
| `makhzoon_admin` | Platform | Internal admin; org management + support |
| `makhzoon_support` | Platform | Support queue access |
| `org_owner` | Organization | Full org access; cannot be deactivated by others |
| `admin` | Organization | Most features; can manage users and settings |
| `staff` | Organization | Limited access determined by custom permissions |

---

## Sign-in Flow

1. User visits `/{locale}/login`.
2. Enters email + password.
3. Supabase Auth validates credentials; `@supabase/ssr` writes the session as httpOnly cookies.
4. Middleware reads the session on the next request and routes appropriately:
   - Platform roles (`super_admin`, `makhzoon_admin`, `makhzoon_support`) → `/superadmin/dashboard`
   - Org users → `/{orgSlug}/{defaultSpace}/dashboard`

## Invite Flow

1. Admin creates an invite for a new user in the Users settings page.
2. System emails a one-time token link: `/{locale}/invites/[token]`.
3. The invite page shows the inviter name, org, and assigned role.
4. User sets a password and submits.
5. Account is created via Supabase Auth, the session is established, and the user is redirected to the org dashboard.

## Sign-out Flow

1. `supabase.auth.signOut()` clears the session.
2. Session revocation is recorded in `lib/supabase/session-revocation.ts` so the old token cannot be replayed.
3. Hard redirect to `/{locale}/login`.

---

## Session Management

- **`@supabase/ssr`** — handles cookie-based session storage and automatic token refresh.
- **`lib/supabase/session-cache.ts`** — short-lived (5-10 second) in-memory cache for decoded sessions, so repeated requests in the same render cycle don't re-hit Supabase.
- **`lib/supabase/session-revocation.ts`** — records revoked session IDs so logout is honored even before token expiry.
- **Cookie flags**: `httpOnly`, `secure` (production), `sameSite: 'strict'`.

---

## Supabase Clients

| File | Use |
|------|-----|
| `lib/supabase/client.ts` | Browser client (anon key) |
| `lib/supabase/server.ts` | Server Components and API Routes (reads session cookies) |
| `lib/supabase/admin.ts` | Service-role client (server-only; bypasses RLS) |
| `lib/supabase/auth-helpers.ts` | Helper utilities used in API routes |

---

## Login Page UI

**Route**: `/{locale}/login`

**Layout**: Two-column on desktop (LG+):
- **Left column** — full-height form panel:
  - App logo at top
  - "Welcome back" headline
  - Email + password fields with Zod validation
  - "Forgot password?" link
  - Submit button (shows spinner while loading)
  - Error alert if credentials are wrong
- **Right column** (`hidden lg:flex`) — marketing panel with brand imagery/tagline.

On mobile the right panel is hidden; the form fills the full width with `max-w-sm` centered.

Dark mode: form panel uses `bg-surface-card` / `dark:bg-gray-900` tokens; inputs and button adapt accordingly.

RTL: the two-column layout mirrors correctly; form field labels and error messages align right in Arabic.

---

## Invites Page UI

**Route**: `/{locale}/invites/[token]`

**Layout**: Centered card (`max-w-md w-full px-4`) on a neutral background.
- Org logo / name at top
- "You've been invited to {org} as {role}" message
- Password + confirm password fields
- Accept invitation button
- Error state if token is expired or already used

Works correctly in both RTL and LTR; adapts to dark mode.

---

## Middleware (Route Protection)

`middleware.ts` at the project root handles:

1. **Domain routing** — `makhzoon.me` / `www.makhzoon.me` → marketing/coming-soon; `app.makhzoon.me` → app.
2. **Locale detection** — reads `makhzoon-locale` cookie → Accept-Language → defaults `en`; redirects to `/{locale}/...` if missing.
3. **Soft session gate** — if a protected route is accessed without a valid session cookie, redirects to `/{locale}/login?redirect=...`.

Public paths (marketing pages, `/invites/*`, `/api/ping`) bypass the session gate.
