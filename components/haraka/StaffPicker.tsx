'use client';

import { useMemo, useState } from 'react';
import { Search, ChevronDown, X, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useStaff } from '@/hooks/haraka';
import { cn } from '@/lib/utils/cn';
import type { StaffCapability } from '@/types';

interface Props {
  value: string | null;
  onChange: (staffId: string | null, name: string | null) => void;
  /** Narrows the list to one role — 'appointment_provider' for bookings. */
  capability?: StaffCapability;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
}

/**
 * Picks one person out of the shared staff directory. `capability` is what
 * makes this reusable across modules: deliveries pass 'delivery', appointments
 * pass 'appointment_provider', and each sees only staff tagged for it.
 */
export function StaffPicker({
  value,
  onChange,
  capability,
  placeholder = 'Select worker',
  emptyMessage = 'No workers found.',
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data } = useStaff({ onlyActive: true, capability });
  const staff = useMemo(() => data?.items ?? [], [data]);
  const selected = staff.find((s) => s.id === value) ?? null;

  const q = search.toLowerCase();
  const filtered = staff.filter((s) => s.name.toLowerCase().includes(q));

  return (
    <Popover open={open} onOpenChange={(o) => { if (!disabled) setOpen(o); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-border bg-surface-card px-3 text-[14px] transition-colors',
            'hover:border-gray-300 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-500/20 focus-visible:border-primary-600',
            'disabled:cursor-not-allowed disabled:opacity-60',
            selected ? 'text-gray-900' : 'text-gray-400',
          )}
        >
          <span className="flex items-center gap-2 truncate min-w-0">
            <Users className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" strokeWidth={1.75} />
            <span className="truncate">{selected ? selected.name : placeholder}</span>
          </span>
          <span className="flex items-center gap-1 flex-shrink-0 text-gray-400">
            {selected && (
              <span
                role="button"
                tabIndex={0}
                aria-label="Clear selection"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onChange(null, null); } }}
                onClick={(e) => { e.stopPropagation(); onChange(null, null); }}
                className="hover:text-gray-700 transition-colors"
              >
                <X className="h-3 w-3" strokeWidth={1.75} />
              </span>
            )}
            <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.75} />
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-72 p-0 bg-surface-card border border-border shadow-lg rounded-xl"
        align="start"
      >
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute start-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
            <Input
              placeholder="Search…"
              className="ps-8 h-8 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-sm text-center text-gray-400">{emptyMessage}</p>
          ) : (
            filtered.map((s) => (
              <button
                key={s.id}
                type="button"
                className="w-full text-start px-3 py-2 text-sm text-gray-700 hover:bg-surface-page rounded transition-colors"
                onClick={() => {
                  onChange(s.id, s.name);
                  setOpen(false);
                  setSearch('');
                }}
              >
                <div className="truncate">{s.name}</div>
                {s.phone && <div className="text-[11px] text-gray-400 truncate">{s.phone}</div>}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
