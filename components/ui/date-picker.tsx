'use client';
import { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { format, parse, isValid, startOfDay } from 'date-fns';
import { Calendar, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface DatePickerProps {
  value?: string;        // expects "yyyy-MM-dd" or empty string
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: boolean;
}

export function DatePicker({ value, onChange, placeholder = 'Pick a date', className, disabled, error }: DatePickerProps) {
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
            'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-border bg-surface-card px-3 text-[14px] transition-colors',
            'hover:border-gray-300 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-500/20 focus-visible:border-primary-600',
            !selected && 'text-gray-400',
            error && 'border-red-500 bg-red-50 focus-visible:ring-red-500/20',
            disabled && 'cursor-not-allowed opacity-50',
            className,
          )}
        >
          <span className="text-gray-700">{selected ? format(selected, 'dd MMM yyyy') : <span className="text-gray-400">{placeholder}</span>}</span>
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
                'appearance-none bg-surface-card border border-border rounded-md px-2 py-1 text-[13px] font-medium text-gray-700',
                'focus:outline-none focus:ring-[3px] focus:ring-primary-500/20 cursor-pointer',
              ),
              dropdown_root: 'relative',
              nav: 'flex items-center gap-1',
              button_previous: 'flex items-center justify-center h-7 w-7 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors',
              button_next: 'flex items-center justify-center h-7 w-7 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors',
              month_grid: 'w-full border-collapse',
              weekdays: '',
              weekday: 'w-9 h-8 text-[11px] font-medium text-gray-400 text-center',
              week: '',
              day: 'p-0',
              day_button: cn(
                'w-9 h-9 text-[13.5px] rounded-lg flex items-center justify-center mx-auto transition-colors',
                'hover:bg-primary-50 hover:text-primary-700 focus:outline-none focus:ring-[3px] focus:ring-primary-500/20',
              ),
              selected: '[&>button]:bg-primary-600 [&>button]:text-white [&>button]:hover:bg-primary-700',
              today: '[&>button]:font-semibold [&>button]:text-primary-600 [&:not(.rdp-selected)>button]:bg-primary-50',
              outside: '[&>button]:text-gray-300 [&>button]:hover:bg-gray-50',
              disabled: '[&>button]:text-gray-200 [&>button]:pointer-events-none',
              hidden: 'invisible',
            }}
            components={{
              Chevron: ({ orientation }) =>
                orientation === 'left'
                  ? <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
                  : <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.75} />,
            }}
          />

          <div className="border-t border-border px-3 py-2.5 flex items-center justify-between">
            <button
              type="button"
              onClick={handleToday}
              className="text-[12px] font-medium text-primary-600 hover:text-primary-800 transition-colors px-2 py-1 rounded-md hover:bg-primary-50"
            >
              Today
            </button>
            {selected && (
              <span className="text-[12px] text-gray-400">{format(selected, 'EEEE, dd MMM yyyy')}</span>
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
