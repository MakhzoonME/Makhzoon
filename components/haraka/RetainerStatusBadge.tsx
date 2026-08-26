'use client';

import type { RetainerStatus } from '@/types';

const COLORS: Record<RetainerStatus, string> = {
  active:    '#22c55e',
  paused:    '#eab308',
  cancelled: '#ef4444',
  expired:   '#6b7280',
};

interface Props {
  status: RetainerStatus | string;
}

export function RetainerStatusBadge({ status }: Props) {
  const color = COLORS[status as RetainerStatus] ?? '#9ca3af';
  const label = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${color}18`, color, border: `1px solid ${color}30` }}
      role="status"
    >
      <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} aria-hidden />
      {label}
    </span>
  );
}
