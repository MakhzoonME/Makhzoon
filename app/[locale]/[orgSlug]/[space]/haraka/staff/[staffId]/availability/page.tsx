'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useStaff,
  useStaffAvailability,
  useAddStaffAvailability,
  useRemoveStaffAvailability,
  useUpsertStaffAvailabilityException,
  useRemoveStaffAvailabilityException,
} from '@/hooks/haraka';
import { toast, useModuleGuard, useT } from '@/hooks/ui';
import { formatDate } from '@/lib/utils/date';

// 0 = Sunday … 6 = Saturday, matching JS Date#getDay and the DB's day_of_week.
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function StaffAvailabilityPage() {
  const { isAllowed } = useModuleGuard({
    featureKey: 'pos',
    moduleKey: 'haraka',
    permOp: 'appointmentsView',
  });
  const params = useParams<{ locale: string; orgSlug: string; space: string; staffId: string }>();
  const router = useRouter();
  const { t } = useT();
  const base = `/${params.locale}/${params.orgSlug}/${params.space}/haraka`;

  const { data: staffData } = useStaff();
  const person = (staffData?.items ?? []).find((s) => s.id === params.staffId) ?? null;

  const { data, isLoading } = useStaffAvailability(params.staffId);
  const addHours = useAddStaffAvailability();
  const removeHours = useRemoveStaffAvailability();
  const upsertException = useUpsertStaffAvailabilityException();
  const removeException = useRemoveStaffAvailabilityException();

  const [day, setDay] = useState('1');
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('17:00');

  const [exDate, setExDate] = useState('');
  const [exDayOff, setExDayOff] = useState(true);
  const [exStart, setExStart] = useState('09:00');
  const [exEnd, setExEnd] = useState('13:00');
  const [exReason, setExReason] = useState('');

  if (!isAllowed) return null;

  const weekly = data?.weekly ?? [];
  const exceptions = data?.exceptions ?? [];
  const isProvider = person?.capabilities.includes('appointment_provider') ?? true;

  async function handleAddHours() {
    try {
      await addHours.mutateAsync({
        staffId: params.staffId,
        body: { dayOfWeek: Number(day), startTime: start, endTime: end },
      });
      toast.success(t('common.created'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.saveFailed'));
    }
  }

  async function handleAddException() {
    if (!exDate) { toast.error(t('staff.labelDate')); return; }
    try {
      await upsertException.mutateAsync({
        staffId: params.staffId,
        body: {
          exceptionDate: exDate,
          // A day off carries no times at all; custom hours carry both.
          startTime: exDayOff ? null : exStart,
          endTime: exDayOff ? null : exEnd,
          reason: exReason || null,
        },
      });
      toast.success(t('common.created'));
      setExDate('');
      setExReason('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.saveFailed'));
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title={person?.name ?? t('staff.availability')}
        description={t('staff.availabilitySubtitle').replace('{name}', person?.name ?? '')}
        actions={
          <Button variant="ghost" onClick={() => router.push(`${base}/staff`)}>
            <ArrowLeft className="h-4 w-4 me-2" /> {t('common.back')}
          </Button>
        }
      />

      {!isProvider && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
          {t('staff.notAProvider')}
        </div>
      )}

      {/* Weekly pattern */}
      <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          {t('staff.availabilityWeekly')}
        </div>

        {isLoading ? (
          <div className="h-10 bg-surface-card rounded animate-pulse" />
        ) : weekly.length === 0 ? (
          <p className="text-sm text-gray-400">{t('staff.noHours')}</p>
        ) : (
          <div className="space-y-1.5">
            {weekly.map((row) => (
              <div key={row.id} className="flex items-center gap-3 text-sm py-1.5 border-b border-border last:border-0">
                <span className="w-28 font-medium text-gray-700">{DAY_NAMES[row.dayOfWeek]}</span>
                <span className="font-mono text-gray-600">{row.startTime} – {row.endTime}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={t('common.delete')}
                  className="ms-auto text-red-400 hover:text-red-600 hover:bg-red-50 h-6 w-6 p-0"
                  onClick={() => removeHours.mutate({ staffId: params.staffId, id: row.id })}
                  disabled={removeHours.isPending}
                >
                  <Trash2 className="h-3 w-3" strokeWidth={1.75} />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-border">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">{t('col.date')}</label>
            <select
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-surface-card px-2 text-sm"
            >
              {DAY_NAMES.map((name, i) => (
                <option key={name} value={String(i)}>{name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">{t('staff.labelStartTime')}</label>
            <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">{t('staff.labelEndTime')}</label>
            <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="flex items-end">
            <Button
              size="sm"
              onClick={handleAddHours}
              disabled={addHours.isPending || !isProvider}
              className="w-full"
              style={{ background: 'var(--mod-haraka)' }}
            >
              <Plus className="h-3.5 w-3.5 me-1" strokeWidth={1.75} />
              {t('staff.addHours')}
            </Button>
          </div>
        </div>
      </div>

      {/* Per-date exceptions */}
      <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          {t('staff.availabilityExceptions')}
        </div>

        {exceptions.length === 0 ? (
          <p className="text-sm text-gray-400">{t('staff.noExceptions')}</p>
        ) : (
          <div className="space-y-1.5">
            {exceptions.map((ex) => (
              <div key={ex.id} className="flex items-center gap-3 text-sm py-1.5 border-b border-border last:border-0">
                <span className="w-28 font-medium text-gray-700">{formatDate(new Date(`${ex.exceptionDate}T00:00:00`))}</span>
                <span className="font-mono text-gray-600">
                  {ex.startTime && ex.endTime ? `${ex.startTime} – ${ex.endTime}` : t('staff.dayOff')}
                </span>
                {ex.reason && <span className="text-xs text-gray-400 truncate">— {ex.reason}</span>}
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={t('common.delete')}
                  className="ms-auto text-red-400 hover:text-red-600 hover:bg-red-50 h-6 w-6 p-0"
                  onClick={() => removeException.mutate({ staffId: params.staffId, id: ex.id })}
                  disabled={removeException.isPending}
                >
                  <Trash2 className="h-3 w-3" strokeWidth={1.75} />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3 pt-2 border-t border-border">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">{t('staff.labelDate')} *</label>
              <Input type="date" value={exDate} onChange={(e) => setExDate(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-gray-600">{t('staff.labelReason')}</label>
              <Input value={exReason} onChange={(e) => setExReason(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={exDayOff}
              onChange={(e) => setExDayOff(e.target.checked)}
              className="rounded border-border"
            />
            {t('staff.dayOff')}
          </label>

          {!exDayOff && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">{t('staff.labelStartTime')}</label>
                <Input type="time" value={exStart} onChange={(e) => setExStart(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">{t('staff.labelEndTime')}</label>
                <Input type="time" value={exEnd} onChange={(e) => setExEnd(e.target.value)} className="h-9 text-sm" />
              </div>
            </div>
          )}

          <Button
            size="sm"
            onClick={handleAddException}
            disabled={upsertException.isPending || !isProvider}
            style={{ background: 'var(--mod-haraka)' }}
          >
            <Plus className="h-3.5 w-3.5 me-1" strokeWidth={1.75} />
            {t('staff.addException')}
          </Button>
        </div>
      </div>
    </div>
  );
}
