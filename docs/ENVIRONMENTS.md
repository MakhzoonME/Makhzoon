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

## Known follow-ups

- Migrate from `office-asset-system` (legacy) to `makhzoon-prod` for production
  traffic — coordinate with Amplify deployment changes.
- Set up a nightly automated export of `makhzoon-prod` (or `office-asset-system`
  while it's still production) to a backup bucket.
- Add a CI job that runs `clone-firestore.ts --dry-run` against staging on every
  push to `main` to catch schema drift between prod and staging.
