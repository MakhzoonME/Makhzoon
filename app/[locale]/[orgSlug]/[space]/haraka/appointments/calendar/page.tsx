'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, List } from 'lucide-react';
import { PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { useAppointments, useStaff } from '@/hooks/haraka';
import { useModuleGuard, useT } from '@/hooks/ui';
import { formatDate } from '@/lib/utils/date';
import { cn } from '@/lib/utils/cn';
import type { AppointmentStatus, HarakaAppointment } from '@/types';

// Hand-built grid rather than a calendar library — this codebase prefers
// small purpose-built UI over heavy dependencies, and a day view is one
// absolutely-positioned block per appointment (design doc §6).
const DAY_START_HOUR = 7;
const DAY_END_HOUR = 21;
const PX_PER_MINUTE = 1.1;
const GRID_HEIGHT = (DAY_END_HOUR - DAY_START_HOUR) * 60 * PX_PER_MINUTE;

const STATUS_COLOR: Record<AppointmentStatus, string> = {
  scheduled: '#3b82f6',
  confirmed: '#6366f1',
  completed: '#22c55e',
  cancelled: '#ef4444',
  no_show: '#f97316',
};

/** Local midnight for a date, so the day range matches what the user sees. */
function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/**
 * Blocks are positioned by the viewer's local clock. That matches the org
 * timezone for staff working on site — the case this grid is for. The booking
 * guard itself resolves working hours against organizations.timezone
 * server-side, so a viewer in another zone sees shifted blocks but can never
 * book an invalid slot.
 */
function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function AppointmentsCalendarPage() {
  const { isAllowed } = useModuleGuard({
    featureKey: 'pos',
    moduleKey: 'haraka',
    permOp: 'appointmentsView',
  });
  const router = useRouter();
  const params = useParams<{ locale: string; orgSlug: string; space: string }>();
  const { t } = useT();

  const [day, setDay] = useState(() => startOfDay(new Date()));
  const dayEnd = useMemo(() => addDays(day, 1), [day]);

  const { data: staffData } = useStaff({ onlyActive: true, capability: 'appointment_provider' });
  const providers = useMemo(() => staffData?.items ?? [], [staffData]);

  const { data, isLoading } = useAppointments({
    from: day.toISOString(),
    to: dayEnd.toISOString(),
    pageSize: 200,
  });

  const byProvider = useMemo(() => {
    const map = new Map<string, HarakaAppointment[]>();
    for (const a of data?.items ?? []) {
      const list = map.get(a.staffId) ?? [];
      list.push(a);
      map.set(a.staffId, list);
    }
    return map;
  }, [data]);

  if (!isAllowed) return null;

  const base = `/${params.locale}/${params.orgSlug}/${params.space}/haraka`;
  const hours = Array.from(
    { length: DAY_END_HOUR - DAY_START_HOUR + 1 },
    (_, i) => DAY_START_HOUR + i,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('appointments.calendar')}
        description={t('appointments.subtitle')}
        actions={
          <Button variant="outline" onClick={() => router.push(`${base}/appointments`)}>
            <List className="h-4 w-4 me-2" strokeWidth={1.75} />
            {t('appointments.listView')}
          </Button>
        }
      />

      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" aria-label={t('appointments.prevDay')} onClick={() => setDay((d) => addDays(d, -1))}>
          <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
        </Button>
        <Button size="sm" variant="outline" onClick={() => setDay(startOfDay(new Date()))}>
          {t('appointments.today')}
        </Button>
        <Button size="sm" variant="outline" aria-label={t('appointments.nextDay')} onClick={() => setDay((d) => addDays(d, 1))}>
          <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
        </Button>
        <span className="ms-2 text-sm font-medium text-gray-700">{formatDate(day)}</span>
        {isLoading && (
          <span className="h-4 w-4 rounded-full border-2 border-primary-600 border-t-transparent animate-spin ms-2" />
        )}
      </div>

      {providers.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface-page p-8 text-center text-sm text-gray-400">
          {t('appointments.noProvidersForDay')}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-max">
              {/* Provider header row */}
              <div className="flex border-b border-border bg-surface-page sticky top-0 z-10">
                <div className="w-14 flex-shrink-0" />
                {providers.map((p) => (
                  <div
                    key={p.id}
                    className="w-48 flex-shrink-0 px-3 py-2 text-xs font-semibold text-gray-600 truncate border-s border-border"
                  >
                    {p.name}
                  </div>
                ))}
              </div>

              <div className="flex" style={{ height: GRID_HEIGHT }}>
                {/* Hour gutter */}
                <div className="w-14 flex-shrink-0 relative">
                  {hours.map((h) => (
                    <div
                      key={h}
                      className="absolute inset-x-0 text-[10px] text-gray-400 text-end pe-2 -translate-y-1/2"
                      style={{ top: (h - DAY_START_HOUR) * 60 * PX_PER_MINUTE }}
                    >
                      {String(h).padStart(2, '0')}:00
                    </div>
                  ))}
                </div>

                {/* One column per provider */}
                {providers.map((p) => (
                  <div key={p.id} className="w-48 flex-shrink-0 relative border-s border-border">
                    {hours.map((h) => (
                      <div
                        key={h}
                        className="absolute inset-x-0 border-t border-gray-100"
                        style={{ top: (h - DAY_START_HOUR) * 60 * PX_PER_MINUTE }}
                      />
                    ))}

                    {(byProvider.get(p.id) ?? []).map((a) => {
                      const start = new Date(a.scheduledAt);
                      const minutesFromTop =
                        (start.getHours() - DAY_START_HOUR) * 60 + start.getMinutes();
                      const color = STATUS_COLOR[a.status] ?? '#9ca3af';
                      const faded = a.status === 'cancelled' || a.status === 'no_show';
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => router.push(`${base}/appointments/${a.id}`)}
                          className={cn(
                            'absolute inset-x-1 rounded-md px-2 py-1 text-start text-[11px] overflow-hidden transition-opacity hover:opacity-90',
                            faded && 'opacity-50 line-through',
                          )}
                          style={{
                            top: minutesFromTop * PX_PER_MINUTE,
                            height: Math.max(18, a.durationMinutes * PX_PER_MINUTE - 2),
                            backgroundColor: `${color}1f`,
                            borderInlineStart: `3px solid ${color}`,
                          }}
                          title={`${a.appointmentNumber} · ${a.customerName}`}
                        >
                          <div className="font-medium text-gray-800 truncate">{a.customerName}</div>
                          <div className="text-gray-500 truncate">
                            {hhmm(start)} · {a.serviceName ?? ''}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
