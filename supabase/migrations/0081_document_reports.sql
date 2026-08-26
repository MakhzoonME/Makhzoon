-- ════════════════════════════════════════════════════════════════════════
-- 0081_document_reports.sql
-- Generic "Document Reports" module: org-defined templates (structured
-- fields, reusing the Banna custom-field/condition shape) filled out per
-- customer encounter (appointment / service job / order), rendered to a
-- printable page and a persistent no-login share link. Gated by the
-- 'documentReports' add-on (see types/subscription.types.ts).
-- Design: docs/plans/2026-08-26-reports-module-design.md
-- ════════════════════════════════════════════════════════════════════════

-- ── Package allowance / add-on billing column ──────────────────────────
-- Same pattern as vehicle_intake_included (0061): the billing enforcement
-- layer checked server-side via requireAddOn(tenant, 'documentReports').
ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS document_reports_included boolean NOT NULL DEFAULT false;

-- ── Attachments storage bucket ──────────────────────────────────────────
-- Private (signed-URL) bucket, same pattern as 0014_storage_buckets.sql —
-- report attachments (lab results, images) may hold sensitive data.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('report-attachments', 'report-attachments', false, 10485760, array['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ── Templates ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_report_templates (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              text NOT NULL,
  field_schema      jsonb NOT NULL DEFAULT '[]',   -- array of Banna-style field defs + conditions
  schema_version    int NOT NULL DEFAULT 1,        -- bumped on every field_schema change
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  updated_by        uuid
);

CREATE INDEX IF NOT EXISTS document_report_templates_org_idx
  ON document_report_templates(organization_id);

CREATE OR REPLACE TRIGGER document_report_templates_set_updated_at
  BEFORE UPDATE ON document_report_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Instances (filled reports) ─────────────────────────────────────────
-- No delete op is exposed anywhere — these are a retained record. Always
-- editable in place; edits are appended to document_report_audit_log
-- rather than versioned, and share_token never rotates so a link handed
-- to a patient/hospital keeps working after edits.
CREATE TABLE IF NOT EXISTS document_report_instances (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id           uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id               uuid NOT NULL REFERENCES document_report_templates(id),
  customer_id               uuid NOT NULL REFERENCES pos_customers(id) ON DELETE CASCADE,
  encounter_type            text NOT NULL CHECK (encounter_type IN ('appointment', 'service_job', 'order')),
  encounter_id              uuid NOT NULL,         -- polymorphic; no FK, matches CustomerHistoryEntry's discriminant pattern
  template_schema_version   int NOT NULL,          -- template's schema_version at creation time
  field_schema_snapshot     jsonb NOT NULL,        -- frozen copy of field_schema at creation time; all rendering uses this, never the live template
  field_values              jsonb NOT NULL DEFAULT '{}',
  attachments               jsonb NOT NULL DEFAULT '[]',
  share_token               text NOT NULL,
  created_at                timestamptz NOT NULL DEFAULT now(),
  created_by                uuid,
  updated_at                timestamptz NOT NULL DEFAULT now(),
  updated_by                uuid,
  CONSTRAINT document_report_instances_share_token_key UNIQUE (share_token)
);

CREATE INDEX IF NOT EXISTS document_report_instances_org_idx
  ON document_report_instances(organization_id);
CREATE INDEX IF NOT EXISTS document_report_instances_customer_idx
  ON document_report_instances(customer_id);
CREATE INDEX IF NOT EXISTS document_report_instances_encounter_idx
  ON document_report_instances(encounter_type, encounter_id);
CREATE INDEX IF NOT EXISTS document_report_instances_template_idx
  ON document_report_instances(template_id);

CREATE OR REPLACE TRIGGER document_report_instances_set_updated_at
  BEFORE UPDATE ON document_report_instances
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Audit log ───────────────────────────────────────────────────────────
-- Every edit/view/print/share is recorded here rather than as a new
-- instance version, per the "always editable, log changes" decision.
CREATE TABLE IF NOT EXISTS document_report_audit_log (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id         uuid NOT NULL REFERENCES document_report_instances(id) ON DELETE CASCADE,
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_id          uuid,          -- null for anonymous share-link views
  action            text NOT NULL CHECK (action IN ('created', 'edited', 'viewed', 'printed', 'shared')),
  diff              jsonb,         -- for 'edited' actions
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS document_report_audit_log_report_idx
  ON document_report_audit_log(report_id, created_at DESC);
CREATE INDEX IF NOT EXISTS document_report_audit_log_org_idx
  ON document_report_audit_log(organization_id);

-- ── RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE document_report_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS document_report_templates_platform_all ON document_report_templates;
CREATE POLICY document_report_templates_platform_all ON document_report_templates
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS document_report_templates_mgr_all ON document_report_templates;
CREATE POLICY document_report_templates_mgr_all ON document_report_templates
  FOR ALL USING (public.is_org_manager(organization_id))
  WITH CHECK (public.is_org_manager(organization_id));

DROP POLICY IF EXISTS document_report_templates_staff_read ON document_report_templates;
CREATE POLICY document_report_templates_staff_read ON document_report_templates
  FOR SELECT USING (public.belongs_to_org(organization_id));

ALTER TABLE document_report_instances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS document_report_instances_platform_all ON document_report_instances;
CREATE POLICY document_report_instances_platform_all ON document_report_instances
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS document_report_instances_mgr_all ON document_report_instances;
CREATE POLICY document_report_instances_mgr_all ON document_report_instances
  FOR ALL USING (public.is_org_manager(organization_id))
  WITH CHECK (public.is_org_manager(organization_id));

DROP POLICY IF EXISTS document_report_instances_staff_read ON document_report_instances;
CREATE POLICY document_report_instances_staff_read ON document_report_instances
  FOR SELECT USING (public.belongs_to_org(organization_id));

DROP POLICY IF EXISTS document_report_instances_staff_write ON document_report_instances;
CREATE POLICY document_report_instances_staff_write ON document_report_instances
  FOR INSERT WITH CHECK (public.belongs_to_org(organization_id));

DROP POLICY IF EXISTS document_report_instances_staff_update ON document_report_instances;
CREATE POLICY document_report_instances_staff_update ON document_report_instances
  FOR UPDATE USING (public.belongs_to_org(organization_id))
  WITH CHECK (public.belongs_to_org(organization_id));

-- No delete policy for any non-platform role — reports are a retained record.

ALTER TABLE document_report_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS document_report_audit_log_platform_all ON document_report_audit_log;
CREATE POLICY document_report_audit_log_platform_all ON document_report_audit_log
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS document_report_audit_log_mgr_read ON document_report_audit_log;
CREATE POLICY document_report_audit_log_mgr_read ON document_report_audit_log
  FOR SELECT USING (public.is_org_manager(organization_id));

-- Inserts to the audit log happen via the service-role client only (server
-- actions/API routes), including anonymous 'viewed' events from the public
-- share page — no org-member insert policy needed.
