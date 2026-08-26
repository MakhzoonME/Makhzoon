# Reports Module — Design

Status: draft, pending review
Date: 2026-08-26

## 1. Summary

Add a generic **Reports** capability so staff (e.g. a doctor) can generate structured, printable/shareable documents tied to a customer encounter (appointment, service job, or order), and have them appear in the customer's history. Built industry-agnostic from the start — templates are org-defined, so the same feature serves a clinic's "Patient Report"/"Hospital Referral" pair, a repair shop's inspection report, etc. — and is superadmin-controlled per org via the existing add-on system.

Not built by extending the existing Banna custom-fields engine (`lib/modules/banna/`), because Banna is one flat schema → one value-set per customer, whereas Reports needs many template *types*, each producing many *instances* over time. Reports reuses Banna's field-definition primitives (field types, conditional-visibility evaluation) rather than its storage model.

## 2. Data model

```sql
CREATE TABLE report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  name text NOT NULL,                    -- e.g. "Patient Report", "Hospital Referral"
  field_schema jsonb NOT NULL,            -- Banna-style field defs + conditional-visibility rules
  schema_version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_by/created_at, updated_by/updated_at
);

CREATE TABLE report_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  template_id uuid NOT NULL REFERENCES report_templates(id),
  customer_id uuid NOT NULL REFERENCES haraka_customers(id),
  encounter_type text NOT NULL CHECK (encounter_type IN ('appointment','service_job','order')),
  encounter_id uuid NOT NULL,             -- polymorphic, matches CustomerHistoryEntry's discriminant pattern
  template_schema_version integer NOT NULL,   -- template's schema_version at creation time
  field_schema_snapshot jsonb NOT NULL,       -- frozen copy of field_schema at creation time
  field_values jsonb NOT NULL DEFAULT '{}',   -- keyed against field_schema_snapshot, not the live template
  attachments jsonb NOT NULL DEFAULT '[]',
  share_token text NOT NULL UNIQUE,       -- long random token, generated once, never rotates
  created_by/created_at, updated_by/updated_at
);

CREATE TABLE report_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES report_instances(id),
  actor_id uuid REFERENCES users(id),     -- null for anonymous share-link views
  action text NOT NULL CHECK (action IN ('created','edited','viewed','printed','shared')),
  diff jsonb,                             -- for 'edited' actions
  created_at timestamptz NOT NULL DEFAULT now()
);
```

Key rules:
- **No delete.** Reports are a retained record; only `reportsView`/`reportsCreate`/`reportsEdit` exist, no `reportsDelete`.
- **Always editable, no version lock, no expiring link.** Edits happen in place on `field_values`; every edit is appended to `report_audit_log` as a diff. `share_token` is generated once and never changes, so the link handed to a patient/hospital keeps working after edits.
- **Template edits never affect existing instances.** `field_schema_snapshot` is a frozen copy taken at creation time and used for all rendering (view, PDF, share page) — a template's `field_schema` can change freely without altering how old reports look.
- **Edit lock tied to schema drift, not time.** The edit action is enabled only when `report_instances.template_schema_version === report_templates.schema_version` (current). If the template has since changed, the edit button is disabled with a tooltip: *"This report's template has been updated since this report was created. Editing is locked to preserve the original record — create a new report to use the current template."* Viewing, printing, and sharing remain unaffected.
- Editing a template bumps `schema_version` and updates `field_schema`; no migration of existing instances is needed since they never read the live schema.

## 3. Access control

**Tier 1 — superadmin enables the module per org**, via the existing add-on system:
- Add `'reports'` to the `AddOnKey` union (`types/subscription.types.ts`) and `reportsIncluded` to `types/package.types.ts`.
- `components/super-admin/PackageForm.tsx` gets a "Reports" toggle for package-level inclusion.
- Per-org override via the existing subscription page (`app/[locale]/superadmin/organizations/[orgId]/subscription/page.tsx`), adding/removing `'reports'` from `activeAddOns` independent of the org's package.
- No changes needed to `lib/platform/entitlements.ts` — `isAddOnActive` works once the key exists.
- Enforcement: every reports API route calls `requireAddOn(tenant, 'reports')` (`lib/permissions/require-module.ts`), same `403 ADDON_NOT_ACTIVE` pattern as `vehicleIntake`. Client-side, `hooks/org/useActiveAddOns.ts` gates whether the Reports nav item and settings page render.

**Tier 2 — role-based access within an org that has the add-on:**
- New `UserPermissions` module `'reports'` with operations:
  - `reportsView`, `reportsCreate`, `reportsEdit` — for report instances (list, generate, edit).
  - `reportsManageTemplates` — separate permission for the template builder, so a role can fill out reports without being able to change what templates look like.

## 4. Pages

1. **`app/[locale]/[orgSlug]/[space]/haraka/reports/page.tsx`** — list of all report instances for the org/space, filterable by template type, patient, date range, created-by. Includes a "Generate report" entry point: pick a template, then search/select the customer + encounter to attach it to (for cases not starting from inside an appointment).
2. **`app/[locale]/[orgSlug]/settings/reports/page.tsx`** — template builder, gated by `reportsManageTemplates`: create/edit templates, add/reorder/remove fields, set conditional visibility, reusing Banna's field-editor components.
3. **Appointment shortcut** — a "Generate report" action inside the appointment detail view, pre-filled with `encounter_type: 'appointment'` and the customer already resolved, skipping the picker step.
4. **Customer history integration** — a new `report` entry kind added to `CustomerHistoryEntry` (`lib/modules/haraka/customers/customers.service.ts`), appearing in the existing activity timeline alongside `transaction`/`order`/`service_job`, linking to the report detail page.

## 5. Rendering, PDF, and sharing

- Report detail/print view follows the `WarrantyCertificatePreview.tsx` pattern (closest existing non-financial printable-record component) — clinic header/logo/footer branding, reused from the receipt/warranty letterhead approach.
- Public, no-login share page at `app/r/[orgSlug]/reports/[share_token]`, matching the existing `app/r/[orgSlug]/preview` pattern. Renders `field_schema_snapshot` + `field_values`; every view is logged to `report_audit_log` as a `'viewed'` action.
- Print action reuses `PrintButton.tsx`; every print is logged as a `'printed'` action.

## 6. Open items for a follow-up pass (not blocking this design)

- Attachment storage mechanism (which existing file-upload path to reuse).
- Whether `report_audit_log` becomes its own table or a new entry type feeding into the existing `lib/audit/logger.ts` infra.
- Multi-language rendering of templates (org locale vs. patient-facing locale on the share page).
