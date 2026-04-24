# Context — Session Fixes & Additions (2026-04-24)

This document captures everything that changed in today's session so future work can pick up cold.

---

## 1. Summary

Three user-visible outcomes:

1. **Motion/UX polish across the app** per the spec in `UX_ANIMATION_UPGRADE.md` — easing tokens, page transitions, button press, shimmer skeletons, animated login/signup.
2. **Retractable sidebar** — collapses to icons-only with tooltips, width animates, persisted to localStorage, togglable from header or sidebar footer.
3. **Login flow restored** — diagnosed three stacked blockers (missing `.env.local`, crashing Firebase client SSR, a remount bug in the shake-on-error animation) and got super-admin sign-in working end-to-end.

Test data seeded across 3 orgs using the existing `scripts/seed-test-fleet.mjs`.

---

## 2. New files

| Path | Purpose |
|---|---|
| [store/ui.store.ts](store/ui.store.ts) | Zustand store for `sidebarCollapsed` (persisted to `localStorage` under `ui-state`). |
| [components/ui/tooltip.tsx](components/ui/tooltip.tsx) | Radix-backed tooltip primitive. Used for collapsed-sidebar labels; reusable elsewhere. |
| [components/layout/PageTransition.tsx](components/layout/PageTransition.tsx) | `AnimatePresence` wrapper keyed on pathname. Crossfade + translate-y route transitions (300ms in, 180ms out). |
| **Context.md** | This file. |

---

## 3. Modified files

### Motion foundation
- [app/globals.css](app/globals.css) — added CSS custom properties for easing curves (`--ease-out`, `--ease-spring`, `--ease-in`, `--ease-in-out`) and duration tokens (`--dur-micro/fast/base/slow`). Added keyframes `skeleton-shimmer`, `input-shake`, `float`, `gradient-shift`. Added `prefers-reduced-motion` override that damps all animations to 0.01ms.
- [tailwind.config.ts](tailwind.config.ts) — extended theme with:
  - `transitionTimingFunction`: `ease-out-expo`, `ease-spring`, `ease-in-sharp`, `ease-in-out-smooth`.
  - `transitionDuration`: `120`, `180`, `250`, `350`, `450`.
  - `keyframes` + `animation`: `shimmer`, `float`, `gradient-shift`.

### Retractable sidebar
- [components/layout/AppSidebar.tsx](components/layout/AppSidebar.tsx) — full rewrite. `motion.aside` animates width 240 ↔ 68 with `ease-out-expo`. When collapsed, each nav item is wrapped in a Radix `Tooltip` that appears on hover. Label text is a `motion.span` inside `AnimatePresence`, fading + translating out when the sidebar collapses. Active route has a shared `layoutId="sidebar-active-pill"` so the indigo pill animates between items on navigation. Exports `SIDEBAR_WIDTH_EXPANDED` (240) and `SIDEBAR_WIDTH_COLLAPSED` (68) for consumers. Footer has a toggle button with a rotating chevron.
- [components/layout/AppHeader.tsx](components/layout/AppHeader.tsx) — added `PanelLeftClose`/`PanelLeftOpen` toggle at the far-left of the header that calls `useUiStore().toggleSidebar()`.
- [app/(app)/layout.tsx](app/(app)/layout.tsx) — reads `sidebarCollapsed` from `useUiStore`, drives `<main>`'s `marginLeft` via inline style so it animates smoothly with `transition-[margin-left] duration-350 ease-out-expo`. Children wrapped in `<PageTransition>`.
- [components/layout/TransferModeBanner.tsx](components/layout/TransferModeBanner.tsx) — banner's `left` offset now follows `sidebarCollapsed` so it doesn't overlap the sidebar.

### Micro-interactions
- [components/ui/button.tsx](components/ui/button.tsx) — added `active:scale-[0.97]`, explicit `transition-[background-color,color,border-color,box-shadow,transform]` with `duration-150 ease-out-expo`, and a `disabled:active:scale-100` guard.
- [components/ui/skeleton.tsx](components/ui/skeleton.tsx) — replaced `animate-pulse` with the new `skeleton-shimmer` utility (gradient sweep with `::after` pseudo-element).
- [components/shared/LoadingSkeleton.tsx](components/shared/LoadingSkeleton.tsx) — removed inline `opacity: 1 - i*0.1` style that was fighting the new shimmer.

### Login / Signup animation
- [app/(auth)/login/page.tsx](app/(auth)/login/page.tsx) and [app/(auth)/signup/page.tsx](app/(auth)/signup/page.tsx)
  - Ambient indigo radial-gradient background using `gradient-shift` keyframe.
  - Logo: spring scale-in (0.85 → 1) with `ease-spring`.
  - Title, subtitle, fields, button: `staggerChildren: 0.06`, `delayChildren: 0.1` on parent `motion.div` with `variants={container}`.
  - Error banner: `AnimatePresence` with height 0 → auto + icon (`AlertCircle`).
  - Submit button: `AnimatePresence mode="wait"` crossfades "Sign In" ↔ `<Loader2>` + "Signing in…".
  - Error shake uses `useAnimation()` controls — imperative, does **not** remount the card (see §5).
  - On catch, `console.error('[login] sign-in failed:', err)` is logged and the banner now shows the HTTP status (e.g. `"Session creation failed (HTTP 401)"`) instead of a generic string, so a failing admin SDK is debuggable without reading server logs.

---

## 4. How motion is applied (quick reference)

Read the full spec at [UX_ANIMATION_UPGRADE.md](UX_ANIMATION_UPGRADE.md). Defaults now available everywhere:

- Easing: `ease-out-expo`, `ease-spring`, `ease-in-sharp`, `ease-in-out-smooth`.
- Durations: `duration-120` (micro), `duration-180` (fast), `duration-250`, `duration-350` (component), `duration-450` (slow).
- Keyframes: `animate-shimmer`, `animate-float`, `animate-gradient-shift` + the CSS-only `.skeleton-shimmer` + `.animate-input-error`.
- Utility class: `.press-scale` for ad-hoc interactive surfaces.
- `prefers-reduced-motion: reduce` is respected globally.

---

## 5. Bug fixed: login card disappearing after submit

**Symptom:** After submitting the login form the animated card vanished; no error, no redirect.

**Root cause:** I was triggering the error-shake by wrapping the card in `<motion.div key={shakeKey}>` and incrementing `shakeKey` on failure. The key change forced React to unmount and remount the subtree. The inner card used `variants={item}` with no explicit `initial`/`animate` props — it inherited from an ancestor's `variants={container} animate="show"`. Once the parent's stagger had finished, a re-mounted child did not re-run the stagger, so it stayed at the `hidden` variant (`opacity: 0, y: 10`). Net effect: the card was rendered but invisible.

**Fix:** replaced the key-driven remount with `useAnimation()` controls. The shake is now imperative — `shakeControls.start({ x: [...], transition: {...} })` — on the same persistent element. Nothing remounts, variant inheritance is preserved, the card stays visible.

Applied in both `app/(auth)/login/page.tsx` and `app/(auth)/signup/page.tsx`.

---

## 6. Environment setup (what was wrong, what was fixed)

The dev server was crashing on `/login` with unstyled HTML before the session started. Three stacked issues:

1. **`.env.local` did not exist** — only `.env.local.example` was present. Firebase client SDK crashed at SSR with `auth/invalid-api-key`. Because Next.js's error page short-circuits CSS delivery, Tailwind's stylesheet returned 404, producing the "raw HTML with serif font" look.
2. **Stale dev server on port 3000** — a Next.js process started before `npm install` ran was holding the port with broken cache and serving 404 for `/_next/static/css/app/layout.css`.
3. **Firebase Admin SDK had no credentials** — `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` were empty, so `adminAuth.verifyIdToken()` in [app/api/auth/session/route.ts](app/api/auth/session/route.ts) returned 401 on every login attempt.

**Resolution steps taken:**

1. Killed stale processes on ports 3000/3001.
2. `cp .env.local.example .env.local` — brought in the public Firebase client config for the `office-asset-system` project (safe to share; public keys identify the project, they do not authenticate).
3. User generated a service account key from Firebase Console → Service accounts → Generate new private key, pasted `client_email` / `private_key` into `.env.local`.
4. Deleted `.next/` cache and restarted `npm run dev` so env vars loaded fresh.
5. Confirmed `POST /api/auth/session 200` in the server log — admin SDK authenticated successfully.

---

## 7. Test data seeded

Ran `node scripts/seed-test-fleet.mjs` against the live Firebase project. The script is idempotent — re-running wipes each org's data and reseeds.

| Org | Subdomain | Users (1 admin + staff) | Assets | Warranties | Requests | Notes | Maintenance | Checkouts | Invites |
|---|---|---|---|---|---|---|---|---|---|
| Acme Corp | `acme` | 1 + 3 | 6 | 4 | 4 | 2 | 2 | 2 | 1 |
| Globex Inc | `globex` | 1 + 2 | 5 | 3 | 2 | 1 | 1 | 1 | 0 |
| Stark Industries | `stark` | 1 + 3 | 7 | 5 | 3 | 3 | 3 | 2 | 2 |

Every org has an active Pro subscription. Warranties deliberately span expired / expiring-within-30-days / far-future so dashboard and reports views show meaningful distributions.

### Credentials

All seeded company accounts use password **`Staff@123`**:

- `admin@acme.test`, `bob@acme.test`, `carol@acme.test`, `dave@acme.test`
- `admin@globex.test`, `hannah@globex.test`, `ian@globex.test`
- `admin@stark.test`, `tony@stark.test`, `rhodey@stark.test`, `happy@stark.test`

Super admin (unchanged from seed): **`superadmin@test.com` / `Admin@123`** — signs in at http://localhost:3000/login and lands on `/super-admin`.

### Sign-in URLs

- Super admin: http://localhost:3000/login
- Per-tenant direct: http://acme.localhost:3000, http://globex.localhost:3000, http://stark.localhost:3000 (Chrome resolves `*.localhost` to 127.0.0.1 automatically on Windows).

---

## 8. How to run locally

```bash
# one-time
cp .env.local.example .env.local
# fill FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY from a service-account JSON

npm install
npm run dev        # http://localhost:3000

# optional: refresh test data
node scripts/seed-test-fleet.mjs
```

`FIREBASE_PRIVATE_KEY` must be in double quotes with `\n` kept as literal characters (not expanded to real newlines). The script in [scripts/seed-test-fleet.mjs:9-18](scripts/seed-test-fleet.mjs#L9-L18) parses this format.

---

## 9. Verification checklist

- [x] `tsc --noEmit` passes.
- [x] `/login` returns HTTP 200, CSS served (~58KB).
- [x] `POST /api/auth/session` returns 200 with seeded admin service-account creds.
- [x] Super admin sign-in redirects to `/super-admin` via `buildRootUrl()`.
- [x] Sidebar collapse/expand animates width and labels; tooltip appears on icon hover when collapsed; state survives reload.
- [x] Route navigations crossfade + translate via `PageTransition`.
- [x] Error flow in login: banner appears with HTTP status, card shakes, card remains visible (the bug fix).

---

## 10. Open follow-ups (nothing actioned today)

- The 30+ npm audit vulnerabilities reported on install — inherited from Firebase/Next toolchain, not touched.
- `NEXT_PUBLIC_FIREBASE_APP_ID` is blank in both `.env.local.example` and `.env.local`. Firebase client init does not require it for Auth/Firestore, but Analytics/Messaging would. No action needed for current features.
- `(app)` layout's `sidebarCollapsed` is rehydrated from `localStorage` after first client render, so there's a brief flash on reload if the user previously collapsed. Acceptable trade-off for Zustand's `persist` middleware; left as-is.
