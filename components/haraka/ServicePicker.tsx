'use client';

import { useState } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Wrench, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useServices } from '@/hooks/haraka';
import { useDebounce, useT } from '@/hooks/ui';
import type { HarakaService } from '@/types';

interface Props {
  onPick: (service: HarakaService) => void;
  label?: string;
  disabled?: boolean;
}

/** Searchable popover for picking an entry from the POS Services catalog —
 *  used to prefill a free-text line (Service Jobs) or an amount (Retainers)
 *  without linking to the catalog by FK. */
export function ServicePicker({ onPick, label, disabled }: Props) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 250);

  const { data, isLoading } = useServices({ search: debounced || undefined, active: true, pageSize: 50 });
  const services = data?.items ?? [];

  function handlePick(service: HarakaService) {
    onPick(service);
    setOpen(false);
    setSearch('');
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={(o) => { if (!disabled) setOpen(o); }}>
      <PopoverPrimitive.Trigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={disabled} className="shrink-0">
          <Wrench size={14} className="me-1" />
          {label ?? t('serviceLine.pickFromCatalog')}
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
              placeholder={t('serviceLine.searchCatalog')}
              className="ps-8 h-8 text-sm"
            />
          </div>

          <div className="max-h-72 overflow-y-auto">
            {isLoading ? (
              <p className="text-xs text-gray-500 px-2 py-3">{t('common.loading')}</p>
            ) : services.length === 0 ? (
              <p className="text-xs text-gray-500 px-2 py-3">{t('serviceLine.noServicesFound')}</p>
            ) : (
              <ul className="space-y-0.5">
                {services.map((svc) => (
                  <li key={svc.id}>
                    <button
                      type="button"
                      onClick={() => handlePick(svc)}
                      className="w-full text-start px-2 py-1.5 rounded text-sm hover:bg-surface-page focus:outline-none focus:bg-surface-page"
                    >
                      <div className="font-medium truncate">{svc.name}</div>
                      <div className="text-[11px] text-gray-500 flex gap-2 truncate">
                        {svc.category && <span>{svc.category}</span>}
                        <span className="ms-auto font-mono">{svc.price.toFixed(2)}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
