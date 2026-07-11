-- Delivery-token lifecycle (T1.5, docs/AUDIT_ACTION_PLAN_2026-07-05.md)
--
-- Delivery share links were permanent capability tokens: once generated they
-- could never expire or be revoked, leaving indefinite public access to order
-- details (customer name/phone/address). Adds an expiry window and a
-- revocation marker; the public /api/delivery/[token] routes reject
-- expired/revoked tokens with 410 Gone.

alter table haraka_orders
  add column if not exists delivery_token_expires_at timestamptz,
  add column if not exists delivery_token_revoked_at timestamptz;

-- Backfill existing tokens with a 14-day window from now so already-shared
-- links keep working for a grace period instead of breaking immediately.
update haraka_orders
   set delivery_token_expires_at = now() + interval '14 days'
 where delivery_token is not null
   and delivery_token_expires_at is null;
