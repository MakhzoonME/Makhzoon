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
