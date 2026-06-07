'use client';

import { useList } from '@/hooks/lists/useList';
import type { ServiceJobStatus } from '@/types';

const FALLBACK_COLORS: Record<ServiceJobStatus, string> = {
  new:         '#3b82f6',
  confirmed:   '#6366f1',
  in_progress: '#f97316',
  done:        '#22c55e',
  cancelled:   '#ef4444',
};

interface Props {
  status: ServiceJobStatus | string;
}

export function ServiceJobStatusBadge({ status }: Props) {
  const { data: items } = useList('service_job_status');

  const item  = items?.find((i) => i.value === status);
  const label = item?.label ?? status;
  const color = item?.color ?? FALLBACK_COLORS[status as ServiceJobStatus] ?? '#9ca3af';

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
