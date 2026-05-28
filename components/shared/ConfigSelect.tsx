'use client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useList } from '@/hooks/lists';
import { useT } from '@/hooks/ui';
import type { ListKey } from '@/types';

interface ConfigSelectProps {
  /** Which managed list to render (resolved from platform defaults + org). */
  listKey: ListKey;
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Render a leading "all" option (for table filters). */
  includeAll?: boolean;
  allLabel?: string;
  allValue?: string;
}

/**
 * Drop-in, config-driven replacement for hardcoded <Select> dropdowns.
 * Options come from the managed-lists system (migration 0008) via /api/lists.
 * Works with react-hook-form: pass field.value / field.onChange.
 */
export function ConfigSelect({
  listKey,
  value,
  onValueChange,
  placeholder = 'Select…',
  className,
  disabled,
  includeAll = false,
  allLabel = 'All',
  allValue = 'all',
}: ConfigSelectProps) {
  const { data: items = [], isLoading } = useList(listKey);
  const { locale } = useT();
  const isAr = locale === 'ar';

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={isLoading ? 'Loading…' : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {includeAll && <SelectItem value={allValue}>{allLabel}</SelectItem>}
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {isAr ? item.labelAr || item.label : item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
