-- ════════════════════════════════════════════════════════════════════════
-- 0022_haraka_cash_drawer.sql
-- Cash drawer configuration for the Haraka POS register.
-- The drawer is connected to the receipt printer's RJ11 port and kicked
-- via ESC p m t1 t2 over the existing WebUSB connection.
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS haraka_cash_drawer_config (
  organization_id   uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  enabled           boolean NOT NULL DEFAULT false,
  auto_open_on_cash boolean NOT NULL DEFAULT true,
  require_pin       boolean NOT NULL DEFAULT false,
  pin               text,             -- 4–6 digit PIN; plaintext (RLS-protected, admin-only)
  drawer_port       smallint NOT NULL DEFAULT 0 CHECK (drawer_port IN (0, 1)),
  on_time_ms        smallint NOT NULL DEFAULT 100,
  off_time_ms       smallint NOT NULL DEFAULT 100,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  updated_by        uuid
);

CREATE OR REPLACE TRIGGER haraka_cash_drawer_config_set_updated_at
  BEFORE UPDATE ON haraka_cash_drawer_config
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
