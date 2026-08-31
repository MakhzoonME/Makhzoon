-- ════════════════════════════════════════════════════════════════════════
-- 0089_report_language.sql
-- Bilingual report templates. A template picks a language_mode once
-- ('en' | 'ar' | 'both'); 'both' requires every field to carry both an
-- English and an Arabic name, and each generated report instance then picks
-- (and can later change) which language it renders in.
--
-- Existing templates default to 'both' — harmless, since their fields
-- already have an English label and an empty Arabic one; the editor will
-- prompt for the missing Arabic names next time someone edits the template.
-- Existing report instances default to 'en', matching what they've always
-- rendered as (the public page only ever showed field.label until now).
-- Idempotent — safe to replay.
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE document_report_templates
  ADD COLUMN IF NOT EXISTS language_mode text NOT NULL DEFAULT 'both'
    CHECK (language_mode IN ('en', 'ar', 'both'));

ALTER TABLE document_report_instances
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en'
    CHECK (language IN ('en', 'ar'));

COMMENT ON COLUMN document_report_templates.language_mode IS
  'Which language(s) field names are authored in. ''both'' requires label + labelAr on every field.';
COMMENT ON COLUMN document_report_instances.language IS
  'Which language this specific report renders in — chosen at generation time when the template is ''both'', changeable later.';
