-- ════════════════════════════════════════════════════════════════════════
-- 0025_notifications.sql
-- Platform-wide in-app and email notification system.
-- Service-layer fanout: notificationQueue.enqueue() called directly from
-- services, never via the event bus (which is stateless in serverless).
-- ════════════════════════════════════════════════════════════════════════

-- ── In-app notification rows ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  space_id         text,
  recipient_id     uuid NOT NULL,           -- user who receives this
  event_type       text NOT NULL,           -- e.g. 'order.created'
  title            text NOT NULL,           -- stored as plain EN text at creation time
  body             text,                    -- optional detail line
  data             jsonb NOT NULL DEFAULT '{}', -- context: { orderId, orderNumber, … }
  link             text,                    -- in-app route to navigate on click
  is_read          boolean NOT NULL DEFAULT false,
  read_at          timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_recipient_unread_idx
  ON notifications(organization_id, recipient_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_recipient_idx
  ON notifications(organization_id, recipient_id, created_at DESC);

-- RLS: users can read/update their own rows
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_own ON notifications;
CREATE POLICY notifications_own ON notifications
  FOR ALL USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

DROP POLICY IF EXISTS notifications_platform_admin ON notifications;
CREATE POLICY notifications_platform_admin ON notifications
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

-- ── Per-user preferences (overrides org defaults) ──────────────────────────
-- Missing row = use org default → catalog default. Only rows where the user
-- has explicitly changed the setting are stored here.
CREATE TABLE IF NOT EXISTS notification_preferences (
  organization_id  uuid NOT NULL,
  user_id          uuid NOT NULL,
  event_type       text NOT NULL,
  in_app           boolean NOT NULL DEFAULT true,
  email            boolean NOT NULL DEFAULT false,
  CONSTRAINT notification_preferences_pk PRIMARY KEY (organization_id, user_id, event_type)
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notif_prefs_own ON notification_preferences;
CREATE POLICY notif_prefs_own ON notification_preferences
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS notif_prefs_mgr ON notification_preferences;
CREATE POLICY notif_prefs_mgr ON notification_preferences
  FOR ALL USING (public.is_org_manager(organization_id))
  WITH CHECK (public.is_org_manager(organization_id));

-- ── Org-wide defaults ─────────────────────────────────────────────────────
-- Admin-controlled: which event types fire, via which channels, to which roles.
-- Missing row = use catalog defaults.
CREATE TABLE IF NOT EXISTS notification_org_defaults (
  organization_id  uuid NOT NULL,
  event_type       text NOT NULL,
  in_app_enabled   boolean NOT NULL DEFAULT true,
  email_enabled    boolean NOT NULL DEFAULT false,
  notify_roles     text[] NOT NULL DEFAULT '{admin}',
  CONSTRAINT notification_org_defaults_pk PRIMARY KEY (organization_id, event_type)
);

ALTER TABLE notification_org_defaults ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notif_org_defaults_mgr ON notification_org_defaults;
CREATE POLICY notif_org_defaults_mgr ON notification_org_defaults
  FOR ALL USING (public.is_org_manager(organization_id))
  WITH CHECK (public.is_org_manager(organization_id));

DROP POLICY IF EXISTS notif_org_defaults_staff_read ON notification_org_defaults;
CREATE POLICY notif_org_defaults_staff_read ON notification_org_defaults
  FOR SELECT USING (public.belongs_to_org(organization_id));
