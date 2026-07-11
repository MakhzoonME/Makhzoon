'use client';

import { useEffect, useState } from 'react';
import { Search, UserPlus, X, User } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/ui';
import { useCustomers, useCreateCustomer } from '@/hooks/haraka';
import { CustomerForm } from '@/components/haraka/CustomerForm';
import { toast } from '@/hooks/ui';
import { cn } from '@/lib/utils/cn';
import type { CustomerFormData } from '@/lib/modules/haraka/customers/schemas';
import type { PosCustomer } from '@/types';

export interface SelectedCustomer {
  id: string;
  name: string;
  phone: string | null;
  email?: string | null;
}

interface Props {
  value: SelectedCustomer | null;
  onChange: (v: SelectedCustomer | null) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
}

export function CustomerSelect({ value, onChange, placeholder = 'Search or add a customer', disabled, error }: Props) {
  const [open, setOpen] = useState(false);

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(null);
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(true)}
        className={cn(
          'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-border bg-surface-card px-3 text-[14px] transition-colors',
          'hover:border-gray-300 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-500/20 focus-visible:border-primary-600',
          !value && 'text-gray-400',
          error && 'border-red-500 bg-red-50 focus-visible:ring-red-500/20',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <span className="flex items-center gap-2 min-w-0 truncate">
          {value ? (
            <>
              <User className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" strokeWidth={1.75} />
              <span className="truncate text-gray-700 font-medium">{value.name}</span>
              {value.phone && (
                <span className="text-gray-400 text-xs flex-shrink-0">{value.phone}</span>
              )}
            </>
          ) : (
            <span>{placeholder}</span>
          )}
        </span>
        <span className="flex items-center gap-1 flex-shrink-0 text-gray-400">
          {value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleClear(e as unknown as React.MouseEvent)}
              onClick={handleClear}
              className="hover:text-gray-700 transition-colors"
              aria-label="Clear customer"
            >
              <X className="h-3 w-3" strokeWidth={1.75} />
            </span>
          )}
          <UserPlus className="h-3.5 w-3.5" strokeWidth={1.75} />
        </span>
      </button>

      <CustomerSelectDialog
        open={open}
        onOpenChange={setOpen}
        onSelect={(c) => { onChange(c); setOpen(false); }}
      />
    </>
  );
}

function CustomerSelectDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect: (c: SelectedCustomer) => void;
}) {
  const [mode, setMode] = useState<'search' | 'new'>('search');
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 200);
  const createMut = useCreateCustomer();

  const { data, isLoading } = useCustomers({
    search: debounced || undefined,
    pageSize: 20,
    enabled: open && mode === 'search',
  });

  useEffect(() => {
    if (open) {
      setMode('search');
      setSearch('');
    }
  }, [open]);

  function pick(c: PosCustomer) {
    onSelect({ id: c.id, name: c.name, phone: c.phone, email: c.email });
  }

  async function handleCreate(values: CustomerFormData) {
    try {
      const { id } = await createMut.mutateAsync(values);
      onSelect({ id, name: values.name, phone: values.phone ?? null, email: values.email ?? null });
      toast.success('Customer created');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'new' ? 'New customer' : 'Select customer'}</DialogTitle>
          {mode === 'search' && (
            <p className="text-sm text-gray-500 mt-0.5">Search your customer list or create a new one.</p>
          )}
        </DialogHeader>

        {mode === 'search' ? (
          <>
            <DialogBody className="space-y-3">
              <div className="relative">
                <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <Input
                  autoFocus
                  className="ps-9"
                  placeholder="Name, phone, email, or tax number"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="overflow-y-auto rounded-lg border border-border divide-y divide-border" style={{ maxHeight: '18rem' }}>
                {isLoading ? (
                  <div className="px-4 py-5 text-sm text-gray-500 text-center">Loading…</div>
                ) : (data?.items ?? []).length === 0 ? (
                  <div className="px-4 py-5 text-sm text-gray-500 text-center">
                    {debounced ? 'No matches — create a new customer below.' : 'No customers yet.'}
                  </div>
                ) : (
                  (data?.items ?? []).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => pick(c)}
                      className="w-full text-start px-4 py-3 hover:bg-surface-page transition-colors"
                    >
                      <div className="text-sm font-medium text-gray-900">{c.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {[c.phone, c.email, c.taxNumber].filter(Boolean).join(' · ') || '—'}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setMode('new')}>
                <UserPlus size={14} className="me-1" /> New customer
              </Button>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            </DialogFooter>
          </>
        ) : (
          <DialogBody>
            <CustomerForm
              initial={{ name: search.trim() || '' }}
              submitLabel="Create & select"
              loading={createMut.isPending}
              onSubmit={handleCreate}
              onCancel={() => setMode('search')}
            />
          </DialogBody>
        )}
      </DialogContent>
    </Dialog>
  );
}
