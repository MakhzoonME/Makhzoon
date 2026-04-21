# Office Asset System

Multi-tenant SaaS for office asset and warranty tracking. Built on **Next.js 14 (App Router)**, **TypeScript**, **Firebase (Auth + Firestore)**, **Tailwind**, **shadcn/ui**, **Zustand**, **TanStack Query**, and **React Hook Form + Zod**.

## Roles

- **super_admin** — owns the platform; creates organizations, manages subscriptions, views audit logs across tenants.
- **admin** — per-organization admin; manages users, assets, warranties, approves/rejects staff requests.
- **staff** — consumes assets in their org; can file add/update/retire requests that admins must approve.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Fill in `.env.local`

The repo has `.env.local` with client keys already populated. Three values still need to be filled manually:

| Variable | Where to get it |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase Console → Project settings → General → **Your apps** → Web app → **App ID** |
| `FIREBASE_CLIENT_EMAIL` | Firebase Console → Project settings → **Service accounts** → Generate new private key → `client_email` in JSON |
| `FIREBASE_PRIVATE_KEY` | Same JSON → `private_key` (paste the whole `-----BEGIN...END-----` block, wrapped in double quotes, keeping `\n` as literal escapes) |

Example of `FIREBASE_PRIVATE_KEY` formatting:
```
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n"
```
The admin SDK normalizes `\n` back to real newlines — see [lib/firebase/admin.ts:18](lib/firebase/admin.ts#L18).

### 3. Deploy Firestore rules and indexes

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

Rules live in [firestore.rules](firestore.rules); compound indexes in [firestore.indexes.json](firestore.indexes.json).

### 4. Seed the first super admin

Create a user in Firebase Auth, then from the Admin SDK (or a one-off script) set the custom claim:

```ts
await admin.auth().setCustomUserClaims(uid, { role: 'super_admin' });
```

All other roles (admin, staff) are provisioned via the app UI once you're signed in as super_admin.

### 5. Run the dev server

```bash
npm run dev
```

Open http://localhost:3000.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Run production build |
| `npm run lint` | ESLint |

## Project layout

```
app/
  (auth)/login            — sign-in
  (app)/                  — admin + staff app (dashboard, assets, warranties, requests, users, subscription)
  (super-admin)/          — super admin (organizations, audit logs)
  api/                    — server routes (validate claims, call Admin SDK)
components/
  ui/                     — shadcn primitives
  shared/                 — DataTable, FilterBar, PageHeader, StatusBadge, ConfirmDialog, etc.
  assets/, warranties/, users/, layout/
lib/
  firebase/               — client + admin SDK init
  firestore/              — typed data access (assets, warranties, users, orgs, requests, audit logs)
  middleware/             — withAuth, withRole
  audit/, export/, utils/, validations/
hooks/                    — useAuth, useAssets, useWarranties, useRequests, useUsers, useOrganization, useTransferMode, useAuditLogs
store/                    — Zustand: auth.store, transfer.store
types/                    — domain types
```

## Multi-tenancy model

Every tenant doc carries `organizationId`. Custom claims (`role`, `organizationId`) are set on the Firebase ID token by the super_admin flow and enforced by both:
- Firestore rules ([firestore.rules](firestore.rules))
- Next.js API route guards ([lib/middleware/withAuth.ts](lib/middleware/withAuth.ts), [lib/middleware/withRole.ts](lib/middleware/withRole.ts))

Super admins may "transfer mode" into an org to act on its behalf; the transfer banner ([components/layout/TransferModeBanner.tsx](components/layout/TransferModeBanner.tsx)) makes that state visible, and the store lives at [store/transfer.store.ts](store/transfer.store.ts).

## Audit trail

Every mutating API route writes to `auditLogs` via [lib/audit/logger.ts](lib/audit/logger.ts). Super admin sees all logs; org admins see their own via [app/(super-admin)/super-admin/audit-logs/page.tsx](app/(super-admin)/super-admin/audit-logs/page.tsx).

## CSV export

Assets and warranties support CSV export through [lib/export/csv.ts](lib/export/csv.ts), wired to endpoints at [app/api/assets/export/route.ts](app/api/assets/export/route.ts) and [app/api/warranties/export/route.ts](app/api/warranties/export/route.ts).
