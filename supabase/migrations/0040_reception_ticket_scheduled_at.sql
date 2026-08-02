-- ════════════════════════════════════════════════════════════════════════
-- 0040_reception_ticket_scheduled_at.sql
-- Reception tickets: scheduled date/time chosen at intake (synced onto the
-- linked service job's scheduled_at when one exists).
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE haraka_reception_tickets
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;
