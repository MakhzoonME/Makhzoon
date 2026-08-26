'use client';

import { useEffect, useRef, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { format, isSameWeek, startOfWeek, endOfWeek, eachYearOfInterval, eachMonthOfInterval, startOfYear, endOfYear } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';

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

/** Week view's date control — hovering any day shades the whole week it
 *  belongs to (clicking anywhere in that shaded week picks it); no single
 *  day is highlighted on its own, since a day-level selection isn't what
 *  this control represents. */
export function WeekPicker({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(value);
  const [hovered, setHovered] = useState<Date | null>(null);
  const weekStart = startOfWeek(value, { weekStartsOn: WEEK_STARTS_ON });
  const weekEnd = endOfWeek(value, { weekStartsOn: WEEK_STARTS_ON });
  const shadedAround = hovered ?? value;

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={(o) => { setOpen(o); if (!o) setHovered(null); }}>
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
            selected={undefined}
            onSelect={(d) => { if (d) { onChange(d); setOpen(false); setHovered(null); } }}
            onDayMouseEnter={(d) => setHovered(d)}
            onDayMouseLeave={() => setHovered(null)}
            month={month}
            onMonthChange={setMonth}
            weekStartsOn={WEEK_STARTS_ON}
            modifiers={{ inWeek: (d) => isSameWeek(d, shadedAround, { weekStartsOn: WEEK_STARTS_ON }) }}
            modifiersClassNames={{ inWeek: '[&>button]:bg-primary-50 [&>button]:text-primary-700' }}
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

const MONTH_RANGE_START = new Date(2000, 0);
const MONTH_RANGE_END = new Date(2040, 11);

/** Month view's date control — no day-of-month is meaningful here, so this
 *  never renders a day grid: it's a scrollable list of years, each expanding
 *  into its 12 months, jumping straight to (and focusing) the current
 *  year/month when opened. */
export function MonthPicker({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const [open, setOpen] = useState(false);

  const years = eachYearOfInterval({
    start: startOfYear(MONTH_RANGE_START),
    end: endOfYear(MONTH_RANGE_END),
  });

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
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
          className="z-[60] bg-surface-card rounded-xl border border-border shadow-lg overflow-hidden w-[260px] h-80"
        >
          <MonthYearList
            years={years}
            currentYear={value.getFullYear()}
            currentMonth={value.getMonth()}
            onSelect={(d) => { onChange(d); setOpen(false); }}
          />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

function MonthYearList({
  years,
  currentYear,
  currentMonth,
  onSelect,
}: {
  years: Date[];
  currentYear: number;
  currentMonth: number;
  onSelect: (d: Date) => void;
}) {
  const currentYearRef = useRef<HTMLDivElement>(null);
  const currentMonthButtonRef = useRef<HTMLButtonElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentYearRef.current && scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
      if (viewport) viewport.scrollTop = currentYearRef.current.offsetTop;
    }
    currentMonthButtonRef.current?.focus();
  }, []);

  return (
    <ScrollArea ref={scrollAreaRef} className="h-full">
      {years.map((year) => {
        const yearNum = year.getFullYear();
        const isCurrentYear = yearNum === currentYear;
        const months = eachMonthOfInterval({ start: startOfYear(year), end: endOfYear(year) });

        return (
          <div key={yearNum} ref={isCurrentYear ? currentYearRef : undefined}>
            <Collapsible className="border-b border-border px-2 py-1.5" defaultOpen={isCurrentYear}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="flex w-full justify-start gap-2 text-[13px] font-medium hover:bg-transparent [&[data-state=open]>svg]:rotate-180"
                >
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform duration-200" strokeWidth={1.75} aria-hidden="true" />
                  {yearNum}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="overflow-hidden px-1 py-1.5 data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                <div className="grid grid-cols-3 gap-1.5">
                  {months.map((month) => {
                    const isCurrentMonth = isCurrentYear && month.getMonth() === currentMonth;
                    return (
                      <Button
                        key={month.getTime()}
                        ref={isCurrentMonth ? currentMonthButtonRef : undefined}
                        type="button"
                        variant={isCurrentMonth ? 'default' : 'outline'}
                        size="sm"
                        className="h-9"
                        onClick={() => onSelect(month)}
                      >
                        {format(month, 'MMM')}
                      </Button>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        );
      })}
    </ScrollArea>
  );
}
