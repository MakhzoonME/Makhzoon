// The clinical record for one appointment, shown inline on the appointment
// detail page — but only under the Zeyara vertical. A Haraka org has no
// clinical layer at all, and the page renders nothing for it.
//
// Notes are append-only by design (see the visits service): the composer adds,
// it never edits. Corrections are new notes, so what was believed at the time
// stays on the record.
import { useState } from 'react';
import Link from 'next/link';
import {
  Stethoscope, Plus, Paperclip, Trash2, FileText, CalendarClock, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/shared';
import { useVertical } from '@/components/vertical/VerticalProvider';
import { CustomFieldValuesSection } from '@/components/banna/CustomFieldValuesSection';
import {
  useVisitForAppointment,
  useCreateVisit,
  useUpdateVisit,
  useVisitNotes,
  useAddVisitNote,
  useVisitAttachments,
  useUploadVisitAttachment,
  useDeleteVisitAttachment,
} from '@/hooks/zeyara';
import { ReportGenerateDrawer } from '@/components/document-reports/ReportGenerateDrawer';
import { useReportInstances } from '@/hooks/document-reports/useReportInstances';
import { useAuthStore } from '@/store/auth.store';
import { hasPermByKey, hasPermission } from '@/lib/permissions';
import { toast, useT } from '@/hooks/ui';
import { formatDateTime } from '@/lib/utils/date';
import type { ZeyaraVisit } from '@/types';

function bytes(n: number | null): string {
  if (n == null) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** One free-text clinical field, saved on blur so a provider never loses work
 *  to a forgotten Save button mid-consultation. */
function ClinicalField({
  label,
  value,
  onSave,
  readOnly,
  rows = 3,
}: {
  label: string;
  value: string | null;
  onSave: (v: string) => void;
  readOnly: boolean;
  rows?: number;
}) {
  const [draft, setDraft] = useState(value ?? '');
  const dirty = draft !== (value ?? '');

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</label>
      <Textarea
        rows={rows}
        value={draft}
        disabled={readOnly}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { if (dirty) onSave(draft); }}
        className="text-sm"
      />
    </div>
  );
}

export function ClinicalRecordPanel({
  appointmentId,
  patientName,
}: {
  appointmentId: string;
  patientName: string;
}) {
  const { vertical, colorVar } = useVertical();
  const { t } = useT();
  const { user } = useAuthStore();

  const { data: visit, isLoading } = useVisitForAppointment(appointmentId);
  const createMut = useCreateVisit();
  const updateMut = useUpdateVisit();

  // Clinical data is Zeyara-only — never render this under Haraka.
  if (vertical !== 'zeyara') return null;

  const canView = !!user && hasPermission(user, 'zeyara', 'visitsView');
  if (!canView) return null;

  const canCreate = !!user && hasPermission(user, 'zeyara', 'visitsCreate');
  const canUpdate = !!user && hasPermission(user, 'zeyara', 'visitsUpdate');

  async function openRecord() {
    try {
      await createMut.mutateAsync({ appointmentId });
      toast.success(t('zeyara.recordOpened'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.saveFailed'));
    }
  }

  function save(patch: Record<string, string | null>) {
    if (!visit) return;
    updateMut.mutate(
      { id: visit.id, body: patch },
      {
        onSuccess: () => toast.success(t('common.saved')),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : t('common.saveFailed')),
      },
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2">
          <Stethoscope className="h-4 w-4" strokeWidth={1.75} style={{ color: colorVar }} />
          <h2 className="text-sm font-semibold text-gray-900">{t('zeyara.clinicalRecord')}</h2>
          {visit && (
            <span className="font-mono text-xs text-gray-400">{visit.visitNumber}</span>
          )}
        </div>
        {!visit && !isLoading && canCreate && (
          <Button size="sm" onClick={openRecord} disabled={createMut.isPending} style={{ background: colorVar }}>
            {createMut.isPending
              ? <Loader2 className="h-4 w-4 me-1 animate-spin" />
              : <Plus className="h-4 w-4 me-1" />}
            {t('zeyara.openRecord')}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="p-5">
          <div className="h-5 w-5 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
        </div>
      ) : !visit ? (
        <p className="p-5 text-sm text-gray-500">
          {canCreate ? t('zeyara.noRecordYet') : t('zeyara.noRecordReadOnly')}
        </p>
      ) : (
        <div className="p-5 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <ClinicalField
              label={t('zeyara.chiefComplaint')}
              value={visit.chiefComplaint}
              readOnly={!canUpdate}
              onSave={(v) => save({ chiefComplaint: v || null })}
            />
            <ClinicalField
              label={t('zeyara.findings')}
              value={visit.findings}
              readOnly={!canUpdate}
              onSave={(v) => save({ findings: v || null })}
            />
            <ClinicalField
              label={t('zeyara.diagnosis')}
              value={visit.diagnosis}
              readOnly={!canUpdate}
              onSave={(v) => save({ diagnosis: v || null })}
            />
            <ClinicalField
              label={t('zeyara.treatmentPlan')}
              value={visit.treatmentPlan}
              readOnly={!canUpdate}
              onSave={(v) => save({ treatmentPlan: v || null })}
            />
          </div>

          <div className="flex items-center gap-3 border-t border-border pt-4">
            <CalendarClock className="h-4 w-4 text-gray-400" strokeWidth={1.75} />
            <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {t('zeyara.followUpDue')}
            </label>
            <Input
              type="date"
              className="max-w-[180px]"
              disabled={!canUpdate}
              defaultValue={visit.followUpDue ?? ''}
              onBlur={(e) => {
                const v = e.target.value || null;
                if (v !== visit.followUpDue) save({ followUpDue: v });
              }}
            />
          </div>

          {/* Org-configurable clinical fields — an ENT clinic and a
              dermatology clinic record different things, and neither should
              need a code change to do it. */}
          <div className="border-t border-border pt-4">
            <CustomFieldValuesSection recordType="visits" recordId={visit.id} />
          </div>

          <VisitNotes visitId={visit.id} />
          <VisitAttachments visitId={visit.id} patientName={patientName} />
          <VisitReports visit={visit} />
        </div>
      )}
    </div>
  );
}

/**
 * Document Reports generated out of this consultation — the patient report a
 * clinic hands over, the referral a hospital receives. Anchored on the VISIT
 * (encounterType 'visit', migration 0085) rather than the appointment, so the
 * clinical record owns the paperwork it produced.
 *
 * Gated by the same add-on the rest of the module uses: a clinic that didn't
 * buy Document Reports sees nothing here.
 */
function VisitReports({ visit }: { visit: ZeyaraVisit }) {
  const { basePath } = useVertical();
  const { user } = useAuthStore();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const addOnActive = !!user?.activeAddOns?.documentReports;
  const canView = !!user && hasPermByKey(user, 'documentReports.reportsView');
  const canCreate = !!user && hasPermByKey(user, 'documentReports.reportsCreate');

  const { data } = useReportInstances({
    encounterType: 'visit',
    encounterId: visit.id,
    pageSize: 50,
    enabled: addOnActive && canView,
  });

  if (!addOnActive || !canView) return null;

  const reports = data?.items ?? [];

  return (
    <div className="border-t border-border pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-gray-400" strokeWidth={1.75} />
          <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500">Reports</h3>
        </div>
        {canCreate && visit.customerId && (
          <Button size="sm" variant="outline" onClick={() => setDrawerOpen(true)}>
            <Plus className="h-4 w-4 me-1" /> Generate Report
          </Button>
        )}
      </div>

      {reports.length === 0 ? (
        <p className="text-sm text-gray-500">No reports generated from this visit yet.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {reports.map((r) => (
            <li key={r.id}>
              <Link
                href={`${basePath}/reports/${r.id}`}
                className="flex items-center justify-between gap-3 px-3 py-2 text-sm transition-colors hover:bg-surface-hover"
              >
                <span className="font-medium text-gray-800">{r.templateName}</span>
                <span className="text-xs text-gray-400">{formatDateTime(r.createdAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {visit.customerId && (
        <ReportGenerateDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          customerId={visit.customerId}
          encounterType="visit"
          encounterId={visit.id}
        />
      )}
    </div>
  );
}

function VisitNotes({ visitId }: { visitId: string }) {
  const { t } = useT();
  const { user } = useAuthStore();
  const { data, isLoading } = useVisitNotes(visitId);
  const addMut = useAddVisitNote(visitId);
  const [draft, setDraft] = useState('');

  const canAdd = !!user && hasPermission(user, 'zeyara', 'visitNotesCreate');
  const notes = data?.notes ?? [];

  async function add() {
    const body = draft.trim();
    if (!body) return;
    try {
      await addMut.mutateAsync(body);
      setDraft('');
      toast.success(t('zeyara.noteAdded'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.saveFailed'));
    }
  }

  return (
    <div className="border-t border-border pt-4 space-y-3">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-gray-400" strokeWidth={1.75} />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {t('zeyara.clinicalNotes')}
        </h3>
        <span className="text-[11px] text-gray-400">{t('zeyara.notesAppendOnly')}</span>
      </div>

      {canAdd && (
        <div className="space-y-2">
          <Textarea
            rows={2}
            value={draft}
            placeholder={t('zeyara.notePlaceholder')}
            onChange={(e) => setDraft(e.target.value)}
            className="text-sm"
          />
          <Button size="sm" variant="outline" onClick={add} disabled={!draft.trim() || addMut.isPending}>
            {addMut.isPending ? t('common.saving') : t('zeyara.addNote')}
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="h-4 w-32 bg-surface-inset rounded animate-pulse" />
      ) : notes.length === 0 ? (
        <p className="text-sm text-gray-400">{t('zeyara.noNotes')}</p>
      ) : (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="rounded-lg border border-border bg-surface-page p-3">
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{n.body}</p>
              <p className="mt-1 text-[11px] text-gray-400">
                {n.authorName ?? '—'} · {formatDateTime(n.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function VisitAttachments({ visitId, patientName }: { visitId: string; patientName: string }) {
  const { t } = useT();
  const { user } = useAuthStore();
  const { data, isLoading } = useVisitAttachments(visitId);
  const uploadMut = useUploadVisitAttachment(visitId);
  const deleteMut = useDeleteVisitAttachment(visitId);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const canUpload = !!user && hasPermission(user, 'zeyara', 'visitAttachmentsUpload');
  const canDelete = !!user && hasPermission(user, 'zeyara', 'visitAttachmentsDelete');
  const attachments = data?.attachments ?? [];

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset immediately so picking the same file twice still fires onChange.
    e.target.value = '';
    if (!file) return;
    try {
      await uploadMut.mutateAsync(file);
      toast.success(t('zeyara.attachmentUploaded'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.saveFailed'));
    }
  }

  async function onDelete() {
    if (!confirmDelete) return;
    try {
      await deleteMut.mutateAsync(confirmDelete.id);
      toast.success(t('common.deleted'));
      setConfirmDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.deleteFailed'));
    }
  }

  return (
    <div className="border-t border-border pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-gray-400" strokeWidth={1.75} />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {t('zeyara.attachments')}
          </h3>
        </div>
        {canUpload && (
          <label className="cursor-pointer text-xs font-medium text-primary-600 hover:underline">
            {uploadMut.isPending ? t('zeyara.uploading') : t('zeyara.addAttachment')}
            <input
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
              onChange={onPick}
              disabled={uploadMut.isPending}
            />
          </label>
        )}
      </div>

      {isLoading ? (
        <div className="h-4 w-32 bg-surface-inset rounded animate-pulse" />
      ) : attachments.length === 0 ? (
        <p className="text-sm text-gray-400">{t('zeyara.noAttachments')}</p>
      ) : (
        <ul className="space-y-1.5">
          {attachments.map((a) => (
            <li key={a.id} className="flex items-center gap-2 rounded-lg border border-border bg-surface-page px-3 py-2">
              <Paperclip className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" strokeWidth={1.75} />
              <div className="min-w-0 flex-1">
                {a.url ? (
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-sm text-primary-600 hover:underline"
                  >
                    {a.fileName}
                  </a>
                ) : (
                  <span className="block truncate text-sm text-gray-500">{a.fileName}</span>
                )}
                <span className="text-[11px] text-gray-400">
                  {bytes(a.sizeBytes)}
                  {a.uploadedByName ? ` · ${a.uploadedByName}` : ''}
                </span>
              </div>
              {canDelete && (
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={t('common.delete')}
                  onClick={() => setConfirmDelete({ id: a.id, name: a.fileName })}
                >
                  <Trash2 size={14} />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
        title={t('zeyara.deleteAttachmentTitle')}
        description={
          confirmDelete
            ? t('zeyara.deleteAttachmentDesc')
                .replace('{name}', confirmDelete.name)
                .replace('{patient}', patientName)
            : ''
        }
        confirmLabel={t('common.delete')}
        variant="destructive"
        onConfirm={onDelete}
        loading={deleteMut.isPending}
      />
    </div>
  );
}

export type { ZeyaraVisit };
