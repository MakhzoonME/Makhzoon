'use client';

import { useState } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Package, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useInventoryItems } from '@/hooks/inventory';
import { useDebounce, useT } from '@/hooks/ui';
import type { InventoryItem } from '@/types';

interface Props {
  onPick: (item: InventoryItem) => void;
  selectedItemId?: string | null;
  label?: string;
  disabled?: boolean;
}

/** Searchable popover for picking an existing inventory item. Used on each
 *  purchase line so manually-added lines can be "resolved" to a real item
 *  (which unblocks the Receive action). */
export function InventoryItemPicker({ onPick, selectedItemId, label, disabled }: Props) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 250);

  const { data, isLoading } = useInventoryItems({
    search: debounced || undefined,
    pageSize: 50,
  });
  const items = data?.items ?? [];

  function handlePick(item: InventoryItem) {
    onPick(item);
    setOpen(false);
    setSearch('');
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={(o) => { if (!disabled) setOpen(o); }}>
      <PopoverPrimitive.Trigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          aria-label={label ?? t('purchases.pickItem')}
          title={label ?? t('purchases.pickItem')}
          className="shrink-0"
        >
          <Package size={14} className="me-1" />
          {selectedItemId ? t('purchases.changeItem') : t('purchases.pickItem')}
        </Button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          className="z-50 w-[320px] rounded-lg border border-border bg-surface-card shadow-lg p-2"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="relative mb-2">
            <Search className="absolute start-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('purchases.searchInventory')}
              className="ps-8 h-8 text-sm"
            />
          </div>

          <div className="max-h-72 overflow-y-auto">
            {isLoading ? (
              <p className="text-xs text-gray-500 px-2 py-3">{t('common.loading')}</p>
            ) : items.length === 0 ? (
              <p className="text-xs text-gray-500 px-2 py-3">{t('purchases.noItemsFound')}</p>
            ) : (
              <ul className="space-y-0.5">
                {items.map((it) => {
                  const active = it.id === selectedItemId;
                  return (
                    <li key={it.id}>
                      <button
                        type="button"
                        onClick={() => handlePick(it)}
                        className={`w-full text-start px-2 py-1.5 rounded text-sm hover:bg-surface-page focus:outline-none focus:bg-surface-page ${active ? 'bg-primary-50 text-primary-700' : ''}`}
                      >
                        <div className="font-medium truncate">{it.name}</div>
                        <div className="text-[11px] text-gray-500 flex gap-2 truncate">
                          {it.sku && <span className="font-mono">{it.sku}</span>}
                          {it.category && <span>{it.category}</span>}
                          {it.unitCost != null && <span className="ms-auto">{it.unitCost}</span>}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
