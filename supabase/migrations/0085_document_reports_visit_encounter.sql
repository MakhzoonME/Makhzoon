-- ════════════════════════════════════════════════════════════════════════
-- 0085_document_reports_visit_encounter.sql
-- Adds 'visit' to the Document Reports encounter set, so a Zeyara clinic can
-- anchor a patient report or hospital referral on the CLINICAL record rather
-- than on the scheduling row.
--
-- Why not just reuse 'appointment': an appointment is a scheduling + billing
-- object that ends at 'completed'; the visit is the clinical object that is
-- amended afterwards and carries its own authorship trail (0082). A report
-- written from a consultation belongs to the latter, and anchoring it there
-- keeps "which reports came out of this visit" answerable with one index hit.
--
-- Purely additive: the three existing encounter types are untouched, so every
-- report already stored keeps validating.
-- Design: docs/plans/2026-08-26-reports-module-design.md §2
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE public.document_report_instances
  DROP CONSTRAINT IF EXISTS document_report_instances_encounter_type_check;

ALTER TABLE public.document_report_instances
  ADD CONSTRAINT document_report_instances_encounter_type_check
  CHECK (encounter_type IN ('appointment', 'service_job', 'order', 'visit'));
