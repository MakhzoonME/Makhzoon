'use client';

import { useMemo } from 'react';
import { Users } from 'lucide-react';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { useStaff } from '@/hooks/haraka';
import type { StaffCapability } from '@/types';

interface Props {
  value: string | null;
  onChange: (staffId: string | null, name: string | null) => void;
  /** Narrows the list to one role — 'appointment_provider' for bookings. */
  capability?: StaffCapability;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
}

/**
 * Picks one person out of the shared staff directory. `capability` is what
 * makes this reusable across modules: deliveries pass 'delivery', appointments
 * pass 'appointment_provider', and each sees only staff tagged for it.
 */
export function StaffPicker({
  value,
  onChange,
  capability,
  placeholder = 'Select worker',
  emptyMessage = 'No workers found.',
  disabled,
}: Props) {
  const { data } = useStaff({ onlyActive: true, capability });
  const staff = useMemo(() => data?.items ?? [], [data]);

  const options: ComboboxOption[] = useMemo(
    () => staff.map((s) => ({ value: s.id, label: s.name, sublabel: s.phone ?? undefined })),
    [staff],
  );

  return (
    <Combobox
      value={value}
      onChange={(id) => {
        const s = staff.find((s) => s.id === id) ?? null;
        onChange(s?.id ?? null, s?.name ?? null);
      }}
      options={options}
      placeholder={placeholder}
      emptyMessage={emptyMessage}
      disabled={disabled}
      icon={Users}
    />
  );
}
