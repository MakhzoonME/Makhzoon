'use client';

import { useCallback, useMemo } from 'react';
import { useParams, useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, List } from 'lucide-react';
import {
  addDays,
  addMonths,
  addWeeks,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppointments, useStaff } from '@/hooks/haraka';
import { useModuleGuard, useT } from '@/hooks/ui';
import { cn } from '@/lib/utils/cn';
import type { AppointmentStatus, HarakaAppointment } from '@/types';

// Hand-built grid rather than a calendar library — this codebase prefers
// small purpose-built UI over heavy dependencies, and each view is one
// absolutely-positioned block per appointment (design doc §6).
const DAY_START_HOUR = 7;
const DAY_END_HOUR = 21;
const PX_PER_MINUTE = 1.1;
const GRID_HEIGHT = (DAY_END_HOUR - DAY_START_HOUR) * 60 * PX_PER_MINUTE;
const WEEK_STARTS_ON = 6; // Saturday — regional business week
// Caps the time grid's own scroll region so only it scrolls, not the page.
const GRID_MAX_HEIGHT = 'calc(100vh - 300px)';

type CalendarView = 'day' | 'week' | 'month';

const STATUS_COLOR: Record<AppointmentStatus, string> = {
  scheduled: '#3b82f6',
  confirmed: '#6366f1',
  completed: '#22c55e',
  cancelled: '#ef4444',
  no_show: '#f97316',
};

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

  const byProvider = useMemo(() => {
    const map = new Map<string, HarakaAppointment[]>();
    for (const a of appointments) {
      const list = map.get(a.staffId) ?? [];
      list.push(a);
      map.set(a.staffId, list);
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

  function shift(delta: number) {
    if (view === 'week') goTo({ date: addWeeks(day, delta) });
    else if (view === 'month') goTo({ date: addMonths(day, delta) });
    else goTo({ date: addDays(day, delta) });
  }

  const headerLabel =
    view === 'day'
      ? format(day, 'dd MMM yyyy')
      : view === 'week'
        ? `${format(range.from, 'dd MMM')} – ${format(addDays(range.to, -1), 'dd MMM yyyy')}`
        : format(day, 'MMMM yyyy');

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

        <Button size="sm" variant="outline" aria-label={t('appointments.prevDay')} onClick={() => shift(-1)}>
          <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
        </Button>
        <Button size="sm" variant="outline" onClick={() => goTo({ date: startOfDay(new Date()) })}>
          {t('appointments.today')}
        </Button>
        <Button size="sm" variant="outline" aria-label={t('appointments.nextDay')} onClick={() => shift(1)}>
          <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
        </Button>

        <div className="w-44">
          <DatePicker value={format(day, 'yyyy-MM-dd')} onChange={(v) => v && goTo({ date: parseDateParam(v) })} />
        </div>

        <div className="w-48">
          <Select value={staffId || '__all__'} onValueChange={(v) => goTo({ staffId: v === '__all__' ? null : v })}>
            <SelectTrigger>
              <SelectValue placeholder={t('appointments.filterProvider')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t('appointments.filterProvider')}</SelectItem>
              {allProviders.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <span className="ms-1 text-sm font-medium text-gray-700">{headerLabel}</span>
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
        />
      ) : (
        <div className="rounded-xl border border-border bg-surface-card overflow-hidden">
          <div className="overflow-auto" style={{ maxHeight: GRID_MAX_HEIGHT }}>
            <div className="min-w-max">
              {view === 'day' ? (
                <DayColumns
                  hours={hours}
                  columns={providers.map((p) => ({ key: p.id, label: p.name, items: byProvider.get(p.id) ?? [] }))}
                  onOpen={(id) => router.push(`${base}/appointments/${id}`)}
                />
              ) : (
                <DayColumns
                  hours={hours}
                  columns={eachDayOfInterval({ start: range.from, end: addDays(range.to, -1) }).map((d) => ({
                    key: format(d, 'yyyy-MM-dd'),
                    label: format(d, 'EEE dd MMM'),
                    items: byDay.get(format(d, 'yyyy-MM-dd')) ?? [],
                  }))}
                  onOpen={(id) => router.push(`${base}/appointments/${id}`)}
                />
              )}
            </div>
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

/** Shared time-grid renderer for both the day view (columns = providers) and
 *  the week view (columns = days, appointments from all matching providers
 *  stacked in one column — overlapping bookings render side by side by browser
 *  layout order rather than a true collision layout, an accepted v1 simplification). */
function DayColumns({
  hours,
  columns,
  onOpen,
}: {
  hours: number[];
  columns: Column[];
  onOpen: (id: string) => void;
}) {
  return (
    <>
      <div className="flex border-b border-border bg-surface-page sticky top-0 z-10">
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

        {columns.map((col) => (
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
              const color = STATUS_COLOR[a.status] ?? '#9ca3af';
              const faded = a.status === 'cancelled' || a.status === 'no_show';
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onOpen(a.id)}
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
    </>
  );
}

function MonthGrid({
  day,
  range,
  byDay,
  onPickDay,
}: {
  day: Date;
  range: { from: Date; to: Date };
  byDay: Map<string, HarakaAppointment[]>;
  onPickDay: (d: Date) => void;
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
      <div className="overflow-auto" style={{ maxHeight: GRID_MAX_HEIGHT }}>
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
                      const color = STATUS_COLOR[a.status] ?? '#9ca3af';
                      return (
                        <div
                          key={a.id}
                          className="truncate rounded px-1 py-0.5 text-[10px]"
                          style={{ backgroundColor: `${color}1f`, borderInlineStart: `2px solid ${color}` }}
                          title={`${hhmm(new Date(a.scheduledAt))} · ${a.customerName}`}
                        >
                          {hhmm(new Date(a.scheduledAt))} {a.customerName}
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
