'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useInventoryItems, useInventoryCategories } from '@/hooks/inventory';
import type { InventoryItem } from '@/types';

interface Props {
  onPick: (item: InventoryItem) => void;
}

/**
 * Tiled product grid for the POS register. Shows only items with posEnabled=true
 * and quantityOnHand > 0. Category tabs filter; the search box does a name/SKU
 * substring match.
 */
export function ProductGrid({ onPick }: Props) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const { data, isLoading } = useInventoryItems({ posEnabled: true, pageSize: 200 });
  const { data: categories = [] } = useInventoryCategories();

  const items = useMemo(() => {
    let result = data?.items ?? [];
    if (category !== 'all') result = result.filter((i) => i.category === category);
    if (search) {
      const term = search.toLowerCase();
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(term) ||
          (i.sku ?? '').toLowerCase().includes(term) ||
          (i.barcode ?? '').toLowerCase().includes(term),
      );
    }
    return result.filter((i) => i.quantityOnHand > 0);
  }, [data?.items, category, search]);

  return (
    <div className="flex flex-col gap-3 h-full min-h-0">
      <div className="relative">
        <span className="absolute start-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          <Search size={14} />
        </span>
        <Input
          className="ps-8"
          placeholder="Search products by name, SKU, or barcode…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {['all', ...categories].map((c) => {
          const active = category === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className="px-3 py-1 rounded-full text-xs font-semibold border transition-colors"
              style={
                active
                  ? { background: 'var(--mod-haraka)', color: '#fff', borderColor: 'var(--mod-haraka)' }
                  : { background: 'var(--surface-card)', color: 'var(--text-secondary)', borderColor: 'var(--border-default)' }
              }
            >
              {c === 'all' ? 'All' : c}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 -me-1 pe-1">
        {isLoading ? (
          <div className="h-32 flex items-center justify-center text-gray-500 text-sm">Loading…</div>
        ) : items.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-gray-500 text-sm">
            No products available in this category.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {items.map((item) => {
              const price = item.posPrice ?? item.unitCost ?? 0;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onPick(item)}
                  className="text-start rounded-lg border border-border bg-surface-page transition-colors p-3 flex flex-col gap-1 min-h-[88px]"
                  style={{ ['--tw-border-opacity' as string]: '1' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--mod-haraka)'; e.currentTarget.style.background = 'rgba(194,24,91,0.05)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.background = ''; }}
                >
                  <div className="text-sm font-medium line-clamp-2">{item.name}</div>
                  <div className="text-xs text-gray-500 truncate">
                    {item.sku ? `SKU ${item.sku}` : item.barcode ? `📷 ${item.barcode}` : item.category}
                  </div>
                  <div className="mt-auto flex items-center justify-between text-xs">
                    <span className="text-gray-500">{item.quantityOnHand} {item.unit}</span>
                    <span className="font-mono font-semibold" style={{ color: 'var(--mod-haraka)' }}>{price.toFixed(2)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
