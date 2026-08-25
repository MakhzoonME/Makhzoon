# Environments

> Rewritten 2026-07-09 for the current **Supabase + Cloudflare Workers** stack.
> The previous version of this file described the retired Firebase/Amplify
> setup and is preserved in git history only.

## Current topology

| Branch      | Env        | URL               | Cloudflare Worker | Supabase project ref |
|-------------|------------|-------------------|-------------------|----------------------|
| `main`      | production | app.makhzoon.me   | `makhzoon`        | `ebupajukvyhparjkhlhr` |
| `STGBranch` | staging    | stg.makhzoon.me   | `makhzoonstg`     | `ncjzozvzjtyycdlwohtr` |
| `DevBranch` | dev        | dev.makhzoon.me   | `makhzoondev`     | `ltujtoabnewoypittoku` |
| `Support`   | support    | sup.makhzoon.me   | `makhzoonsupport` | `kanquzwaxlbanbwmguyd` |

> Refs above were re-checked 2026-08-26 against `wrangler.toml` and
> `deploy.yml`. The earlier table listed prod as `ncjzozvzjtyycdlwohtr`, which
> is in fact **staging's** ref — see the staging note below.

Deploys run via GitHub Actions on push to each branch
(github.com/MakhzoonME/Makhzoon/actions). Public env vars live in
`wrangler.toml` per `[env.*.vars]`; secrets are set with
`wrangler secret put <NAME> --env <env>` and never committed.

## The `support` environment

Added 2026-08-24, wired up 2026-08-26. Branch `Support` → `sup.makhzoon.me`,
worker `makhzoonsupport`, Supabase project `kanquzwaxlbanbwmguyd`.

**The host is `sup`, not `support`.** `sup.makhzoon.me` is the record that
exists in the Cloudflare zone; `support.makhzoon.me` does not resolve. A
`routes` entry in `wrangler.toml` only binds to a hostname already present in
the zone, so if the subdomain is ever renamed, these must change together:
`wrangler.toml` `[env.support]` (routes + vars), `workers/cron/wrangler.toml`
`[env.support.vars]`, `deploy.yml` (map-env `app_url`), `middleware.ts`
`APP_HOSTS`, `lib/csrf.ts` `ALLOWED_ORIGINS`, and `RECEIPT_SUBDOMAINS` in
`lib/app-env.ts`.

### Still outstanding

**1. `rcpt-sup.makhzoon.me` DNS.** The receipt host does **not** resolve yet.
`getReceiptBaseUrl()` derives `rcpt-<sub>` from the live hostname, so on
`sup.makhzoon.me` it returns `https://rcpt-sup.makhzoon.me` — receipt links
will 404 until a proxied record is added to the zone. `wrangler.toml` already
claims the route.

**2. GitHub Actions secrets** — the `_SUPPORT`-suffixed copies (Settings →
Secrets and variables → Actions). The deploy step **skips missing secrets with
a warning rather than failing**, so an omission surfaces as a runtime error
later, not a red build:

```
RESEND_API_KEY_SUPPORT              CRON_SECRET_SUPPORT
SUPABASE_SERVICE_ROLE_KEY_SUPPORT   FAWTARA_SECRET_ENC_KEY_SUPPORT
GOOGLE_DRIVE_CLIENT_EMAIL_SUPPORT   GOOGLE_DRIVE_PRIVATE_KEY_SUPPORT
GOOGLE_DRIVE_FOLDER_ID_SUPPORT
```

`CRON_SECRET_SUPPORT` is set on **both** the app worker and the cron worker —
they must match or every scheduled job 401s.
`SUPABASE_SERVICE_ROLE_KEY_SUPPORT` is the service_role key of
`kanquzwaxlbanbwmguyd` (`supabase projects api-keys --project-ref
kanquzwaxlbanbwmguyd`).

> **GitHub is not the only path, and for some of these it is not the path in
> use.** The 2026-08-26 deploy log shows `CRON_SECRET_*` and
> `GOOGLE_DRIVE_*` are empty for **every** environment, not just support —
> so those were set directly on the workers with
> `wrangler secret put <NAME> --env <env>` and never lived in GitHub.
> Only `RESEND_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are actually
> populated as Actions secrets (dev/prod). Adding the `_SUPPORT` copies to
> GitHub works, but to match how the other envs are configured, set the
> cron and Drive values on the worker directly.

**3. Resend sender** — `[env.support.vars]` sends as
`support-notifications@makhzoon.me`. Verify that address in Resend, or point
`RESEND_FROM_EMAIL` at an already-verified sender.

**4. Google Drive folder** — `[env.support.vars]` currently reuses the
**production** service account and folder ID, so support uploads land in the
live production Drive folder. Give it its own folder before real use.

### First deploy — verified 2026-08-26

Commit `825a44f`, workflow run 32904987475, worker version
`1ed116f0-af61-4f1b-9134-2030d42896fa`. Confirmed:

- `sup.makhzoon.me` returns HTTP 200 and redirects `/` → `/en`.
- Both triggers bound: `sup.makhzoon.me/*`, `rcpt-sup.makhzoon.me/*`.
- The served bundle references `kanquzwaxlbanbwmguyd.supabase.co` and no
  other Supabase host — it is **not** talking to prod.
- The `SUPPORT` env badge renders.
- `rcpt-sup.makhzoon.me` fails to connect (no DNS), as expected.

Note that Cloudflare accepted the `rcpt-sup` route even though the hostname
does not resolve, so a bound trigger is not evidence the host works.

### Database — cloned from prod 2026-08-26

Support is seeded as a **clone of the production database** (decision
2026-08-26) rather than a bare `supabase db push` of the migration history —
the environment exists to reproduce real customer issues. That means it holds
production customer data: treat its service_role key and dashboard access with
the same care as prod.

**Verified parity after the clone** (prod → `kanquzwaxlbanbwmguyd`):

| Object | prod | support |
|--------|------|---------|
| public tables | 85 | 85 |
| rows (all public tables) | 596 | 596 |
| constraints | 252 | 252 |
| indexes | 269 | 269 |
| RLS policies | 185 | 185 |
| functions | 58 | 58 |
| tables with RLS enabled | 86 | 86 |
| triggers | 46 | 46 |
| auth.users / public.users / auth.identities | 12 / 10 / 12 | 12 / 10 / 12 |

`/rest/v1` and `/auth/v1/settings` both return 200 on the support project.

**Two deliberate deviations:**

1. `pg_trgm` lives in prod's `public` schema, so dropping `public` on the
   target destroys it and every `gin_trgm_ops` index fails. The extension must
   be created **before** restoring. Any future re-clone must do the same.
2. Default privileges `FOR ROLE supabase_admin` could not be copied —
   `postgres` is not permitted to set another role's defaults on Supabase.
   Only the `FOR ROLE postgres` defaults exist on support. This affects
   privileges on objects a superuser might create in `public` later, not
   anything the app does.

Ordering matters: `public.users.users_id_fkey` references `auth.users`, so the
constraint cannot validate until auth data is loaded. Restore `public`, then
auth, then add that FK — or the constraint silently goes missing while the
row counts still look correct.

### ⚠ Prod schema is not reproducible from git

Discovered during the clone. Prod contains objects that **no migration in the
repo creates**:

- Tables `spaces`, `space_members`, `cleanup_orgs_to_keep`
- `space_id` columns on 16 tables
- Migrations `0075_appointments_optional_staff`,
  `0076_appointments_discount`, `0077_custom_field_conditions` — applied to
  prod, with SQL stored only in `supabase_migrations.schema_migrations`

The repo tops out at `0074` (72 files) and `combined.sql` has no `spaces`
table, yet migrations from `0016` onward reference `space_id`. Prod carries
1025 columns in `public` against 989 for a database built from the repo.

A rebuild from migrations therefore does **not** reproduce prod. The missing
DDL should be reconstructed into migration files from prod's stored statements
and live schema; until then, cloning prod is the only reliable way to stand up
an environment that matches it.

## ⚠ OPEN ISSUE — staging shares the production database (audit finding S2)

`[env.staging.vars]` in `wrangler.toml` points at the **production** Supabase
project. Anything done on stg.makhzoon.me reads and writes production data,
and a staging compromise is a production compromise.

### Split runbook (operator + Claude Code)

**Operator steps (cannot be automated — requires Supabase dashboard access):**

1. Create a new Supabase project (suggested name `makhzoon-staging`, same
   region as prod). Note its project ref, anon key, and service-role key.
2. Enable the same Auth settings as prod (email/password, magic link,
   SMTP sender if custom).
3. If pg_cron is enabled on prod, enable it on the new project too
   (used by migrations 0003 and 0036 for TTL cleanup).

**Then, from the repo (Claude Code can do these once given the ref/keys):**

4. Link and push all migrations:
   ```bash
   supabase link --project-ref <NEW_STAGING_REF>
   supabase db push
   ```
5. Update `wrangler.toml` `[env.staging.vars]`:
   - `NEXT_PUBLIC_SUPABASE_URL` → `https://<NEW_STAGING_REF>.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → new anon key
6. Rotate the staging secrets:
   ```bash
   wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env staging
   # re-set the others so nothing still points at prod:
   # RESEND_API_KEY, CRON_SECRET, FAWTARA_SECRET_ENC_KEY, GOOGLE_DRIVE_PRIVATE_KEY
   ```
7. Seed minimal test data (create a test org via signup on staging, or a
   scrubbed export/import — see "Seeding" below).
8. Push to `STGBranch` → verify stg.makhzoon.me connects to the new ref
   (decode the anon key JWT: its `ref` claim must be the new project).
9. **Rotate the production service-role key** in the Supabase dashboard
   afterwards — the old one spent time configured in a lower-trust env.

### Seeding staging

Preferred: create fresh test orgs through the real signup flow (exercises the
whole stack, zero PII). If prod-shaped data is needed, use
`supabase db dump --data-only` from prod into staging **only after** writing a
scrub pass for PII columns (users.email/display_name, pos customers
name/phone/email, contact/early-access tables). Do not import unscrubbed prod
data into staging.

## Local development

1. Copy `.env.local.example` → `.env.local`, fill in the dev project values.
2. `npm install && npm run dev` (http://localhost:3000).
3. `LOCAL_AUTH_BYPASS_USER_ID` (gitignored `.env.local` only) short-circuits
   auth in `next dev` — never set it in a deployed env; cloud envs run
   `NODE_ENV=production` so it is inert there (`lib/supabase/auth-helpers.ts`).

## Migrations

```bash
npm run supabase:migrate     # supabase db push against the linked project
npm run supabase:types       # regenerate lib/db/supabase-types.ts
```

Run against dev first, then staging, then prod. Migration 0036 (rate limits)
and 0003 (revoked sessions) self-schedule pg_cron cleanup jobs when the
extension exists; otherwise call `purge_expired_sessions()` /
`purge_expired_rate_limits()` from the cron worker.

## Deploys

```bash
npm run cf:deploy:dev | cf:deploy:staging | cf:deploy:prod | cf:deploy:support
npm run cf:deploy:cron:dev | :staging | :prod | :support      # cron worker
```

Pushing the mapped branch triggers the same via GitHub Actions.

## Required environment variables

**Public (committed in `wrangler.toml` per env):** `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`,
`NEXT_PUBLIC_RECEIPT_URL`, `NEXT_PUBLIC_APP_ENV`, `RESEND_FROM_EMAIL`,
`GOOGLE_DRIVE_CLIENT_EMAIL`, `GOOGLE_DRIVE_FOLDER_ID`.

**Secrets (`wrangler secret put`, per env):** `SUPABASE_SERVICE_ROLE_KEY`,
`RESEND_API_KEY`, `CRON_SECRET`, `FAWTARA_SECRET_ENC_KEY`,
`GOOGLE_DRIVE_PRIVATE_KEY`, optional `CLOUDFLARE_TURNSTILE_SECRET_KEY`.
