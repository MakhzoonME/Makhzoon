'use client';

import type { ReceptionTicketStatus } from '@/types';

const STATUS_COLORS: Record<ReceptionTicketStatus, string> = {
  open:      '#3b82f6',
  paid:      '#22c55e',
  cancelled: '#ef4444',
};

export function TicketStatusBadge({ status }: { status: ReceptionTicketStatus }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize"
      style={{ color: STATUS_COLORS[status], background: `${STATUS_COLORS[status]}1a` }}
    >
      {status}
    </span>
  );
}
