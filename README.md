# Makhzoon

Multi-tenant SaaS platform for asset management, inventory, and point-of-sale. Built on **Next.js 16 (App Router)**, **TypeScript**, **Supabase (Postgres + Auth + RLS)**, **Tailwind CSS**, **shadcn/ui**, **Zustand**, and **TanStack Query v5**.

---

## Roles

| Role | Scope |
|------|-------|
| `super_admin` | Platform-wide: manages organizations, subscriptions, audit logs, backend logs, sync, leads |
| `admin` | Per-organization: manages users, spaces, modules, permissions, billing |
| `staff` | Per-space: consumes modules based on per-module permissions granted by admin |

---

## Architecture

### Multi-tenancy model

URL structure: `/{locale}/{orgSlug}/{spaceSlug}/{module}`

- **Organizations** — top-level tenants. Each org has its own data, users, and spaces.
- **Spaces** — sub-units within an org (e.g. a branch, a department). All module data is scoped to a space.
- **RLS** — every Supabase table is protected by Row-Level Security policies enforcing org/space isolation.
- **Permissions** — per-user, per-module, per-space permissions stored in `user_permissions`. Evaluated server-side via `lib/permissions/`.

### Auth

Supabase Auth (email/password + magic link). Server-side session management via `@supabase/ssr`. Session cache lives in `lib/supabase/session-cache.ts`; revocation in `lib/supabase/session-revocation.ts`.

Custom claims carry `role` and `organization_id`; enforced by both RLS and API route guards in `lib/middleware/`.

### Localization

Two locales: `en` (default) and `ar`. All strings in `locales/messages.ts`. Locale is detected from cookie (`makhzoon-locale`), defaulting to `en`. RTL layout is handled at the root layout level.

### Middleware

`middleware.ts` routes traffic based on hostname:
- `makhzoon.me` / `www.makhzoon.me` → marketing site
- `app.makhzoon.me` / `dev.makhzoon.me` / `stg.makhzoon.me` → app

---

## Modules (per-space)

| Module | Path | Description |
|--------|------|-------------|
| **Dashboard** | `/dashboard` | Space-level overview |
| **Usool** (Assets) | `/usool` | Fixed asset tracking, checkout, notes, audits, import |
| **Raseed** (Inventory) | `/raseed` | Inventory items, purchases, stock audits, reconcile |
| **Haraka** (POS) | `/haraka` | Point-of-sale register, sessions, customers, transactions, reports |
| **Warranties** | `/warranties` | Warranty tracking |
| **Requests** | `/requests` | Staff requests (add/update/retire assets) |
| **Reports** | `/reports` | Cross-module reporting |
| **Audit Logs** | `/audit-logs` | Space/org-scoped mutation trail |

---

## Project layout

```
app/
  [locale]/
    (auth)/               — login, signup, invites
    (marketing)/          — marketing pages
    [orgSlug]/
      [space]/            — per-space module pages
        dashboard/
        usool/            — assets: list, new, [assetId], audits, import
        raseed/           — inventory: list, new, [itemId], purchases, audits
        haraka/           — POS: register, sessions, customers, transactions, reports
        warranties/
        requests/
        reports/
        audit-logs/
      settings/           — org settings
      users/              — org user management
      subscription/
      support/
      profile/
    superadmin/           — platform admin: orgs, leads, team, config, audit-logs, backend-logs, sync

components/
  ui/                     — shadcn primitives
  shared/                 — DataTable, FilterBar, PageHeader, StatusBadge, ConfirmDialog, BulkActionsBar, etc.
  haraka/                 — POS-specific components (Cart, ProductGrid, PaymentDialog, etc.)
  inventory/              — InventoryItemForm, RequestInventoryModal, stock-audits, purchases
  layout/                 — Sidebar, TopBar, SpaceSwitcher, TransferModeBanner, BreadcrumbNav
  spaces/                 — Spaces panel, Members panel
  features/               — audit, subscription

lib/
  supabase/               — client, server, admin, auth helpers, session cache/revocation
  db/                     — typed Supabase data-access layer
  permissions/            — require.ts, index.ts (server-side permission evaluation)
  modules/                — per-module metadata (assets, inventory, haraka, warranties, requests, etc.)
  middleware/             — withAuth, withRole, CSRF
  nav/                    — navigation config
  audit/                  — audit logger
  services/               — business logic services
  export/                 — CSV export helpers
  platform/               — platform-level utilities
  compliance/             — compliance checks

hooks/
  assets, haraka, inventory, spaces, requests, users, warranties, org, lists, superadmin, support, ui

store/
  auth.store.ts           — current user + org
  active-space.store.ts   — active space context
  transfer.store.ts       — super_admin transfer mode
  pos-cart.store.ts       — POS cart state
  printer.store.ts        — receipt printer settings
  locale.store.ts         — active locale
  theme.store.ts          — light/dark preference
  ui.store.ts             — misc UI state

types/                    — domain types for every entity

workers/
  cron/                   — scheduled background workers

supabase/
  migrations/             — SQL migration files
  combined.sql            — full schema snapshot
```

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Fill in `.env.local`

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-only) |

### 3. Apply migrations

```bash
supabase db push
# or apply supabase/combined.sql directly on a fresh project
```

### 4. Run dev server

```bash
npm run dev
```

Open `http://localhost:3000`.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Run production build |
| `npm run lint` | ESLint |

---

## Key patterns

- **Bulk actions** — floating `BulkActionsBar` per module; bulk delete and bulk move/duplicate controlled by per-module bulk permissions.
- **Spaces** — each org can have multiple spaces; data is always scoped to `space_id`. Space switcher in sidebar. Super admin can move/duplicate records across spaces.
- **Audit trail** — every mutating action writes to `audit_logs` via `lib/audit/`. Scope can be toggled between space and org view.
- **Transfer mode** — super admin can act on behalf of an org; banner in `components/layout/TransferModeBanner.tsx`.
- **Managed lists** — configurable dropdown data (categories, locations, etc.) per org.
- **Invites** — token-based org invitations at `/[locale]/invites`.
