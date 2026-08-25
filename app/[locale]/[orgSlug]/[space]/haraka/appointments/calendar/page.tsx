'use client';

import { useCallback, useMemo } from 'react';
import { useParams, useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, List } from 'lucide-react';
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isValid,
  parse,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { WeekPicker, MonthPicker } from '@/components/haraka/CalendarPeriodPicker';
import { Combobox } from '@/components/ui/combobox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppointments, useStaff } from '@/hooks/haraka';
import { useList } from '@/hooks/lists';
import { useModuleGuard, useT } from '@/hooks/ui';
import { cn } from '@/lib/utils/cn';
import type { AppointmentStatus, HarakaAppointment, ResolvedListItem } from '@/types';

// Hand-built grid rather than a calendar library — this codebase prefers
// small purpose-built UI over heavy dependencies, and each view is one
// absolutely-positioned block per appointment (design doc §6).
const DAY_START_HOUR = 7;
const DAY_END_HOUR = 21;
const PX_PER_MINUTE = 1.1;
const GRID_HEIGHT = (DAY_END_HOUR - DAY_START_HOUR) * 60 * PX_PER_MINUTE;
const WEEK_STARTS_ON = 6; // Saturday — regional business week

type CalendarView = 'day' | 'week' | 'month';

const STATUS_COLOR: Record<AppointmentStatus, string> = {
  scheduled: '#3b82f6',
  confirmed: '#6366f1',
  completed: '#22c55e',
  cancelled: '#ef4444',
  no_show: '#f97316',
};

function statusColor(statusList: ResolvedListItem[], status: string): string {
  return statusList.find((s) => s.value === status)?.color ?? STATUS_COLOR[status] ?? '#9ca3af';
}

// Falls back to the platform-default codes until the org's list resolves.
function statusFaded(statusList: ResolvedListItem[], status: string): boolean {
  const item = statusList.find((s) => s.value === status);
  return item ? !item.isBlocking : status === 'cancelled' || status === 'no_show';
}

function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function parseDateParam(value: string | null): Date {
  if (value) {
    const parsed = parse(value, 'yyyy-MM-dd', new Date());
    if (isValid(parsed)) return startOfDay(parsed);
  }
  return startOfDay(new Date());
}

export default function AppointmentsCalendarPage() {
  const { isAllowed } = useModuleGuard({
    featureKey: 'pos',
    harakaModule: 'appointments',
    moduleKey: 'haraka',
    permOp: 'appointmentsView',
  });
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams<{ locale: string; orgSlug: string; space: string }>();
  const { t } = useT();

  const view: CalendarView =
    searchParams.get('view') === 'week' || searchParams.get('view') === 'month'
      ? (searchParams.get('view') as CalendarView)
      : 'day';
  const day = useMemo(() => parseDateParam(searchParams.get('date')), [searchParams]);
  const staffId = searchParams.get('staffId') ?? '';

  const goTo = useCallback(
    (patch: { view?: CalendarView; date?: Date; staffId?: string | null }) => {
      const next = new URLSearchParams(searchParams.toString());
      if (patch.view) next.set('view', patch.view);
      if (patch.date) next.set('date', format(patch.date, 'yyyy-MM-dd'));
      if (patch.staffId !== undefined) {
        if (patch.staffId) next.set('staffId', patch.staffId);
        else next.delete('staffId');
      }
      router.push(`${pathname}?${next.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const { data: statusList = [] } = useList('appointment_status');

  const { data: staffData } = useStaff({ onlyActive: true, capability: 'appointment_provider' });
  const allProviders = useMemo(() => staffData?.items ?? [], [staffData]);
  const providers = useMemo(
    () => (staffId ? allProviders.filter((p) => p.id === staffId) : allProviders),
    [allProviders, staffId],
  );

  // Range fetched from the API depends on the active view; it always covers
  // the full grid shown (including the leading/trailing days in month view).
  const range = useMemo(() => {
    if (view === 'week') {
      const from = startOfWeek(day, { weekStartsOn: WEEK_STARTS_ON });
      return { from, to: addDays(from, 7) };
    }
    if (view === 'month') {
      const from = startOfWeek(startOfMonth(day), { weekStartsOn: WEEK_STARTS_ON });
      const to = addDays(endOfWeek(endOfMonth(day), { weekStartsOn: WEEK_STARTS_ON }), 1);
      return { from, to };
    }
    return { from: day, to: addDays(day, 1) };
  }, [view, day]);

  const { data, isLoading } = useAppointments({
    from: range.from.toISOString(),
    to: range.to.toISOString(),
    staffId: staffId || undefined,
    pageSize: view === 'month' ? 500 : 200,
  });

  const appointments = data?.items ?? [];

  const UNASSIGNED_KEY = '__unassigned__';
  const byProvider = useMemo(() => {
    const map = new Map<string, HarakaAppointment[]>();
    for (const a of appointments) {
      const key = a.staffId ?? UNASSIGNED_KEY;
      const list = map.get(key) ?? [];
      list.push(a);
      map.set(key, list);
    }
    return map;
  }, [appointments]);

  const byDay = useMemo(() => {
    const map = new Map<string, HarakaAppointment[]>();
    for (const a of appointments) {
      const key = format(new Date(a.scheduledAt), 'yyyy-MM-dd');
      const list = map.get(key) ?? [];
      list.push(a);
      map.set(key, list);
    }
    return map;
  }, [appointments]);

  if (!isAllowed) return null;

  const base = `/${params.locale}/${params.orgSlug}/${params.space}/haraka`;
  const hours = Array.from(
    { length: DAY_END_HOUR - DAY_START_HOUR + 1 },
    (_, i) => DAY_START_HOUR + i,
  );

  // Only the day view uses this prev/next control — week/month navigate via
  // their own pickers instead.
  function shiftDay(delta: number) {
    goTo({ date: addDays(day, delta) });
  }

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

      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={view} onValueChange={(v) => goTo({ view: v as CalendarView })}>
          <TabsList className="mb-0">
            <TabsTrigger value="day">{t('appointments.viewDay')}</TabsTrigger>
            <TabsTrigger value="week">{t('appointments.viewWeek')}</TabsTrigger>
            <TabsTrigger value="month">{t('appointments.viewMonth')}</TabsTrigger>
          </TabsList>
        </Tabs>

        {view === 'day' && (
          <>
            <Button size="sm" variant="outline" aria-label={t('appointments.prevDay')} onClick={() => shiftDay(-1)}>
              <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
            </Button>
            <Button size="sm" variant="outline" onClick={() => goTo({ date: startOfDay(new Date()) })}>
              {t('appointments.today')}
            </Button>
            <Button size="sm" variant="outline" aria-label={t('appointments.nextDay')} onClick={() => shiftDay(1)}>
              <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
            </Button>
          </>
        )}

        <div className={view === 'week' ? 'w-56' : 'w-44'}>
          {view === 'week' ? (
            <WeekPicker value={day} onChange={(d) => goTo({ date: d })} />
          ) : view === 'month' ? (
            <MonthPicker value={day} onChange={(d) => goTo({ date: d })} />
          ) : (
            <DatePicker value={format(day, 'yyyy-MM-dd')} onChange={(v) => v && goTo({ date: parseDateParam(v) })} />
          )}
        </div>

        <div className="w-48">
          <Combobox
            value={staffId || '__all__'}
            onChange={(v) => goTo({ staffId: !v || v === '__all__' ? null : v })}
            options={[
              { value: '__all__', label: t('appointments.filterProvider') },
              ...allProviders.map((p) => ({ value: p.id, label: p.name })),
            ]}
            clearable={false}
          />
        </div>

        {isLoading && (
          <span className="h-4 w-4 rounded-full border-2 border-primary-600 border-t-transparent animate-spin ms-1" />
        )}
      </div>

      {providers.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface-page p-8 text-center text-sm text-gray-400">
          {t('appointments.noProvidersForDay')}
        </div>
      ) : view === 'month' ? (
        <MonthGrid
          day={day}
          range={range}
          byDay={byDay}
          onPickDay={(d) => goTo({ view: 'day', date: d })}
          statusList={statusList}
        />
      ) : (
        // overflow-y-visible is explicit, not decorative — per the CSS overflow
        // spec, overflow-x: auto alone silently computes overflow-y to auto too,
        // which would create a second, unwanted vertical scrollbar on this box.
        <div className="rounded-xl border border-border bg-surface-card overflow-x-auto overflow-y-visible">
          <div className="min-w-max">
            {view === 'day' ? (
              <DayColumns
                hours={hours}
                columns={[
                  ...providers.map((p) => ({ key: p.id, label: p.name, items: byProvider.get(p.id) ?? [] })),
                  ...(byProvider.get(UNASSIGNED_KEY)?.length
                    ? [{ key: UNASSIGNED_KEY, label: t('appointments.unassigned'), items: byProvider.get(UNASSIGNED_KEY) ?? [] }]
                    : []),
                ]}
                onOpen={(id) => router.push(`${base}/appointments/${id}`)}
                statusList={statusList}
              />
            ) : (
              <DayColumns
                hours={hours}
                showProvider
                columns={eachDayOfInterval({ start: range.from, end: addDays(range.to, -1) }).map((d) => ({
                  key: format(d, 'yyyy-MM-dd'),
                  label: format(d, 'EEE dd MMM'),
                  items: byDay.get(format(d, 'yyyy-MM-dd')) ?? [],
                }))}
                onOpen={(id) => router.push(`${base}/appointments/${id}`)}
                statusList={statusList}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface Column {
  key: string;
  label: string;
  items: HarakaAppointment[];
}

interface LaneInfo {
  lane: number;
  laneCount: number;
}

/** Assigns each appointment a lane within its overlap cluster so concurrent
 *  bookings render side by side instead of stacked on top of each other. */
function layoutOverlaps(items: HarakaAppointment[]): Map<string, LaneInfo> {
  const intervals = items
    .map((item) => {
      const start = new Date(item.scheduledAt);
      const startMin = start.getHours() * 60 + start.getMinutes();
      return { item, start: startMin, end: startMin + item.durationMinutes };
    })
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const clusters: (typeof intervals)[] = [];
  let current: typeof intervals = [];
  let currentEnd = -Infinity;
  for (const iv of intervals) {
    if (current.length > 0 && iv.start >= currentEnd) {
      clusters.push(current);
      current = [];
      currentEnd = -Infinity;
    }
    current.push(iv);
    currentEnd = Math.max(currentEnd, iv.end);
  }
  if (current.length > 0) clusters.push(current);

  const result = new Map<string, LaneInfo>();
  for (const cluster of clusters) {
    const laneEnds: number[] = [];
    const laneOf = new Map<(typeof intervals)[number], number>();
    for (const iv of cluster) {
      let lane = laneEnds.findIndex((end) => end <= iv.start);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(iv.end);
      } else {
        laneEnds[lane] = iv.end;
      }
      laneOf.set(iv, lane);
    }
    const laneCount = laneEnds.length;
    for (const iv of cluster) result.set(iv.item.id, { lane: laneOf.get(iv)!, laneCount });
  }
  return result;
}

/** Shared time-grid renderer for both the day view (columns = providers) and
 *  the week view (columns = days, appointments from every matching provider
 *  stacked in one column — `showProvider` labels each card with its worker
 *  since the column itself no longer identifies one). Overlapping bookings
 *  within a column are laid out side by side via layoutOverlaps. */
function DayColumns({
  hours,
  columns,
  showProvider,
  onOpen,
  statusList,
}: {
  hours: number[];
  columns: Column[];
  showProvider?: boolean;
  onOpen: (id: string) => void;
  statusList: ResolvedListItem[];
}) {
  return (
    <>
      <div className="flex border-b border-border bg-surface-page">
        <div className="w-14 flex-shrink-0" />
        {columns.map((col) => (
          <div
            key={col.key}
            className="w-48 flex-shrink-0 px-3 py-2 text-xs font-semibold text-gray-600 truncate border-s border-border"
          >
            {col.label}
          </div>
        ))}
      </div>

      <div className="flex" style={{ height: GRID_HEIGHT }}>
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

        {columns.map((col) => {
          const layout = layoutOverlaps(col.items);
          return (
            <div key={col.key} className="w-48 flex-shrink-0 relative border-s border-border">
              {hours.map((h) => (
                <div
                  key={h}
                  className="absolute inset-x-0 border-t border-gray-100"
                  style={{ top: (h - DAY_START_HOUR) * 60 * PX_PER_MINUTE }}
                />
              ))}

              {col.items.map((a) => {
                const start = new Date(a.scheduledAt);
                const minutesFromTop = (start.getHours() - DAY_START_HOUR) * 60 + start.getMinutes();
                const color = statusColor(statusList, a.status);
                const faded = statusFaded(statusList, a.status);
                const { lane, laneCount } = layout.get(a.id) ?? { lane: 0, laneCount: 1 };
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onOpen(a.id)}
                    className={cn(
                      'absolute rounded-md px-2 py-1 text-start text-[11px] overflow-hidden transition-opacity hover:opacity-90 hover:z-10',
                      faded && 'opacity-50 line-through',
                    )}
                    style={{
                      top: minutesFromTop * PX_PER_MINUTE,
                      height: Math.max(18, a.durationMinutes * PX_PER_MINUTE - 2),
                      left: `calc(${(lane / laneCount) * 100}% + 2px)`,
                      width: `calc(${100 / laneCount}% - 4px)`,
                      backgroundColor: `${color}1f`,
                      borderInlineStart: `3px solid ${color}`,
                    }}
                    title={`${a.appointmentNumber} · ${a.customerName}${showProvider && a.staffName ? ` · ${a.staffName}` : ''}`}
                  >
                    <div className="font-medium text-gray-800 truncate">{a.customerName}</div>
                    <div className="text-gray-500 truncate">
                      {hhmm(start)} · {showProvider && a.staffName ? a.staffName : (a.serviceName ?? '')}
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </>
  );
}

function MonthGrid({
  day,
  range,
  byDay,
  onPickDay,
  statusList,
}: {
  day: Date;
  range: { from: Date; to: Date };
  byDay: Map<string, HarakaAppointment[]>;
  onPickDay: (d: Date) => void;
  statusList: ResolvedListItem[];
}) {
  const days = eachDayOfInterval({ start: range.from, end: addDays(range.to, -1) });
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <div className="rounded-xl border border-border bg-surface-card overflow-hidden">
      <div className="grid grid-cols-7 border-b border-border bg-surface-page">
        {days.slice(0, 7).map((d) => (
          <div key={d.toISOString()} className="px-2 py-2 text-xs font-semibold text-gray-600 text-center">
            {format(d, 'EEE')}
          </div>
        ))}
      </div>
      <div>
        {weeks.map((week) => (
          <div key={week[0].toISOString()} className="grid grid-cols-7">
            {week.map((d) => {
              const key = format(d, 'yyyy-MM-dd');
              const items = (byDay.get(key) ?? []).sort(
                (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
              );
              const visible = items.slice(0, 3);
              const overflow = items.length - visible.length;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onPickDay(d)}
                  className={cn(
                    'min-h-[110px] border-s border-t border-border p-1.5 text-start align-top hover:bg-surface-page transition-colors',
                    !isSameMonth(d, day) && 'bg-surface-page/60 text-gray-300',
                  )}
                >
                  <div
                    className={cn(
                      'text-[11px] font-medium mb-1',
                      isSameDay(d, new Date()) && 'inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-white',
                    )}
                  >
                    {format(d, 'd')}
                  </div>
                  <div className="space-y-0.5">
                    {visible.map((a) => {
                      const color = statusColor(statusList, a.status);
                      return (
                        <div
                          key={a.id}
                          className="truncate rounded px-1 py-0.5 text-[10px]"
                          style={{ backgroundColor: `${color}1f`, borderInlineStart: `2px solid ${color}` }}
                          title={`${hhmm(new Date(a.scheduledAt))} · ${a.customerName}${a.staffName ? ` · ${a.staffName}` : ''}`}
                        >
                          {hhmm(new Date(a.scheduledAt))} {a.customerName}
                          {a.staffName ? ` · ${a.staffName}` : ''}
                        </div>
                      );
                    })}
                    {overflow > 0 && (
                      <div className="text-[10px] text-gray-400 px-1">+{overflow} more</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
