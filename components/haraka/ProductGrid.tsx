'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useInventoryItems, useInventoryCategories } from '@/hooks/inventory';
import type { InventoryItem } from '@/types';

interface Props {
  onPick: (item: InventoryItem) => void;
}

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
      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <Input
          className="ps-8"
          placeholder="Scan barcode or search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Category pills */}
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

      {/* Product grid */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-[88px] rounded-lg bg-surface-inset animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400 gap-2">
            <Search size={24} />
            <span className="text-sm">No products in this category</span>
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
                  className="text-start rounded-xl border border-border bg-surface-card p-3 flex flex-col gap-1.5 min-h-[88px] transition-all hover:shadow-sm"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--mod-haraka)';
                    e.currentTarget.style.background = 'rgba(194,24,91,0.04)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '';
                    e.currentTarget.style.background = '';
                  }}
                >
                  <div className="text-sm font-semibold leading-tight line-clamp-2">{item.name}</div>
                  <div className="text-xs text-gray-400 truncate">
                    {item.sku ? `SKU ${item.sku}` : item.barcode ? item.barcode : item.category ?? ''}
                  </div>
                  <div className="mt-auto flex items-center justify-between">
                    <span className="text-xs text-gray-400">{item.quantityOnHand} {item.unit}</span>
                    <span className="text-sm font-bold font-mono" style={{ color: 'var(--mod-haraka)' }}>
                      {price.toFixed(2)}
                    </span>
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
