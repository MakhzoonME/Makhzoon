import { Badge } from '@/components/ui/badge';

type Status = 'Active' | 'Retired' | 'PENDING' | 'Pending' | 'APPROVED' | 'Approved' | 'REJECTED' | 'Rejected' | 'ACTIVE' | 'EXPIRED' | 'Expired' | 'Expiring Soon' | 'SUSPENDED' | 'Suspended' | string;

const statusConfig: Record<string, { variant: 'default' | 'green' | 'yellow' | 'red' | 'blue' | 'orange'; label: string }> = {
  Active: { variant: 'green', label: 'Active' },
  ACTIVE: { variant: 'green', label: 'Active' },
  active: { variant: 'green', label: 'Active' },
  Retired: { variant: 'default', label: 'Retired' },
  retired: { variant: 'default', label: 'Retired' },
  PENDING: { variant: 'yellow', label: 'Pending' },
  Pending: { variant: 'yellow', label: 'Pending' },
  APPROVED: { variant: 'green', label: 'Approved' },
  Approved: { variant: 'green', label: 'Approved' },
  REJECTED: { variant: 'red', label: 'Rejected' },
  Rejected: { variant: 'red', label: 'Rejected' },
  EXPIRED: { variant: 'red', label: 'Expired' },
  Expired: { variant: 'red', label: 'Expired' },
  'Expiring Soon': { variant: 'yellow', label: 'Expiring Soon' },
  SUSPENDED: { variant: 'orange', label: 'Suspended' },
  Suspended: { variant: 'orange', label: 'Suspended' },
  deactivated: { variant: 'red', label: 'Deactivated' },
};

export function StatusBadge({ status }: { status: Status }) {
  const config = statusConfig[status] ?? { variant: 'default' as const, label: status };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
