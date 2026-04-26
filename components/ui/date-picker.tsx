'use client';
import { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { format, parse, isValid, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils/cn';

function CalendarSVG() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="1.5" y="2.5" width="13" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <path d="M1.5 6.5h13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M5 1v3M11 1v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
function ChevronLeftSVG() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ChevronRightSVG() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface DatePickerProps {
  value?: string;        // expects "yyyy-MM-dd" or empty string
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function DatePicker({ value, onChange, placeholder = 'Pick a date', className, disabled }: DatePickerProps) {
  const [open, setOpen] = useState(false);

  const parsed = value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined;
  const selected = parsed && isValid(parsed) ? parsed : undefined;

  const [month, setMonth] = useState<Date>(selected ?? new Date());

  function handleSelect(date: Date | undefined) {
    if (!date) return;
    onChange?.(format(date, 'yyyy-MM-dd'));
    setOpen(false);
  }

  function handleToday() {
    const today = startOfDay(new Date());
    onChange?.(format(today, 'yyyy-MM-dd'));
    setMonth(today);
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
            'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-3 py-1 text-sm shadow-xs transition-colors',
            'hover:border-gray-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400',
            !selected && 'text-gray-400',
            disabled && 'cursor-not-allowed opacity-50',
            className,
          )}
        >
          <span>{selected ? format(selected, 'dd MMM yyyy') : placeholder}</span>
          <span className="flex items-center gap-1 flex-shrink-0 text-gray-400">
            {selected && !disabled && (
              <span
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleClear(e as unknown as React.MouseEvent)}
                onClick={handleClear}
                className="hover:text-gray-700 transition-colors"
                aria-label="Clear date"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                  <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </span>
            )}
            <CalendarSVG />
          </span>
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          className="z-[60] bg-white rounded-xl border border-gray-200 shadow-lg p-0 w-[280px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
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
                'appearance-none bg-white border border-gray-200 rounded-md px-2 py-1 text-sm font-medium text-gray-700',
                'focus:outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer',
              ),
              dropdown_root: 'relative',
              nav: 'flex items-center gap-1',
              button_previous: cn(
                'flex items-center justify-center h-7 w-7 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors',
              ),
              button_next: cn(
                'flex items-center justify-center h-7 w-7 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors',
              ),
              month_grid: 'w-full border-collapse',
              weekdays: '',
              weekday: 'w-9 h-8 text-[11px] font-medium text-gray-400 text-center',
              week: '',
              day: 'p-0',
              day_button: cn(
                'w-9 h-9 text-sm rounded-lg flex items-center justify-center mx-auto transition-colors',
                'hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-1 focus:ring-indigo-400',
              ),
              selected: '[&>button]:bg-indigo-600 [&>button]:text-white [&>button]:hover:bg-indigo-700',
              today: '[&>button]:font-semibold [&>button]:text-indigo-600 [&:not(.rdp-selected)>button]:bg-indigo-50',
              outside: '[&>button]:text-gray-300 [&>button]:hover:bg-gray-50',
              disabled: '[&>button]:text-gray-200 [&>button]:pointer-events-none',
              hidden: 'invisible',
            }}
            components={{
              Chevron: ({ orientation }) =>
                orientation === 'left' ? <ChevronLeftSVG /> : <ChevronRightSVG />,
            }}
          />

          {/* Footer */}
          <div className="border-t border-gray-100 px-3 py-2.5 flex items-center justify-between">
            <button
              type="button"
              onClick={handleToday}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors px-2 py-1 rounded-md hover:bg-indigo-50"
            >
              Today
            </button>
            {selected && (
              <span className="text-xs text-gray-400">{format(selected, 'EEEE, dd MMM yyyy')}</span>
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
