'use client';

import { useState, useMemo } from 'react';
import { CheckSquare, Square, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useInventoryItems } from '@/hooks/inventory';
import { useDebounce, useT } from '@/hooks/ui';
import type { InventoryItem } from '@/types';
import { cn } from '@/lib/utils/cn';

interface Props {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

/**
 * Inline (non-popover) multi-select inventory picker used by the new stock
 * audit page. Lists items in a scrollable panel, search-debounces against
 * /api/inventory, and surfaces selected items as removable chips above.
 */
export function StockItemMultiPicker({ selectedIds, onChange }: Props) {
  const { t } = useT();
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 250);

  const { data, isLoading } = useInventoryItems({
    search: debounced || undefined,
    pageSize: 100,
  });
  const items: InventoryItem[] = data?.items ?? [];
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  // Selected items that might not be in the current page — keep a map for chips
  const [selectedDetail, setSelectedDetail] = useState<Record<string, InventoryItem>>({});

  function toggle(item: InventoryItem) {
    const next = new Set(selectedSet);
    if (next.has(item.id)) {
      next.delete(item.id);
    } else {
      next.add(item.id);
      setSelectedDetail((prev) => ({ ...prev, [item.id]: item }));
    }
    onChange(Array.from(next));
  }

  function removeId(id: string) {
    const next = new Set(selectedSet);
    next.delete(id);
    onChange(Array.from(next));
  }

  function selectAllShown() {
    const next = new Set(selectedSet);
    const detail = { ...selectedDetail };
    for (const it of items) {
      next.add(it.id);
      detail[it.id] = it;
    }
    setSelectedDetail(detail);
    onChange(Array.from(next));
  }

  function clearAll() {
    onChange([]);
  }

  const chips = selectedIds.map((id) => {
    const it = selectedDetail[id] ?? items.find((i) => i.id === id);
    return { id, label: it?.name ?? id, sku: it?.sku };
  });

  return (
    <div className="space-y-3">
      {/* Selected chips */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-gray-700">
          {t('stockAudits.itemsSelected').replace('{count}', String(selectedIds.length))}
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={selectAllShown}
            disabled={items.length === 0}
            className="h-7 text-xs"
          >
            {t('stockAudits.selectAllShown')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={clearAll}
            disabled={selectedIds.length === 0}
            className="h-7 text-xs"
          >
            {t('stockAudits.clearSelection')}
          </Button>
        </div>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-1 rounded-full bg-primary-50 text-primary-700 text-xs px-2 py-0.5 border border-primary-100"
            >
              {c.label}
              <button
                type="button"
                onClick={() => removeId(c.id)}
                aria-label="remove"
                className="opacity-70 hover:opacity-100"
              >
                <X className="h-3 w-3" strokeWidth={2} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute start-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('stockAudits.searchInventory')}
          className="ps-8 h-9 text-sm"
        />
      </div>

      {/* List */}
      <div className="rounded-lg border border-border bg-surface-card max-h-72 overflow-y-auto">
        {isLoading ? (
          <p className="text-xs text-gray-500 px-3 py-4">{t('common.loading')}</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-gray-500 px-3 py-4">{t('stockAudits.noItemsFound')}</p>
        ) : (
          <ul>
            {items.map((it) => {
              const active = selectedSet.has(it.id);
              return (
                <li key={it.id}>
                  <button
                    type="button"
                    onClick={() => toggle(it)}
                    className={cn(
                      'w-full text-start flex items-center gap-2 px-3 py-2 hover:bg-surface-page focus:outline-none focus:bg-surface-page border-b border-border last:border-0',
                      active && 'bg-primary-50/50',
                    )}
                  >
                    {active ? (
                      <CheckSquare className="h-4 w-4 text-primary-600 flex-shrink-0" strokeWidth={1.75} />
                    ) : (
                      <Square className="h-4 w-4 text-gray-400 flex-shrink-0" strokeWidth={1.75} />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 truncate">{it.name}</div>
                      <div className="text-[11px] text-gray-500 flex gap-2 truncate">
                        {it.sku && <span className="font-mono">{it.sku}</span>}
                        {it.category && <span>{it.category}</span>}
                        {it.location && <span>{it.location}</span>}
                        <span className="ms-auto tabular-nums">
                          {it.quantityOnHand} {it.unit}
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
