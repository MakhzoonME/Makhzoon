'use client';

import { useEffect, useState } from 'react';
import { Search, UserPlus, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
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
      <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-inset px-3 py-2 text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="h-6 w-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: 'var(--mod-haraka)' }}
          >
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <span className="truncate font-medium text-gray-800">{customer.name}</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            className="text-xs text-gray-400 hover:text-gray-600 px-1.5 py-0.5 rounded transition-colors"
            onClick={() => setOpen(true)}
          >
            Change
          </button>
          <button
            type="button"
            className="p-1 text-gray-300 hover:text-red-500 rounded transition-colors"
            aria-label={t('common.remove')}
            onClick={() => setCustomer(null)}
          >
            <X size={13} />
          </button>
        </div>
        <CustomerPickerDialog open={open} onOpenChange={setOpen} />
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border text-sm text-gray-400 hover:border-gray-300 hover:text-gray-600 transition-colors"
        onClick={() => setOpen(true)}
      >
        <UserPlus size={14} className="flex-shrink-0" />
        <span>Add customer (optional)</span>
      </button>
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
          {mode === 'search' && (
            <p className="text-sm text-gray-500 mt-0.5">
              Search your customer list or create a new one.
            </p>
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
                      className="w-full text-start px-4 py-3 hover:bg-surface-inset transition-colors"
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
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </>
        ) : (
          <DialogBody>
            <CustomerForm
              initial={{ name: search.trim() || '' }}
              submitLabel="Create & attach"
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
