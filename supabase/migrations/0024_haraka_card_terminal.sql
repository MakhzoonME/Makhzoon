-- ════════════════════════════════════════════════════════════════════════
-- 0024_haraka_card_terminal.sql
-- Card / Visa terminal integration for the Haraka POS register.
-- Supports four modes: display-only, local bridge, cloud API, webhook.
-- ════════════════════════════════════════════════════════════════════════

-- ── Config (one row per org) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS haraka_card_terminal_config (
  organization_id   uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  enabled           boolean NOT NULL DEFAULT false,
  mode              text    NOT NULL DEFAULT 'display'
                      CHECK (mode IN ('display','local_bridge','cloud','webhook')),
  bridge_url        text,           -- e.g. http://localhost:7433
  provider          text,           -- 'sumup' | 'square' | 'paymob' | 'custom'
  api_key_enc       text,           -- server-side encrypted; NEVER returned to client
  terminal_id       text,           -- physical terminal device ID
  webhook_secret    text,           -- HMAC-SHA256 secret for verifying inbound webhooks
  currency          text    NOT NULL DEFAULT 'JOD',
  timeout_seconds   int     NOT NULL DEFAULT 60,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  updated_by        uuid
);

CREATE OR REPLACE TRIGGER haraka_card_terminal_config_set_updated_at
  BEFORE UPDATE ON haraka_card_terminal_config
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── In-flight / completed charges ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS haraka_card_charges (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  reference         text NOT NULL,     -- POS offlineId or a generated UUID
  amount            numeric(14,4) NOT NULL,
  currency          text NOT NULL DEFAULT 'JOD',
  status            text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','approved','declined','timeout','cancelled')),
  provider_ref      text,              -- terminal's own transaction reference
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT haraka_card_charges_org_ref_unique UNIQUE (organization_id, reference)
);

CREATE INDEX IF NOT EXISTS haraka_card_charges_org_ref_idx
  ON haraka_card_charges(organization_id, reference);
CREATE INDEX IF NOT EXISTS haraka_card_charges_org_created_idx
  ON haraka_card_charges(organization_id, created_at DESC);

CREATE OR REPLACE TRIGGER haraka_card_charges_set_updated_at
  BEFORE UPDATE ON haraka_card_charges
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
