'use client';

import { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { format, isSameWeek, startOfWeek, endOfWeek } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const TRIGGER_CLASS = cn(
  'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-border bg-surface-card px-3 text-[14px] transition-colors text-gray-700',
  'hover:border-gray-300 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-500/20 focus-visible:border-primary-600',
);

const DAY_PICKER_CLASSNAMES = {
  root: 'p-3',
  months: 'relative',
  month_caption: 'flex items-center justify-between mb-3 px-1',
  caption_label: 'hidden',
  dropdowns: 'flex items-center gap-1.5',
  nav: 'flex items-center gap-1',
  button_previous: 'flex items-center justify-center h-7 w-7 rounded-md text-gray-500 hover:bg-surface-page hover:text-gray-900 transition-colors',
  button_next: 'flex items-center justify-center h-7 w-7 rounded-md text-gray-500 hover:bg-surface-page hover:text-gray-900 transition-colors',
  month_grid: 'w-full border-collapse',
  weekday: 'w-9 h-8 text-[11px] font-medium text-gray-400 text-center',
  day: 'p-0',
  day_button: 'w-9 h-9 text-[13.5px] rounded-lg flex items-center justify-center mx-auto transition-colors text-gray-900 hover:bg-primary-50 hover:text-primary-700 focus:outline-none focus:ring-[3px] focus:ring-primary-500/20',
  selected: '[&>button]:bg-primary-600 [&>button]:text-white [&>button]:hover:bg-primary-700',
  today: '[&>button]:font-semibold [&>button]:text-primary-600',
  outside: '[&>button]:text-gray-300',
  hidden: 'invisible',
};

const WEEK_STARTS_ON = 6;

/** Week view's date control — picking any day snaps to the week containing
 *  it (the calendar shades that whole week so the 7-day span reads clearly). */
export function WeekPicker({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(value);
  const weekStart = startOfWeek(value, { weekStartsOn: WEEK_STARTS_ON });
  const weekEnd = endOfWeek(value, { weekStartsOn: WEEK_STARTS_ON });

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button type="button" className={TRIGGER_CLASS}>
          <span>{format(weekStart, 'dd MMM')} – {format(weekEnd, 'dd MMM yyyy')}</span>
          <Calendar className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" strokeWidth={1.75} />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          className="z-[60] bg-surface-card rounded-xl border border-border shadow-lg p-0 w-[280px]"
        >
          <DayPicker
            mode="single"
            selected={value}
            onSelect={(d) => { if (d) { onChange(d); setOpen(false); } }}
            month={month}
            onMonthChange={setMonth}
            weekStartsOn={WEEK_STARTS_ON}
            modifiers={{ inWeek: (d) => isSameWeek(d, value, { weekStartsOn: WEEK_STARTS_ON }) }}
            modifiersClassNames={{ inWeek: '[&>button]:bg-primary-50' }}
            classNames={DAY_PICKER_CLASSNAMES}
            components={{
              Chevron: ({ orientation }) =>
                orientation === 'left'
                  ? <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
                  : <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.75} />,
            }}
          />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

const MONTH_LABELS = Array.from({ length: 12 }, (_, i) => format(new Date(2000, i, 1), 'MMM'));

/** Month view's date control — no day-of-month is meaningful here, so this
 *  is a plain month + year grid rather than a full day calendar. */
export function MonthPicker({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(value.getFullYear());

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={(o) => { setOpen(o); if (o) setYear(value.getFullYear()); }}>
      <PopoverPrimitive.Trigger asChild>
        <button type="button" className={TRIGGER_CLASS}>
          <span>{format(value, 'MMMM yyyy')}</span>
          <Calendar className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" strokeWidth={1.75} />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          className="z-[60] bg-surface-card rounded-xl border border-border shadow-lg p-3 w-[240px]"
        >
          <div className="flex items-center justify-between mb-3 px-1">
            <button
              type="button"
              className="flex items-center justify-center h-7 w-7 rounded-md text-gray-500 hover:bg-surface-page hover:text-gray-900 transition-colors"
              onClick={() => setYear((y) => y - 1)}
              aria-label="Previous year"
            >
              <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
            <span className="text-[13.5px] font-medium text-gray-700">{year}</span>
            <button
              type="button"
              className="flex items-center justify-center h-7 w-7 rounded-md text-gray-500 hover:bg-surface-page hover:text-gray-900 transition-colors"
              onClick={() => setYear((y) => y + 1)}
              aria-label="Next year"
            >
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {MONTH_LABELS.map((label, i) => {
              const selected = year === value.getFullYear() && i === value.getMonth();
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => { onChange(new Date(year, i, 1)); setOpen(false); }}
                  className={cn(
                    'h-9 rounded-lg text-[13.5px] font-medium transition-colors',
                    selected ? 'bg-primary-600 text-white' : 'text-gray-700 hover:bg-primary-50 hover:text-primary-700',
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
