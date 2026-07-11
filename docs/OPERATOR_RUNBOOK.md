# Operator Runbook — post-audit follow-ups (2026-07-10)

Steps only a human with Supabase credentials can run. Three procedures:
1. Apply the two Phase 1 migrations (0036, 0037)
2. Split staging off the production Supabase project (T1.2 / finding S2)
3. Generate + commit Supabase types (T2.2)

Environment refs (from `wrangler.toml`):

| Env | Branch | Supabase project ref |
|-----|--------|----------------------|
| dev | `DevBranch` | `ltujtoabnewoypittoku` |
| staging | `STGBranch` | `ncjzozvzjtyycdlwohtr` ⚠ shared with prod |
| production | `main` | `ncjzozvzjtyycdlwohtr` |

Prereq for all: `npx supabase --version` (bundled, no global install needed) and
`npx supabase login` once (opens a browser for an access token).

---

## 1. Apply migrations 0036 + 0037

**What they do:** `0036` creates the `rate_limits` table + `increment_rate_limit()`
RPC (durable rate limiting). `0037` adds `delivery_token_expires_at` +
`delivery_token_revoked_at` to `haraka_orders` and backfills a 14-day window.

**⚠ Ordering matters.** The deployed code already SELECTs the 0037 columns in the
public `/api/delivery/[token]` routes. If the code is live but 0037 is not applied
to that env's DB, those routes return 500. So **apply 0037 to an env's DB before (or
together with) deploying code to that env.** The rate limiter (0036) fails open to a
per-isolate fallback if `rate_limits` is missing, so 0036 is not deploy-blocking, but
apply it too.

```bash
# DEV first (its own project)
npx supabase link --project-ref ltujtoabnewoypittoku
npx supabase db push            # applies every migration not yet in the project
npx supabase migration list     # 0036 + 0037 should now show as applied on remote

# STAGING + PROD (currently the SAME project — one push hits both until step 2)
npx supabase link --project-ref ncjzozvzjtyycdlwohtr
npx supabase db push
```

`db push` is idempotent (skips already-applied migrations). To preview without
executing: `npx supabase db push --dry-run`.

**Verify:** in the Supabase dashboard SQL editor for each project:
```sql
select to_regclass('public.rate_limits') is not null           as has_0036,
       (select count(*) from information_schema.columns
         where table_name = 'haraka_orders'
           and column_name = 'delivery_token_expires_at') = 1   as has_0037;
```
Both should be `true`.

---

## 2. Split staging off the production Supabase project (T1.2 / S2)

Full runbook lives in `docs/ENVIRONMENTS.md` ("Split runbook"). Summary:

1. **Dashboard (manual):** create a new Supabase project `makhzoon-staging`
   (same region as prod). Note its **ref**, **anon key**, **service-role key**.
   Match prod's Auth settings; enable `pg_cron` if prod has it.
2. **Migrate schema to it:**
   ```bash
   npx supabase link --project-ref <NEW_STAGING_REF>
   npx supabase db push
   ```
3. **Point staging at it** — edit `wrangler.toml` `[env.staging.vars]`:
   `NEXT_PUBLIC_SUPABASE_URL` → `https://<NEW_STAGING_REF>.supabase.co`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` → the new anon key.
4. **Rotate staging secrets** (so nothing points at prod):
   ```bash
   wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env staging
   # then re-set: RESEND_API_KEY, CRON_SECRET, FAWTARA_SECRET_ENC_KEY,
   #              GOOGLE_DRIVE_PRIVATE_KEY  (all --env staging)
   ```
5. **Seed** minimal test data via the real signup flow on stg.makhzoon.me
   (no PII); or a scrubbed `supabase db dump --data-only` from prod.
6. **Deploy + verify:** push `STGBranch`; decode the anon-key JWT and confirm its
   `ref` claim is the new project (not `ncjzozvzjtyycdlwohtr`).
7. **Rotate the production service-role key** afterward — it spent time configured
   in a lower-trust env.

---

## 3. Generate + commit Supabase types (T2.2)

Replaces the `SupabaseClient<any,any,any>` alias in `lib/supabase/admin.ts` with a
real schema, so every admin-client query is type-checked.

```bash
# Option A — from the hosted project (needs `supabase login`):
npx supabase gen types typescript --project-id ltujtoabnewoypittoku > lib/db/supabase-types.ts

# Option B — from a local stack (needs Docker):
npx supabase start && npm run supabase:types
```

Then wire it in:
- In `lib/supabase/admin.ts` and `lib/supabase/server.ts`, import
  `Database` from `@/lib/db/supabase-types` and change the client generic from
  `SupabaseClient<any, any, any>` (the `AnyClient` alias) to `SupabaseClient<Database>`.
- `npx tsc --noEmit` — expect a wave of newly-surfaced type errors; fix them
  (the 77-test suite guards against regressions while you do).

**Verify:** `npm run verify` is green and the `AnyClient` alias/comment are gone
from `admin.ts`.

---

## Product/business decisions needed before those features are built

These are additive and buildable in-repo, but two need a product call first:

- **T3.3 Freemium tier** — define the free-plan matrix: which of the 12 feature
  keys (`assets`, `inventory`, `pos`, `warranties`, `requests`, `reports`,
  `auditLogs`, `banna`, `maintenance`, `checkouts`, `assetNotes`, `support`) a new
  self-signup org gets for free, and any usage caps (e.g. max assets, max spaces).
  Once decided: seed a `free` package, auto-assign on signup, add upgrade CTAs.
- **T4.1 Billing** — pick the model before build: merchant-of-record
  (Paddle / Lemon Squeezy — simplest for MENA, handles tax) vs a regional PSP with
  recurring (HyperPay / Paymob). Decides the whole subscription lifecycle
  (trial → active → past_due → expired), invoicing, and dunning. Output first is a
  `docs/BILLING_DESIGN.md` for review — no code until approved.
- **T3.1 Banna Phase 1** (workspace profile + self-service module activation) and
  **T3.4 POS camera barcode scanner** need NO product decision — buildable now.
