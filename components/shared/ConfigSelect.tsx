'use client';
import { Combobox } from '@/components/ui/combobox';
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

  const options = [
    ...(includeAll ? [{ value: allValue, label: allLabel }] : []),
    ...items.map((item) => ({ value: item.value, label: isAr ? item.labelAr || item.label : item.label })),
  ];

  return (
    <Combobox
      value={value ?? null}
      onChange={(v) => onValueChange?.(v ?? '')}
      options={options}
      placeholder={isLoading ? 'Loading…' : placeholder}
      disabled={disabled}
      className={className}
      clearable={false}
    />
  );
}
