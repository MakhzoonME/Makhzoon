'use client';
import { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { format, isValid, parseISO } from 'date-fns';
import { Calendar, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useT } from '@/hooks/ui';

interface DateTimePickerProps {
  value?: string;        // ISO string or empty
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: boolean;
}

const HOURS   = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

export function DateTimePicker({ value, onChange, placeholder, className, disabled, error }: DateTimePickerProps) {
  const { t } = useT();
  const [open, setOpen] = useState(false);

  const parsed = value ? parseISO(value) : undefined;
  const selected = parsed && isValid(parsed) ? parsed : undefined;

  const [month, setMonth] = useState<Date>(selected ?? new Date());
  const [hour,   setHour]   = useState(selected?.getHours()   ?? 12);
  const [minute, setMinute] = useState(selected ? Math.round(selected.getMinutes() / 5) * 5 % 60 : 0);

  const finalPlaceholder = placeholder ?? t('common.pickDate');

  function buildDate(date: Date, h: number, m: number): string {
    const d = new Date(date);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  }

  function handleSelect(date: Date | undefined) {
    if (!date) return;
    onChange?.(buildDate(date, hour, minute));
  }

  function handleTimeChange(newHour: number, newMinute: number) {
    setHour(newHour);
    setMinute(newMinute);
    if (selected) {
      onChange?.(buildDate(selected, newHour, newMinute));
    }
  }

  function handleToday() {
    const today = new Date();
    const h = today.getHours();
    const m = Math.round(today.getMinutes() / 5) * 5 % 60;
    setHour(h);
    setMinute(m);
    setMonth(today);
    onChange?.(buildDate(today, h, m));
    setOpen(false);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange?.('');
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={(o) => { if (!disabled) setOpen(o); }}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-border bg-surface-card px-3 text-[14px] transition-colors text-gray-900 dark:text-gray-700',
            'hover:border-gray-300 dark:hover:border-gray-500 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-500/20 focus-visible:border-primary-600',
            !selected && 'text-gray-400 dark:text-gray-600',
            error && 'border-red-500 bg-red-50 focus-visible:ring-red-500/20',
            disabled && 'cursor-not-allowed opacity-50',
            className,
          )}
        >
          <span className="text-gray-700 dark:text-gray-700">
            {selected
              ? format(selected, 'dd MMM yyyy, hh:mm aa')
              : <span className="text-gray-400 dark:text-gray-600">{finalPlaceholder}</span>
            }
          </span>
          <span className="flex items-center gap-1 flex-shrink-0 text-gray-400 dark:text-gray-600">
            {selected && !disabled && (
              <span
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleClear(e as unknown as React.MouseEvent)}
                onClick={handleClear}
                className="hover:text-gray-700 dark:hover:text-gray-500 transition-colors"
                aria-label={t('common.clear')}
              >
                <X className="h-3 w-3" strokeWidth={1.75} />
              </span>
            )}
            <Calendar className="h-3.5 w-3.5" strokeWidth={1.75} />
          </span>
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          className="z-[60] bg-surface-card rounded-xl border border-border shadow-lg p-0 w-[280px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            month={month}
            onMonthChange={setMonth}
            captionLayout="dropdown"
            startMonth={new Date(2000, 0)}
            endMonth={new Date(2040, 11)}
            classNames={{
              root: 'p-3',
              months: 'relative',
              month: '',
              month_caption: 'flex items-center justify-between mb-3 px-1',
              caption_label: 'hidden',
              dropdowns: 'flex items-center gap-1.5',
              dropdown: cn(
                'appearance-none bg-surface-card border border-border rounded-md px-2 py-1 text-[13px] font-medium text-gray-700 dark:text-gray-700',
                'focus:outline-none focus:ring-[3px] focus:ring-primary-500/20 cursor-pointer',
              ),
              dropdown_root: 'relative',
              nav: 'flex items-center gap-1',
              button_previous: 'flex items-center justify-center h-7 w-7 rounded-md text-gray-500 dark:text-gray-600 hover:bg-surface-page dark:hover:bg-gray-700/60 hover:text-gray-900 dark:hover:text-gray-700 transition-colors',
              button_next: 'flex items-center justify-center h-7 w-7 rounded-md text-gray-500 dark:text-gray-600 hover:bg-surface-page dark:hover:bg-gray-700/60 hover:text-gray-900 dark:hover:text-gray-700 transition-colors',
              month_grid: 'w-full border-collapse',
              weekdays: '',
              weekday: 'w-9 h-8 text-[11px] font-medium text-gray-400 dark:text-gray-600 text-center',
              week: '',
              day: 'p-0',
              day_button: cn(
                'w-9 h-9 text-[13.5px] rounded-lg flex items-center justify-center mx-auto transition-colors text-gray-900 dark:text-gray-700',
                'hover:bg-primary-50 dark:hover:bg-primary-500/20 hover:text-primary-700 dark:hover:text-primary-400 focus:outline-none focus:ring-[3px] focus:ring-primary-500/20',
              ),
              selected: '[&>button]:bg-primary-600 [&>button]:text-white [&>button]:hover:bg-primary-700 dark:[&>button]:bg-primary-500 dark:[&>button]:text-white dark:[&>button]:hover:bg-primary-600',
              today: '[&>button]:font-semibold [&>button]:text-primary-600 dark:[&>button]:text-primary-400 [&:not(.rdp-selected)>button]:bg-primary-50 dark:[&:not(.rdp-selected)>button]:bg-primary-500/20',
              outside: '[&>button]:text-gray-300 dark:[&>button]:text-gray-500 [&>button]:hover:bg-surface-page dark:[&>button]:hover:bg-gray-700/60',
              disabled: '[&>button]:text-gray-200 dark:[&>button]:text-gray-500 [&>button]:pointer-events-none',
              hidden: 'invisible',
            }}
            components={{
              Chevron: ({ orientation }) =>
                orientation === 'left'
                  ? <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
                  : <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.75} />,
            }}
          />

          {/* Time picker */}
          <div className="border-t border-border px-3 py-2.5 flex items-center gap-2">
            <span className="text-[12px] text-gray-500 font-medium me-1">Time</span>
            <select
              value={hour}
              onChange={(e) => handleTimeChange(Number(e.target.value), minute)}
              className="appearance-none bg-surface-card border border-border rounded-md px-2 py-1 text-[13px] font-medium text-gray-700 focus:outline-none focus:ring-[3px] focus:ring-primary-500/20 cursor-pointer"
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, '0')}
                </option>
              ))}
            </select>
            <span className="text-gray-400 font-medium text-[13px]">:</span>
            <select
              value={minute}
              onChange={(e) => handleTimeChange(hour, Number(e.target.value))}
              className="appearance-none bg-surface-card border border-border rounded-md px-2 py-1 text-[13px] font-medium text-gray-700 focus:outline-none focus:ring-[3px] focus:ring-primary-500/20 cursor-pointer"
            >
              {MINUTES.map((m) => (
                <option key={m} value={m}>
                  {String(m).padStart(2, '0')}
                </option>
              ))}
            </select>
          </div>

          <div className="border-t border-border px-3 py-2.5 flex items-center justify-between">
            <button
              type="button"
              onClick={handleToday}
              className="text-[12px] font-medium text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 transition-colors px-2 py-1 rounded-md hover:bg-primary-50 dark:hover:bg-primary-500/20"
            >
              Now
            </button>
            {selected && (
              <span className="text-[12px] text-gray-400 dark:text-gray-600">
                {format(selected, 'dd MMM yyyy, hh:mm aa')}
              </span>
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
