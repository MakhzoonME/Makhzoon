-- ════════════════════════════════════════════════════════════════════════
-- 0082_zeyara_visits.sql
-- Phase 2 of the Zeyara rollout
-- (docs/plans/2026-08-26-zeyara-clinic-vertical-design.md §5).
--
-- The clinical record. This is the one part of Zeyara that is genuinely NEW
-- rather than reused from Haraka: an appointment is a scheduling + billing
-- object whose lifecycle ends at 'completed', while a visit is a clinical
-- object that gets amended afterwards and carries its own authorship trail.
--
-- Everything else the clinic needs (bookings, catalog, providers, patients,
-- invoicing) is the shared Haraka engine reached through the Zeyara vertical.
-- ════════════════════════════════════════════════════════════════════════

-- ── Visit number sequence ────────────────────────────────────────────────
-- One row per (org, space). Produces VST-000001.
CREATE TABLE IF NOT EXISTS zeyara_visit_counters (
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  space_id          text NOT NULL DEFAULT '',
  last_visit_number integer NOT NULL DEFAULT 0,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT zeyara_visit_counters_pk PRIMARY KEY (organization_id, space_id)
);

-- ── Visits ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zeyara_visits (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  space_id          text,

  visit_number      text NOT NULL,   -- VST-000001

  -- RESTRICT, deliberately: an appointment carrying a clinical record must not
  -- be deletable. The appointments service already refuses to delete an
  -- invoiced appointment; this extends the same protection to clinical data.
  appointment_id    uuid NOT NULL REFERENCES haraka_appointments(id) ON DELETE RESTRICT,

  -- Snapshotted alongside the FK so a visit stays attributable even if the
  -- patient record is later detached (pos_customers uses ON DELETE SET NULL
  -- from appointments, and walk-ins never had a customer row at all).
  customer_id       uuid REFERENCES pos_customers(id) ON DELETE SET NULL,
  patient_name      text NOT NULL,
  provider_id       uuid REFERENCES haraka_staff(id) ON DELETE SET NULL,
  provider_name     text,

  visit_date        timestamptz NOT NULL DEFAULT now(),

  -- The clinical body. All optional: a visit may be opened at check-in with
  -- nothing but a chief complaint and completed over the course of the visit.
  chief_complaint   text,
  findings          text,
  diagnosis         text,
  treatment_plan    text,

  -- Drives the follow-ups queue and the Phase 4 reminder sweep.
  follow_up_due     date,

  created_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid,
  created_by_name   text,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  updated_by        uuid,
  updated_by_name   text
);

-- One clinical record per appointment. A second visit for the same patient is
-- a second appointment — that is what keeps billing and clinical history
-- aligned.
CREATE UNIQUE INDEX IF NOT EXISTS zeyara_visits_appointment_idx
  ON zeyara_visits(appointment_id);

CREATE INDEX IF NOT EXISTS zeyara_visits_org_idx
  ON zeyara_visits(organization_id);
CREATE INDEX IF NOT EXISTS zeyara_visits_org_date_idx
  ON zeyara_visits(organization_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS zeyara_visits_customer_idx
  ON zeyara_visits(customer_id)
  WHERE customer_id IS NOT NULL;
-- Drives the follow-ups queue: "who is due back, soonest first".
CREATE INDEX IF NOT EXISTS zeyara_visits_follow_up_idx
  ON zeyara_visits(organization_id, follow_up_due)
  WHERE follow_up_due IS NOT NULL;

CREATE OR REPLACE TRIGGER zeyara_visits_set_updated_at
  BEFORE UPDATE ON zeyara_visits
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Visit notes (append-only) ────────────────────────────────────────────
-- Clinical notes are amended by ADDITION, never edited in place — the same
-- reason haraka_appointment_payments is a ledger. There is deliberately no
-- updated_at and no update path in the service layer.
CREATE TABLE IF NOT EXISTS zeyara_visit_notes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id        uuid NOT NULL REFERENCES zeyara_visits(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  body            text NOT NULL,
  author_id       uuid,
  author_name     text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS zeyara_visit_notes_visit_idx
  ON zeyara_visit_notes(visit_id, created_at DESC);

-- ── Visit attachments ────────────────────────────────────────────────────
-- Files live in the private 'zeyara-visit-files' bucket; only bucket+path are
-- stored, and reads are re-signed on demand (same contract as
-- warranty-documents — see lib/storage/upload.ts).
CREATE TABLE IF NOT EXISTS zeyara_visit_attachments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id        uuid NOT NULL REFERENCES zeyara_visits(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  bucket          text NOT NULL,
  storage_path    text NOT NULL,
  file_name       text NOT NULL,
  mime_type       text,
  size_bytes      bigint,
  uploaded_by     uuid,
  uploaded_by_name text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS zeyara_visit_attachments_visit_idx
  ON zeyara_visit_attachments(visit_id, created_at DESC);

-- ── Private bucket for clinical files ────────────────────────────────────
-- Private: clinical attachments must never be served from an open URL.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'zeyara-visit-files',
  'zeyara-visit-files',
  false,
  20971520, -- 20 MB; scans and imaging run larger than a receipt photo
  ARRAY['image/jpeg','image/png','image/webp','image/heic','application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ── RLS ──────────────────────────────────────────────────────────────────
-- Same shape as haraka_appointments. Note the open question in design doc §9.1:
-- per-provider record isolation (a provider seeing only their own patients'
-- records) is NOT implemented here — every org member can read, matching how
-- appointments already behave. Revisit before selling into a multi-practitioner
-- clinic with a confidentiality requirement.

-- Counters — service-role only, no public policies (mirrors the appointment
-- and service-job counters).
ALTER TABLE zeyara_visit_counters ENABLE ROW LEVEL SECURITY;

ALTER TABLE zeyara_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS zeyara_visits_platform_all ON zeyara_visits;
CREATE POLICY zeyara_visits_platform_all ON zeyara_visits
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS zeyara_visits_mgr_all ON zeyara_visits;
CREATE POLICY zeyara_visits_mgr_all ON zeyara_visits
  FOR ALL USING (public.is_org_manager(organization_id))
  WITH CHECK (public.is_org_manager(organization_id));

DROP POLICY IF EXISTS zeyara_visits_staff_read ON zeyara_visits;
CREATE POLICY zeyara_visits_staff_read ON zeyara_visits
  FOR SELECT USING (public.belongs_to_org(organization_id));

ALTER TABLE zeyara_visit_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS zeyara_visit_notes_platform_all ON zeyara_visit_notes;
CREATE POLICY zeyara_visit_notes_platform_all ON zeyara_visit_notes
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS zeyara_visit_notes_mgr_all ON zeyara_visit_notes;
CREATE POLICY zeyara_visit_notes_mgr_all ON zeyara_visit_notes
  FOR ALL USING (public.is_org_manager(organization_id))
  WITH CHECK (public.is_org_manager(organization_id));

DROP POLICY IF EXISTS zeyara_visit_notes_staff_read ON zeyara_visit_notes;
CREATE POLICY zeyara_visit_notes_staff_read ON zeyara_visit_notes
  FOR SELECT USING (public.belongs_to_org(organization_id));

ALTER TABLE zeyara_visit_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS zeyara_visit_attachments_platform_all ON zeyara_visit_attachments;
CREATE POLICY zeyara_visit_attachments_platform_all ON zeyara_visit_attachments
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS zeyara_visit_attachments_mgr_all ON zeyara_visit_attachments;
CREATE POLICY zeyara_visit_attachments_mgr_all ON zeyara_visit_attachments
  FOR ALL USING (public.is_org_manager(organization_id))
  WITH CHECK (public.is_org_manager(organization_id));

DROP POLICY IF EXISTS zeyara_visit_attachments_staff_read ON zeyara_visit_attachments;
CREATE POLICY zeyara_visit_attachments_staff_read ON zeyara_visit_attachments
  FOR SELECT USING (public.belongs_to_org(organization_id));
