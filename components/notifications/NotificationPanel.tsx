'use client';

import { useRouter, useParams } from 'next/navigation';
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationItem } from './NotificationItem';
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
} from '@/hooks/notifications';

interface Props {
  onClose: () => void;
}

export function NotificationPanel({ onClose }: Props) {
  const router = useRouter();
  const { locale, orgSlug } = useParams<{ locale?: string; orgSlug?: string }>();
  const { data, isLoading } = useNotifications({ pageSize: 20 });
  const markReadMut    = useMarkAsRead();
  const markAllMut     = useMarkAllAsRead();

  const items = data?.items ?? [];
  const hasUnread = items.some((n) => !n.isRead);

  function handleItemClick(notification: { id: string; link: string | null; isRead: boolean }) {
    if (!notification.isRead) {
      markReadMut.mutate(notification.id);
    }
    if (notification.link) {
      router.push(`/${locale}/${orgSlug}${notification.link}`);
    }
    onClose();
  }

  function handleViewAll() {
    router.push(`/${locale}/${orgSlug}/notifications`);
    onClose();
  }

  return (
    <div
      className="absolute end-0 top-full mt-2 w-80 rounded-xl border border-border bg-surface-card shadow-lg z-50 overflow-hidden"
      style={{ maxHeight: 480 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-semibold text-gray-800">Notifications</span>
        {hasUnread && (
          <button
            onClick={() => markAllMut.mutate()}
            disabled={markAllMut.isPending}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors"
          >
            <CheckCheck size={12} />
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div className="overflow-y-auto" style={{ maxHeight: 360 }}>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-5 w-5 rounded-full border-2 border-gray-300 border-t-transparent animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400">
            <Bell size={24} strokeWidth={1.5} />
            <p className="text-xs">No notifications yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onClick={() => handleItemClick(n)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border px-4 py-2.5">
        <button
          onClick={handleViewAll}
          className="text-xs text-primary-600 hover:underline font-medium"
        >
          View all notifications →
        </button>
      </div>
    </div>
  );
}
