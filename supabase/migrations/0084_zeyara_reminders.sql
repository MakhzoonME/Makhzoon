-- ════════════════════════════════════════════════════════════════════════
-- 0084_zeyara_reminders.sql
-- Phase 4 of the Zeyara rollout
-- (docs/plans/2026-08-26-zeyara-clinic-vertical-design.md §1.2).
--
-- Appointment reminders. Rides the EXISTING WhatsApp Cloud API integration
-- (lib/notifications/channels/whatsapp.ts) rather than introducing a second
-- transport — the org's own WhatsApp Business number, phone-number-id, and
-- token already live in haraka_service_notification_config.
--
-- ⚠ Meta requires every template to be pre-approved. The two template names
-- below ('appointment_reminder', 'follow_up_due') must be registered and
-- approved in the org's WhatsApp Business account as Utility-category
-- templates before anything sends; until then the send fails and is recorded
-- with status='failed', which is visible but harmless.
-- ════════════════════════════════════════════════════════════════════════

-- ── Reminder log ─────────────────────────────────────────────────────────
-- Exists for IDEMPOTENCY above all: the sweep runs hourly and must never
-- message the same patient twice about the same appointment. The unique index
-- below is what guarantees that, not the query window.
CREATE TABLE IF NOT EXISTS zeyara_appointment_reminders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  appointment_id  uuid NOT NULL REFERENCES haraka_appointments(id) ON DELETE CASCADE,
  -- 'upcoming' = the pre-appointment nudge; 'follow_up' = the visit's
  -- follow_up_due date arriving. Kept as separate kinds so one does not
  -- suppress the other.
  reminder_kind   text NOT NULL CHECK (reminder_kind IN ('upcoming', 'follow_up')),

  channel         text NOT NULL DEFAULT 'whatsapp',
  -- 'sent' | 'failed' | 'skipped'. A row is written for EVERY outcome, so a
  -- permanently failing number is never retried forever.
  status          text NOT NULL CHECK (status IN ('sent', 'failed', 'skipped')),
  error           text,
  recipient       text,

  sent_at         timestamptz NOT NULL DEFAULT now()
);

-- The idempotency guarantee: one attempt per (appointment, kind), ever.
CREATE UNIQUE INDEX IF NOT EXISTS zeyara_appointment_reminders_unique_idx
  ON zeyara_appointment_reminders(appointment_id, reminder_kind);

CREATE INDEX IF NOT EXISTS zeyara_appointment_reminders_org_idx
  ON zeyara_appointment_reminders(organization_id, sent_at DESC);

-- ── Per-org reminder settings ────────────────────────────────────────────
-- Shape: { "enabled": bool, "hoursBefore": int, "followUpEnabled": bool }
-- Absent/null = disabled. Opt-in deliberately: nothing should start messaging
-- an org's patients because a migration ran.
ALTER TABLE organization_configs
  ADD COLUMN IF NOT EXISTS appointment_reminder_config jsonb;

-- ── RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE zeyara_appointment_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS zeyara_reminders_platform_all ON zeyara_appointment_reminders;
CREATE POLICY zeyara_reminders_platform_all ON zeyara_appointment_reminders
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS zeyara_reminders_mgr_all ON zeyara_appointment_reminders;
CREATE POLICY zeyara_reminders_mgr_all ON zeyara_appointment_reminders
  FOR ALL USING (public.is_org_manager(organization_id))
  WITH CHECK (public.is_org_manager(organization_id));

DROP POLICY IF EXISTS zeyara_reminders_staff_read ON zeyara_appointment_reminders;
CREATE POLICY zeyara_reminders_staff_read ON zeyara_appointment_reminders
  FOR SELECT USING (public.belongs_to_org(organization_id));
