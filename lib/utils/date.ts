import { format, formatDistanceToNow, differenceInDays } from 'date-fns';

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'dd MMM yyyy');
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'dd MMM yyyy HH:mm');
}

export function daysUntil(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date;
  return differenceInDays(d, new Date());
}

export function isExpired(date: Date | string): boolean {
  return daysUntil(date) < 0;
}

export function isExpiringSoon(date: Date | string, days = 30): boolean {
  const remaining = daysUntil(date);
  return remaining >= 0 && remaining <= days;
}

export function formatRelative(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export type WarrantyStatus =
  | 'Expired'
  | 'Expires Today'
  | 'Expires This Week'
  | 'Expires Next Week'
  | 'Expires This Month'
  | 'Expires Next Month'
  | 'Active';

export function getWarrantyStatus(endDate: Date | string): WarrantyStatus {
  const days = daysUntil(endDate);
  if (days < 0)   return 'Expired';
  if (days === 0) return 'Expires Today';
  if (days <= 6)  return 'Expires This Week';
  if (days <= 13) return 'Expires Next Week';
  if (days <= 30) return 'Expires This Month';
  if (days <= 60) return 'Expires Next Month';
  return 'Active';
}
