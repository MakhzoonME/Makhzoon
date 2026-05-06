import { Badge } from '@/components/ui/badge';

type BadgeVariant =
  | 'default' | 'green' | 'yellow' | 'red' | 'blue' | 'orange'
  | 'active' | 'retired' | 'pending' | 'approved' | 'rejected'
  | 'expired' | 'expiring' | 'valid' | 'admin' | 'staff' | 'superadmin' | 'info';

const statusConfig: Record<string, { variant: BadgeVariant; label: string }> = {
  /* Asset statuses */
  Active:  { variant: 'active',   label: 'Active' },
  ACTIVE:  { variant: 'active',   label: 'Active' },
  active:  { variant: 'active',   label: 'Active' },
  Retired: { variant: 'retired',  label: 'Retired' },
  retired: { variant: 'retired',  label: 'Retired' },
  /* Request statuses */
  PENDING:  { variant: 'pending',  label: 'Pending' },
  Pending:  { variant: 'pending',  label: 'Pending' },
  APPROVED: { variant: 'approved', label: 'Approved' },
  Approved: { variant: 'approved', label: 'Approved' },
  REJECTED: { variant: 'rejected', label: 'Rejected' },
  Rejected: { variant: 'rejected', label: 'Rejected' },
  /* Warranty statuses */
  EXPIRED:              { variant: 'expired',  label: 'Expired' },
  Expired:              { variant: 'expired',  label: 'Expired' },
  'Expiring Soon':      { variant: 'expiring', label: 'Expiring Soon' },
  'Expires Today':      { variant: 'expired',  label: 'Expires Today' },
  'Expires This Week':  { variant: 'expiring', label: 'Expires This Week' },
  'Expires Next Week':  { variant: 'expiring', label: 'Expires Next Week' },
  'Expires This Month': { variant: 'expiring', label: 'Expires This Month' },
  'Expires Next Month': { variant: 'info',     label: 'Expires Next Month' },
  Valid:                { variant: 'valid',    label: 'Valid' },
  /* Subscription / org */
  SUSPENDED:   { variant: 'orange', label: 'Suspended' },
  Suspended:   { variant: 'orange', label: 'Suspended' },
  deactivated: { variant: 'red',    label: 'Deactivated' },
  /* Support ticket statuses */
  OPEN:        { variant: 'info',    label: 'Open' },
  IN_PROGRESS: { variant: 'pending', label: 'In Progress' },
  RESOLVED:    { variant: 'approved', label: 'Resolved' },
  CLOSED:      { variant: 'default', label: 'Closed' },
  /* Ticket priorities */
  LOW:    { variant: 'default', label: 'Low' },
  MEDIUM: { variant: 'info',   label: 'Medium' },
  HIGH:   { variant: 'orange', label: 'High' },
  URGENT: { variant: 'red',    label: 'Urgent' },
};

export function StatusBadge({ status, dot = true }: { status: string; dot?: boolean }) {
  const config = statusConfig[status] ?? { variant: 'default' as BadgeVariant, label: status };
  return <Badge variant={config.variant} dot={dot}>{config.label}</Badge>;
}
