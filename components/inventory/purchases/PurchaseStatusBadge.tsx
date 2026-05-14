'use client';

import { StatusBadge } from '@/components/shared';
import type { PurchaseStatus } from '@/types';

export function PurchaseStatusBadge({ status }: { status: PurchaseStatus }) {
  return <StatusBadge status={status} />;
}
