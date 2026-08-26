'use client';
import { useState } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { format, parse, isValid } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils/cn';
import { useT } from '@/hooks/ui';

interface DateRangePickerProps {
  startDate?: string;   // "yyyy-MM-dd" or empty string
  endDate?: string;     // "yyyy-MM-dd" or empty string
  onChange?: (range: { startDate: string; endDate: string }) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: boolean;
}

function parseDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const parsed = parse(value, 'yyyy-MM-dd', new Date());
  return isValid(parsed) ? parsed : undefined;
}

export function DateRangePicker({ startDate, endDate, onChange, placeholder, className, disabled, error }: DateRangePickerProps) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const finalPlaceholder = placeholder ?? t('common.pickDate');

  const from = parseDate(startDate);
  const to = parseDate(endDate);
  const range: DateRange | undefined = from ? { from, to } : undefined;

  const [month, setMonth] = useState<Date>(from ?? new Date());

  function handleSelect(next: DateRange | undefined) {
    onChange?.({
      startDate: next?.from ? format(next.from, 'yyyy-MM-dd') : '',
      endDate: next?.to ? format(next.to, 'yyyy-MM-dd') : '',
    });
  }

  const label = from
    ? `${format(from, 'dd MMM yyyy')} – ${to ? format(to, 'dd MMM yyyy') : '…'}`
    : finalPlaceholder;

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={(o) => { if (!disabled) setOpen(o); }}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-border bg-surface-card px-3 text-[14px] transition-colors text-gray-900 dark:text-gray-700',
            'hover:border-gray-300 dark:hover:border-gray-500 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-500/20 focus-visible:border-primary-600',
            !from && 'text-gray-400 dark:text-gray-600',
            error && 'border-red-500 bg-red-50 focus-visible:ring-red-500/20',
            disabled && 'cursor-not-allowed opacity-50',
            className,
          )}
        >
          <span className="text-gray-700 dark:text-gray-700 truncate">{label}</span>
          <CalendarIcon className="h-3.5 w-3.5 flex-shrink-0 text-gray-400 dark:text-gray-600" strokeWidth={1.75} />
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          className="z-[60] bg-surface-card rounded-xl border border-border shadow-lg p-0 w-fit data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <Calendar
            mode="range"
            selected={range}
            onSelect={handleSelect}
            month={month}
            onMonthChange={setMonth}
            captionLayout="dropdown"
            startMonth={new Date(2000, 0)}
            endMonth={new Date(2040, 11)}
            className="p-3"
          />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
