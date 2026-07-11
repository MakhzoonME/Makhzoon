'use client';

import { formatDistanceToNow } from 'date-fns';
import type { NotificationRow } from '@/lib/notifications/types';

const MODULE_COLORS: Record<string, string> = {
  orders:    '#6366f1',
  pos:       '#C2185B',
  inventory: '#E65100',
  requests:  '#f59e0b',
  users:     '#22c55e',
  warranty:  '#00695C',
  system:    '#9ca3af',
}

function getModuleColor(eventType: string): string {
  const moduleKey = eventType.split('.')[0]
  return MODULE_COLORS[moduleKey] ?? '#9ca3af'
}

interface Props {
  notification: NotificationRow
  onClick?: () => void
}

export function NotificationItem({ notification, onClick }: Props) {
  const color = getModuleColor(notification.eventType)
  const timeAgo = formatDistanceToNow(
    notification.createdAt instanceof Date ? notification.createdAt : new Date(notification.createdAt),
    { addSuffix: true },
  )

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-surface-page transition-colors"
    >
      {/* Module color dot */}
      <div className="flex-shrink-0 mt-1">
        <div
          className="h-2 w-2 rounded-full"
          style={{ background: notification.isRead ? '#d1d5db' : color }}
        />
      </div>

      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center justify-between gap-2">
          <p className={`text-sm truncate ${notification.isRead ? 'text-gray-500 font-normal' : 'text-gray-900 font-medium'}`}>
            {notification.title}
          </p>
          {!notification.isRead && (
            <div className="h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" />
          )}
        </div>
        {notification.body && (
          <p className="text-xs text-gray-400 truncate">{notification.body}</p>
        )}
        <p className="text-[10px] text-gray-300">{timeAgo}</p>
      </div>
    </button>
  )
}
