# Requests

**Status: REMOVED.** The Requests module described below no longer exists in the app.

---

## What happened

Commit `e740554` — "feat: remove Requests module and Reorder Quantity field" — deleted the Requests feature entirely: pages, `/api/requests` routes, service layer, db layer, hooks, types, and both UI entry points (the "Request Refill" modal on Raseed, the retire/buy-new request panel on Usool assets). It also stripped Requests from the dashboard, reports page, nav (sidebar/bottom nav/mobile drawer/command palette), notifications catalog, feature flags (`FeatureKey`), the permission catalog (`RequestPermissions` and its module definition were removed from `types/user-permissions.types.ts`), limits/usage counting, and the superadmin Package/Subscription editors. Requests was also dropped as a Banna custom-field record type.

Confirmed by direct inspection of the current codebase:
- No route under `app/[locale]/[orgSlug]/[space]/requests`.
- No route under `app/api/requests`.
- No `requests` key in `types/user-permissions.types.ts` (`MODULE_PERMISSIONS_CONFIG`).
- `lib/validations/request.schema.ts` still exists (dead code — unused by any route).

## What's left behind (intentionally, per the removal commit)

- The `public.requests` DB table (`supabase/migrations/0004_modules.sql`) was **not** dropped — it's unused but still present.
- The `reorder_quantity` column on inventory items was also left in place, unused.
- `lib/modules/spaces/services/move.service.ts` and `duplicate.service.ts` still reference the `requests` table when moving/duplicating a space's data (leftover cleanup code, not a live feature).
- `lib/modules/inventory/services/inventory.service.ts` still has a guard that blocks deleting an inventory item if it has "open requests" — dead code path since nothing can create a request anymore.
- The `AuditLog` action enum (`lib/audit/logger.ts`) still lists `REQUEST_SUBMITTED` / `REQUEST_APPROVED` / `REQUEST_REJECTED`, but nothing writes them anymore.

## For historical reference

The module used to provide a staff-submits / admin-approves workflow (types: `REFILL`, `RETIRE`, `BUY_NEW`, `EXTEND_WARRANTY`) at `/{locale}/{orgSlug}/{space}/requests`. If this functionality needs to be resurrected, treat it as a new feature build rather than restoring old code — the frontend, API routes, and permission wiring were all deleted, and the schema/permission model has moved on since (e.g. warranties are now permissioned under `usool.*`, not a standalone module).
