'use client';

import * as React from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils/cn';

export interface ComboboxOption {
  value: string;
  /** Usually plain text; pass a node for richer content (e.g. an icon + colored text). */
  label: React.ReactNode;
  /** Secondary line under the label, e.g. a phone number. */
  sublabel?: string;
  /** Optional section header this option is grouped under. */
  group?: string;
  /** Text used for search filtering when `label` isn't a plain string. */
  searchText?: string;
}

const SEARCH_THRESHOLD = 8;

interface ComboboxProps {
  value: string | null;
  onChange: (value: string | null) => void;
  options: ComboboxOption[];
  placeholder?: string;
  emptyMessage?: string;
  searchPlaceholder?: string;
  /** Explicit override; defaults to showing search only past SEARCH_THRESHOLD options. */
  searchable?: boolean;
  /** Show the clear ("x") control when a value is selected. Default true. */
  clearable?: boolean;
  disabled?: boolean;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
  className?: string;
  id?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

/**
 * Shared searchable dropdown: trigger button + popover with an optional search
 * box and a scrollable, optionally grouped option list. The search box is only
 * rendered when `searchable` (or the option-count default) says it's worth it —
 * a 4-option status filter doesn't need one, a 200-org list does.
 */
export const Combobox = React.forwardRef<HTMLButtonElement, ComboboxProps>(function Combobox(
  {
    value,
    onChange,
    options,
    placeholder = 'Select…',
    emptyMessage = 'No options found.',
    searchPlaceholder = 'Search…',
    searchable,
    clearable = true,
    disabled,
    icon: Icon,
    className,
    id,
    'aria-invalid': ariaInvalid,
    'aria-describedby': ariaDescribedby,
  },
  ref,
) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const showSearch = searchable ?? options.length > SEARCH_THRESHOLD;
  const selected = options.find((o) => o.value === value) ?? null;

  const q = search.toLowerCase();
  const filtered = showSearch
    ? options.filter((o) => (o.searchText ?? (typeof o.label === 'string' ? o.label : '')).toLowerCase().includes(q))
    : options;

  const groups = React.useMemo(() => {
    const map = new Map<string | undefined, ComboboxOption[]>();
    for (const opt of filtered) {
      const key = opt.group;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(opt);
    }
    return Array.from(map.entries());
  }, [filtered]);

  function select(opt: ComboboxOption) {
    onChange(opt.value);
    setOpen(false);
    setSearch('');
  }

  return (
    <Popover open={open} onOpenChange={(o) => { if (!disabled) setOpen(o); }}>
      <PopoverTrigger asChild>
        <button
          ref={ref}
          id={id}
          type="button"
          disabled={disabled}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedby}
          className={cn(
            'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-border bg-surface-card px-3 text-[14px] transition-colors',
            'hover:border-gray-300 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-500/20 focus-visible:border-primary-600',
            'disabled:cursor-not-allowed disabled:opacity-60',
            selected ? 'text-gray-900' : 'text-gray-400',
            className,
          )}
        >
          <span className="flex items-center gap-2 truncate min-w-0">
            {Icon && <Icon className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" strokeWidth={1.75} />}
            <span className="truncate">{selected ? selected.label : placeholder}</span>
          </span>
          <span className="flex items-center gap-1 flex-shrink-0 text-gray-400">
            {clearable && selected && (
              <span
                role="button"
                tabIndex={0}
                aria-label="Clear selection"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onChange(null); } }}
                onClick={(e) => { e.stopPropagation(); onChange(null); }}
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
        {showSearch && (
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute start-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <Input
                placeholder={searchPlaceholder}
                className="ps-8 h-8 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>
          </div>
        )}
        <div className="max-h-64 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-sm text-center text-gray-400">{emptyMessage}</p>
          ) : (
            groups.map(([group, opts]) => (
              <div key={group ?? '__ungrouped'}>
                {group && (
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    {group}
                  </div>
                )}
                {opts.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className="w-full text-start px-3 py-2 text-sm text-gray-700 hover:bg-surface-page rounded transition-colors"
                    onClick={() => select(opt)}
                  >
                    <div className="truncate">{opt.label}</div>
                    {opt.sublabel && <div className="text-[11px] text-gray-400 truncate">{opt.sublabel}</div>}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
});
