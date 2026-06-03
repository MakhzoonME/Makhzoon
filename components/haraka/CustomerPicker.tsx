'use client';

import { useEffect, useState } from 'react';
import { Search, UserPlus, X, User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/ui';
import { useCustomers, useCreateCustomer } from '@/hooks/haraka';
import { CustomerForm } from '@/components/haraka/CustomerForm';
import { usePosCart } from '@/store/pos-cart.store';
import { toast, useT } from '@/hooks/ui';
import type { CustomerFormData } from '@/lib/modules/haraka/customers/schemas';
import type { PosCustomer } from '@/types';

/**
 * Inline customer attachment for the register. Shows the current customer or
 * an "Add customer" button; clicking opens a typeahead modal with search +
 * "+ New customer" inline-create. Writes the selection to the cart store via
 * `setCustomer`, which then flows into the completed sale.
 */
export function CustomerPicker() {
  const { t } = useT();
  const customer = usePosCart((s) => s.customer);
  const setCustomer = usePosCart((s) => s.setCustomer);
  const [open, setOpen] = useState(false);

  if (customer) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface-subtle px-2 py-1.5 text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <User size={14} className="text-gray-500 shrink-0" />
          <span className="truncate">{customer.name}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setOpen(true)}>
            Change
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            aria-label={t('common.remove')}
            onClick={() => setCustomer(null)}
          >
            <X size={12} />
          </Button>
          <CustomerPickerDialog open={open} onOpenChange={setOpen} />
        </div>
      </div>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full justify-start"
        onClick={() => setOpen(true)}
      >
        <UserPlus size={14} className="me-2" /> Add customer
      </Button>
      <CustomerPickerDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

function CustomerPickerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const setCustomer = usePosCart((s) => s.setCustomer);
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMode('search');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearch('');
    }
  }, [open]);

  function pick(c: PosCustomer) {
    setCustomer(c);
    onOpenChange(false);
  }

  async function handleCreate(values: CustomerFormData) {
    try {
      const { id } = await createMut.mutateAsync(values);
      setCustomer({
        id,
        organizationId: '',
        name: values.name,
        phone: values.phone ?? null,
        email: values.email ?? null,
        taxNumber: values.taxNumber ?? null,
        notes: values.notes ?? null,
        createdAt: new Date(),
        createdBy: '',
        updatedAt: new Date(),
        updatedBy: '',
      });
      toast.success('Customer created');
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'new' ? 'New customer' : 'Attach customer'}</DialogTitle>
        </DialogHeader>

        {mode === 'search' ? (
          <div className="space-y-3">
            <div className="relative">
              <span className="absolute start-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <Search size={14} />
              </span>
              <Input
                autoFocus
                className="ps-8"
                placeholder="Search by name, phone, email, tax #"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="max-h-80 overflow-y-auto rounded-md border border-border divide-y divide-border">
              {isLoading ? (
                <div className="p-4 text-sm text-gray-500">Loading…</div>
              ) : (data?.items ?? []).length === 0 ? (
                <div className="p-4 text-sm text-gray-500">
                  {debounced
                    ? 'No matches. Create a new customer below.'
                    : 'No customers yet — create one to attach to this sale.'}
                </div>
              ) : (
                (data?.items ?? []).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => pick(c)}
                    className="w-full text-start px-3 py-2 hover:bg-surface-subtle"
                  >
                    <div className="text-sm font-medium">{c.name}</div>
                    <div className="text-xs text-gray-500">
                      {[c.phone, c.email, c.taxNumber].filter(Boolean).join(' · ') || '—'}
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMode('new')}
              >
                <UserPlus size={14} className="me-1" /> New customer
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <CustomerForm
            initial={{ name: search.trim() || '' }}
            submitLabel="Create & attach"
            loading={createMut.isPending}
            onSubmit={handleCreate}
            onCancel={() => setMode('search')}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
