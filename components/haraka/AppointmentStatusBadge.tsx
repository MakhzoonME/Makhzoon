'use client';

import { useList } from '@/hooks/lists/useList';
import type { AppointmentStatus } from '@/types';

// Used until the org's `appointment_status` list resolves (or for a value the
// list no longer carries) — same shape as ServiceJobStatusBadge.
const FALLBACK_COLORS: Record<AppointmentStatus, string> = {
  scheduled: '#3b82f6',
  confirmed: '#6366f1',
  completed: '#22c55e',
  cancelled: '#ef4444',
  no_show:   '#f97316',
};

interface Props {
  status: AppointmentStatus | string;
}

export function AppointmentStatusBadge({ status }: Props) {
  const { data: items } = useList('appointment_status');

  const item = items?.find((i) => i.value === status);
  const label = item?.label ?? String(status).replace(/_/g, ' ');
  const color = item?.color ?? FALLBACK_COLORS[status as AppointmentStatus] ?? '#9ca3af';

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: `${color}18`,
        color,
        border: `1px solid ${color}30`,
      }}
      role="status"
      aria-label={`Status: ${label}`}
    >
      <span
        className="h-1.5 w-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      {label}
    </span>
  );
}
