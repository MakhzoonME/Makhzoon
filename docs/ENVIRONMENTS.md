# Environments

Makhzoon runs across **four** Firebase projects today. Three are the new
prod/staging/dev triplet; the fourth (`office-asset-system`) is the
currently-deployed legacy project that production traffic hits while we
prepare the new prod environment.

| Branch    | Env         | Firebase project alias | Firebase project ID       | Status                |
|-----------|-------------|------------------------|---------------------------|-----------------------|
| `main`    | legacy      | `legacy`               | `office-asset-system`     | Currently deployed    |
| `prod`    | production  | `prod`                 | `makhzoon-prod`           | Being set up fresh    |
| `staging` | staging     | `staging`              | `makhzoon-staging`        | Available             |
| `dev`     | development | `dev`                  | `makhzoon-dev`            | Available             |

Aliases are configured in [`.firebaserc`](../.firebaserc).

## Local development

1. Copy `.env.example` to `.env.local` and fill in your dev project values
   (the `NEXT_PUBLIC_FIREBASE_*` set comes from Firebase Console → Project
   Settings → Web app config).
2. `npm install`
3. `npm run dev`

The bottom-right corner of the app shows an `EnvBadge` (green = development,
amber = staging, hidden in production) so super admins can never confuse
environments at a glance.

## Switching the Firebase CLI

```bash
npm run fb:use:dev      # or :staging / :prod / :legacy
```

## Deploying Firestore rules + indexes

The `firestore.rules` and `firestore.indexes.json` at the repo root are
deployed against whatever project the Firebase CLI is currently pointing at.
Convenience scripts:

```bash
npm run fb:deploy:rules:dev
npm run fb:deploy:rules:staging
npm run fb:deploy:rules:prod   # do this last, with care
```

## Cloning prod data to staging/dev (with PII scrubbing)

The clone script copies Firestore data from one project to another while
replacing PII fields (emails, phones, names, IPs, payment refs) with safe
placeholders. Subcollections are followed recursively. By default the script
discovers top-level collections at runtime — use `--collections=foo,bar` to
limit scope.

> **Always dry-run first.** Never run with prod as the target. The script
> refuses to run if source and target service accounts share a `project_id`,
> but you should still verify by eye.

### Set service account paths

These files should live OUTSIDE the repo (e.g. `~/.firebase-keys/`) and never
be committed. The repo's `.gitignore` excludes the standard filenames.

```powershell
$env:PROD_SERVICE_ACCOUNT_PATH   = "$HOME\.firebase-keys\makhzoon-prod.json"
$env:TARGET_SERVICE_ACCOUNT_PATH = "$HOME\.firebase-keys\makhzoon-staging.json"
```

```bash
export PROD_SERVICE_ACCOUNT_PATH=$HOME/.firebase-keys/makhzoon-prod.json
export TARGET_SERVICE_ACCOUNT_PATH=$HOME/.firebase-keys/makhzoon-staging.json
```

### Run

```bash
# 1. Dry run — print counts, write nothing
npm run clone:dry:staging

# 2. Limit to a few collections (still dry)
npx ts-node scripts/clone-firestore.ts --target=staging --collections=organizations,users --dry-run

# 3. Real run — interactive confirmation prompt
npm run clone:staging
```

You can append `--yes` to skip the confirmation prompt (use only in CI):

```bash
npx ts-node scripts/clone-firestore.ts --target=staging --yes
```

### What gets scrubbed

The current scrub list is in `scripts/clone-firestore.ts` under
`SCRUB_FIELDS_BY_COLLECTION`. As of writing it covers:

- `users` — email, phone, displayName
- `organizations` — contactEmail
- `contactSales` — email, phone, name, organizationName, notes, ip
- `earlyAccess` — email, ip
- `paymentLogs` — reference, notes
- `auditLogs` — `oldValue` and `newValue` are dropped entirely (may contain
  arbitrary PII inside their map shapes)

Add new collections / fields in that constant as the schema evolves.

## Full backup snapshots (no scrubbing)

For disaster-recovery snapshots use the gcloud Firestore export. Note: this
does **not** scrub PII, so an exported prod snapshot is still production data.

```bash
# 1. Set the env
export FIREBASE_PROJECT_ID_PROD=makhzoon-prod
export EXPORT_BUCKET=gs://makhzoon-backups

# 2. Snapshot prod
npm run fs:export:prod
# → "Export complete: gs://makhzoon-backups/full-export-20260509-..."

# 3. Optional: import the snapshot into a lower env (overwrites matching docs)
export FIREBASE_PROJECT_ID_STAGING=makhzoon-staging
npm run fs:import:staging gs://makhzoon-backups/full-export-20260509-...
```

For automated nightly backups, set up Cloud Scheduler + Cloud Function in the
Firebase Console (out of scope for this repo).

## CI / hosting environment variables

These must be set per-branch in your hosting platform (AWS Amplify or Vercel).
None of the server-side variables are committed to the repo.

### Public (browser) — same set per environment, different values

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_APP_ENV` — set to `production`, `staging`, or `development`

### Server-only — required for Admin SDK

Either:

- `FIREBASE_SERVICE_ACCOUNT_BASE64` — base64 of the full service account JSON
  (preferred, avoids newline escaping issues)

OR (fallback):

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

Plus:

- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- `CRON_SECRET`

### Branch → environment mapping (Vercel)

- `prod` branch → Production scope
- `staging` branch → Preview scope (env = staging)
- `dev` branch → Preview scope (env = development)

### Branch → environment mapping (AWS Amplify, current)

- `main` branch → connected to `office-asset-system` (legacy production)
- Future: separate Amplify apps for prod/staging/dev branches once the
  `makhzoon-*` Firebase projects are populated.

## Safety rails baked into the tooling

- `clone-firestore.ts` refuses to run if source and target service accounts
  share a `project_id`.
- `--target` is required and must be `staging` or `dev`. `prod` is never a
  valid target.
- Real runs prompt for `yes` before writing (override with `--yes` for CI).
- `import-to-env.sh` prompts before running.
- Service account JSON paths come from env vars, never command-line args, so
  they don't end up in shell history.

## Migration runbook — populating new environments from legacy

Use this once to set up `makhzoon-prod`, `makhzoon-staging`, and `makhzoon-dev`
from the existing `office-asset-system` data. Two-part process: Firestore docs
+ Firebase Auth users (passwords/UIDs are in a separate system from Firestore).

### Prerequisites

- `firebase login` complete on your machine.
- The signed-in Google account has Owner role on all four Firebase projects.
- Service account JSON keys downloaded for legacy, prod, staging, and dev,
  saved outside the repo (e.g. `~/.firebase-keys/<project>.json`).
- Source project's password hash parameters known. Find them in:
  Firebase Console → Authentication → Settings → Password hash parameters
  (only visible to project Owners). You'll need: `hash-algo`, `hash-key`,
  `salt-separator`, `rounds`, `mem-cost`. Without these, passwords don't
  migrate and users have to reset.

### Step 1 — Migrate legacy to new prod (one-time)

```powershell
$env:PROD_SERVICE_ACCOUNT_PATH   = "$HOME\.firebase-keys\office-asset-system.json"
$env:TARGET_SERVICE_ACCOUNT_PATH = "$HOME\.firebase-keys\makhzoon-prod.json"

# 1a. Dry-run the Firestore clone — verify counts before writing
npm run clone:dry:prod

# 1b. Real Firestore clone (no scrubbing — both are production-class)
npm run clone:prod

# 1c. Auth users (passwords + UIDs preserved)
npm run clone:auth:legacy-to-prod
```

After step 1c the export JSON is on disk with password hashes. Delete it:

```powershell
Remove-Item auth-export-legacy-*.json
```

### Step 2 — Seed staging from prod (PII-scrubbed)

```powershell
$env:PROD_SERVICE_ACCOUNT_PATH   = "$HOME\.firebase-keys\makhzoon-prod.json"
$env:TARGET_SERVICE_ACCOUNT_PATH = "$HOME\.firebase-keys\makhzoon-staging.json"

npm run clone:dry:staging
npm run clone:staging
npm run clone:auth:prod-to-staging
```

### Step 3 — Seed dev from prod (PII-scrubbed)

```powershell
$env:TARGET_SERVICE_ACCOUNT_PATH = "$HOME\.firebase-keys\makhzoon-dev.json"

npm run clone:dry:dev
npm run clone:dev
npm run clone:auth:prod-to-dev
```

### Step 4 — Verify

For each environment:

1. Hit the Amplify URL for that branch
2. Confirm the `EnvBadge` shows the right env (or no badge for prod)
3. Log in with a real prod account
4. Spot-check that some test data appears

If login fails on staging/dev, the most common cause is wrong hash parameters
during `auth:import` — re-run `clone:auth:*` with corrected values.

### Step 5 — Flip Amplify production from legacy → new prod (later)

When you're confident `makhzoon-prod` is fully populated and the new prod
deployment is healthy, update the Amplify env vars on the `main` branch:

- `NEXT_PUBLIC_FIREBASE_*` → values from `makhzoon-prod` web app config
- `FIREBASE_SERVICE_ACCOUNT_BASE64` → re-encoded service account JSON for
  `makhzoon-prod`
- `NEXT_PUBLIC_APP_ENV=production`

Trigger a redeploy. Cutover happens at the moment Amplify finishes the build.

## Phase 2 — Real-time replication via Cloud Functions

> **Status: planned, not implemented.** Sketch and tradeoffs documented here
> so the team can make an informed decision before building.

### What this would do

A Firebase Cloud Function on `makhzoon-prod` watching every Firestore write
(`{path=**}/{docId}` trigger). On each write, the function applies the same
scrub rules as `clone-firestore.ts` and mirrors the doc to both
`makhzoon-staging` and `makhzoon-dev`. Deletes propagate.

```text
makhzoon-prod (write)
       │
       ▼
[ Cloud Function: replicate-to-lower-envs ]
       │
       ├─► makhzoon-staging (scrubbed)
       └─► makhzoon-dev     (scrubbed)
```

### Costs and tradeoffs

| Concern | Detail |
|---|---|
| **Billing** | Firebase Functions require the Blaze plan. Each prod write triggers one invocation × 2 target writes = 3× write cost. |
| **Loop risk** | Lower envs must NOT have replication triggers, otherwise an infinite loop. Marker fields (`_replicatedFrom`) help but aren't bulletproof. |
| **Schema drift** | If staging or dev adds fields prod doesn't have, they get blown away on the next prod write to that doc. Lower envs become read-only mirrors. |
| **Migration safety** | A schema migration on prod is replicated instantly to staging/dev — defeating staging's role as a "test it before prod" environment. |
| **Failure modes** | If staging is down, prod writes still succeed but replication is lost. Need retry/queue (Pub/Sub or Tasks) to avoid silent drift. |
| **Compliance** | Continuous PII flow into lower-trust envs needs review against your DPA/PDPL obligations. Scrubbing helps but the data is still in transit. |

### Alternative: scheduled clone (recommended unless you have a specific reason)

A nightly GitHub Action or Cloud Scheduler job that runs `clone-firestore.ts`
gives you 99% of the benefit (test data looks like prod) with none of the
real-time coupling. Lower envs are at most 24h stale — almost always fine for
QA.

```yaml
# .github/workflows/nightly-clone.yml — sketch
on:
  schedule:
    - cron: '0 3 * * *'  # 3am UTC nightly
jobs:
  clone:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: |
          echo "$PROD_SA" > /tmp/prod.json
          echo "$STAGING_SA" > /tmp/staging.json
        env:
          PROD_SA: ${{ secrets.PROD_SA_JSON }}
          STAGING_SA: ${{ secrets.STAGING_SA_JSON }}
      - run: npm run clone:staging -- --yes
        env:
          PROD_SERVICE_ACCOUNT_PATH: /tmp/prod.json
          TARGET_SERVICE_ACCOUNT_PATH: /tmp/staging.json
```

### If you still want Cloud Functions

Implementation roughly:

```
functions/
├── package.json          # firebase-functions, firebase-admin
├── src/
│   └── index.ts          # onDocumentWritten('{path=**}/{docId}', ...)
└── tsconfig.json
```

Pre-deploy checklist:
- Project on Blaze plan
- Service account JSONs for staging + dev stored as Firebase Function secrets
  (`firebase functions:secrets:set STAGING_SA_JSON`)
- Cross-project IAM: source project's Function service account needs
  `roles/datastore.user` on staging + dev projects
- Decide region (single region per function, prefer same region as prod
  Firestore for latency)
- Loop guard: lower envs must not have any replicating triggers

**This is multi-day infrastructure work, not a same-session task.** When
ready, request it as a separate piece of work.

## Known follow-ups

- Migrate from `office-asset-system` (legacy) to `makhzoon-prod` for production
  traffic — see migration runbook above.
- Set up a nightly automated export of `makhzoon-prod` (or `office-asset-system`
  while it's still production) to a backup bucket.
- Add a CI job that runs `clone-firestore.ts --dry-run` against staging on every
  push to `main` to catch schema drift between prod and staging.
