import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Info,
  MinusCircle,
  Shield,
  type LucideIcon,
} from 'lucide-react';

type BadgeVariant =
  | 'default' | 'green' | 'yellow' | 'red' | 'blue' | 'orange'
  | 'active' | 'retired' | 'pending' | 'approved' | 'rejected'
  | 'expired' | 'expiring' | 'valid' | 'admin' | 'staff' | 'superadmin' | 'info';

const VARIANT_ICON: Record<BadgeVariant, LucideIcon> = {
  active:     CheckCircle2,
  approved:   CheckCircle2,
  valid:      CheckCircle2,
  green:      CheckCircle2,
  pending:    Clock,
  yellow:     Clock,
  expiring:   Clock,
  rejected:   XCircle,
  expired:    XCircle,
  red:        XCircle,
  orange:     AlertTriangle,
  info:       Info,
  blue:       Info,
  admin:      Shield,
  superadmin: Shield,
  retired:    MinusCircle,
  staff:      MinusCircle,
  default:    MinusCircle,
};

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

interface StatusBadgeProps {
  status: string;
  /** Show a leading dot/icon (default: true). Set false for a label-only badge. */
  dot?: boolean;
  /** Visual style of the marker: 'icon' (default) shows a semantic shape, 'dot' shows a circle. */
  marker?: 'icon' | 'dot';
}

export function StatusBadge({ status, dot = true, marker = 'icon' }: StatusBadgeProps) {
  const config = statusConfig[status] ?? { variant: 'default' as BadgeVariant, label: status };
  const Icon = marker === 'icon' ? VARIANT_ICON[config.variant] : undefined;
  return (
    <Badge variant={config.variant} dot={dot && !Icon} role="status" aria-label={`Status: ${config.label}`}>
      {Icon && dot && <Icon className="h-3 w-3 flex-shrink-0" strokeWidth={2} aria-hidden />}
      {config.label}
    </Badge>
  );
}
